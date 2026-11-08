//! llama.cpp motoru: model yükleme, sohbet şablonu, akışlı üretim, kooperatif iptal.
//!
//! Model ve bağlam aynı yapıda yaşar. Bağlam (`LlamaContext`) modeli ödünç aldığı için
//! Rust'in ödünç alma kuralları bunu olduğu gibi ifade etmeye izmez; `new_context` sonucunu
//! `'static` ömrüne sabitliyoruz. Bu güvenlidir çünkü:
//! - alan sırası `model` -> `context`: Rust alanları ters sırada düşürür, yani bağlam her
//!   zaman modelden ÖNCE düşer (model bir nesne taşınca/yaşamı bitmeden erişim yoktur),
//! - `drop()` yöntemi bağlamı modelden önce boşaltır.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::context::LlamaContext;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{LlamaChatMessage, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;

use crate::model;
use crate::protocol::{self, AiProgress, Event, Message};

pub type Canceller = Arc<AtomicBool>;

pub struct Engine {
    /// Alan sırası önemli: `context` en son eleman olmalı (önce düşürülür).
    backend: Option<LlamaBackend>,
    model: Option<LlamaModel>,
    context: Option<LlamaContext<'static>>,
    model_id: Option<String>,
    model_path: Option<PathBuf>,
    threads: i32,
    ctx_size: u32,
    cancel: Canceller,
}

/// Bir `generate` çağrısının sonucu.
pub struct Generation {
    pub text: String,
    pub tokens_per_second: f64,
    pub prompt_tokens: u32,
    pub generated_tokens: u32,
    pub cancelled: bool,
}

impl Engine {
    pub fn new(cancel: Canceller) -> Self {
        Self {
            backend: None,
            model: None,
            context: None,
            model_id: None,
            model_path: None,
            threads: protocol::default_threads(),
            ctx_size: 4096,
            cancel,
        }
    }

    pub fn loaded_model(&self) -> Option<&str> {
        self.model_id.as_deref()
    }

    pub fn model_path(&self) -> Option<&Path> {
        self.model_path.as_deref()
    }

    pub fn threads(&self) -> i32 {
        self.threads
    }

    pub fn ctx_size(&self) -> u32 {
        self.ctx_size
    }

    /// Kooperatif iptal bayrağını set eder (bir sonraki token kontrolünde durur).
    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::SeqCst);
    }

    /// Modeli (gerekirse) indirir ve belleğe alır; ilerleme olaylarını `emit` ile yayınlar.
    pub fn load(
        &mut self,
        model_id: &str,
        dir: &Path,
        threads: Option<i32>,
        ctx: Option<u32>,
        emit: &mut dyn FnMut(Event),
    ) -> Result<(), String> {
        let spec = model::spec_of(model_id).ok_or_else(|| format!("Bilinmeyen model: {model_id}"))?;
        let path = model::model_path(dir, model_id).ok_or_else(|| "Model yolu çözülemedi".to_string())?;

        if !model::is_downloaded(&path, model_id) {
            emit(Event::Download {
                id: model_id.to_string(),
                progress: AiProgress {
                    phase: "downloading".to_string(),
                    loaded: 0,
                    total: spec.size_bytes,
                    percent: 0,
                    model_id: model_id.to_string(),
                },
            });
            let model_id_owned = model_id.to_string();
            let mut last_percent: i32 = -1;
            let mut emit_progress = |loaded: u64, total: u64, percent: u32| {
                let percent_i32 = percent as i32;
                if percent_i32 != last_percent {
                    last_percent = percent_i32;
                    emit(Event::Download {
                        id: model_id_owned.clone(),
                        progress: AiProgress {
                            phase: "downloading".to_string(),
                            loaded,
                            total,
                            percent,
                            model_id: model_id_owned.clone(),
                        },
                    });
                }
            };
            crate::download::download_model(spec, &path, &mut emit_progress)?;
        }

        emit(Event::Download {
            id: model_id.to_string(),
            progress: AiProgress {
                phase: "loading-model".to_string(),
                loaded: 0,
                total: 0,
                percent: 0,
                model_id: model_id.to_string(),
            },
        });

        let needs_init = self.backend.is_none();
        if needs_init {
            let init = LlamaBackend::init().map_err(|error| format!("llama.cpp başlatılamadı: {error}"))?;
            self.backend = Some(init);
        }
        let backend = self.backend.as_ref().unwrap();

        let model_params = LlamaModelParams::default().with_n_gpu_layers(0);
        let loaded = LlamaModel::load_from_file(backend, &path, &model_params)
            .map_err(|error| format!("Model yüklenemedi ({}): {error}", path.display()))?;

        let train_ctx = loaded.n_ctx_train();
        let ctx_size = protocol::clamp_ctx(ctx, train_ctx);
        self.threads = protocol::clamp_threads(threads);

        let context_params = LlamaContextParams::default()
            .with_n_ctx(Some(protocol::non_zero_ctx(ctx_size)))
            .with_n_batch(ctx_size)
            .with_n_threads(self.threads)
            .with_n_threads_batch(self.threads)
            .with_no_perf(false);

        self.context = None;
        self.model = None;

        let context = loaded
            .new_context(backend, context_params)
            .map_err(|error| format!("Bağlam oluşturulamadı: {error}"))?;
        let context: LlamaContext<'static> = unsafe { std::mem::transmute(context) };

        self.model = Some(loaded);
        self.context = Some(context);
        self.model_id = Some(model_id.to_string());
        self.model_path = Some(path);
        Ok(())
    }

    /// Bellekten çıkarır (disk dosyasına dokunmaz).
    pub fn unload(&mut self) {
        self.context = None;
        self.model = None;
        self.model_id = None;
        self.model_path = None;
    }

    /// Sohbet iletilerini modelin kendi şablonuyla metne dönüştürür.
    pub fn apply_chat(model: &LlamaModel, messages: &[Message]) -> Result<String, String> {
        let template = model
            .chat_template(None)
            .map_err(|error| format!("Sohbet şablonu okunamadı: {error}"))?;
        let chat: Vec<LlamaChatMessage> = messages
            .iter()
            .map(|message| LlamaChatMessage::new(message.role.clone(), message.content.clone()))
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("Sohbet iletisi hazırlanamadı: {error}"))?;
        model
            .apply_chat_template(&template, &chat, true)
            .map_err(|error| format!("Sohbet şablonu uygulanamadı: {error}"))
    }

    /// Ham prompt'u üretir; her token'da kümülatif metin yayınlanır.
    pub fn generate(
        &mut self,
        prompt: &str,
        max_tokens: u32,
        temperature: f32,
        seed: u32,
        id: &str,
        emit: &mut dyn FnMut(Event),
    ) -> Result<Generation, String> {
        let model = self.model.as_ref().ok_or_else(|| "Model yüklü değil".to_string())?;
        let context = self.context.as_mut().ok_or_else(|| "Bağlam yok".to_string())?;

        let vocab = model.vocab();
        let tokens = vocab.tokenize(prompt.as_bytes(), true, true);
        if tokens.is_empty() {
            return Err("Prompt boş".to_string());
        }
        if tokens.len() as u32 > self.ctx_size {
            return Err(format!(
                "Bağlam doldu: {} token > {} — daha kısa bir istek deneyin",
                tokens.len(),
                self.ctx_size
            ));
        }

        self.cancel.store(false, Ordering::SeqCst);
        context.clear_kv_cache();
        context.reset_timings();

        let prompt_tokens = u32::try_from(tokens.len()).unwrap_or(u32::MAX);
        let mut batch = LlamaBatch::get_one(&tokens).map_err(|error| format!("Batch hatası: {error}"))?;
        context
            .decode(&mut batch)
            .map_err(|error| format!("Prompt işlenemedi: {error}"))?;

        let mut sampler = if temperature > 0.0 {
            LlamaSampler::chain(
                [
                    LlamaSampler::top_p(0.9, 1),
                    LlamaSampler::temp(temperature),
                    LlamaSampler::dist(seed),
                ],
                false,
            )
        } else {
            LlamaSampler::greedy()
        };

        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut text = String::new();
        let mut generated: u32 = 0;
        let mut n_cur = prompt_tokens;
        let mut cancelled = false;

        while generated < max_tokens {
            if self.cancel.load(Ordering::SeqCst) {
                cancelled = true;
                break;
            }
            if n_cur >= self.ctx_size {
                break;
            }

            let token = sampler.sample(context, -1);
            if vocab.is_eog(token) {
                break;
            }
            sampler.accept(token);

            let piece = vocab.token_to_piece(token, false, None);
            let mut piece_text = String::new();
            piece_text.reserve(decoder.max_utf8_buffer_length_without_replacement(piece.len()).unwrap_or(piece.len() + 4));
            let (_res, _read) = decoder.decode_to_string_without_replacement(&piece, &mut piece_text, false);
            if !piece_text.is_empty() {
                text.push_str(&piece_text);
                emit(Event::Token {
                    id: id.to_string(),
                    text: text.clone(),
                });
            }
            generated += 1;

            let token_slice = [token];
            let mut next = LlamaBatch::get_one(&token_slice).map_err(|error| format!("Batch hatası: {error}"))?;
            context
                .decode(&mut next)
                .map_err(|error| format!("Üretim sırasında hata: {error}"))?;
            n_cur += 1;
        }

        let timings = context.timings();
        let tokens_per_second = if timings.t_eval_ms() > 0.0 {
            f64::from(timings.n_eval()) / (timings.t_eval_ms() / 1000.0)
        } else {
            0.0
        };

        Ok(Generation {
            text,
            tokens_per_second,
            prompt_tokens,
            generated_tokens: generated,
            cancelled,
        })
    }

    /// Benchmark üretimi (stdout'a olay yazmaz).
    pub fn bench(
        &mut self,
        prompt: &str,
        max_tokens: u32,
        temperature: f32,
        seed: u32,
    ) -> Result<String, String> {
        let mut sink = |_event: Event| {};
        let generation = self.generate(prompt, max_tokens, temperature, seed, "bench", &mut sink)?;
        let per_second = (generation.tokens_per_second * 10.0).round() / 10.0;
        Ok(format!(
            "{per_second} tok/s (üretilen {} / prompt {}, iptal {})",
            generation.generated_tokens, generation.prompt_tokens, generation.cancelled
        ))
    }
}

/// Model şablonu kullanılamadığında ChatML düzeninde prompt üretir.
pub fn prompt_from_messages(messages: &[Message]) -> String {
    let mut prompt = String::new();
    for message in messages {
        prompt.push_str("<|fim_prefix|>");
        prompt.push_str(&message.role);
        prompt.push('\n');
        prompt.push_str(&message.content);
        prompt.push_str("<|fim_suffix|>");
        prompt.push('\n');
    }
    prompt.push_str("<|fim_prefix|>assistant\n");
    prompt
}
