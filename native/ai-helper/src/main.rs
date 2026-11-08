//! `ai-helper` — FILE yerel yapay zekâ katmanı.
//!
//! İki mod:
//!   - `--serve` : stdio üzerinden JSONL protokolü (Electron main süreci tarafından kullanılır)
//!   - `bench`   : tek seferlik benchmark (tok/s)
//!
//! `stderr` insan okunabilir loglar; `stdout` sadece protokol/bench çıktısı.

mod download;
mod engine;
mod model;
mod protocol;

use std::io::{self, BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::mpsc;
use std::thread;

use engine::Engine;
use protocol::{Event, Request};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("ai-helper {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--help" || a == "-h") {
        print_help();
        return;
    }
    if args.get(1).map(|s| s.as_str()) == Some("bench") {
        if let Err(error) = run_bench(&args[2..]) {
            eprintln!("bench hatası: {error}");
            std::process::exit(1);
        }
        return;
    }
    if args.iter().any(|a| a == "--serve") {
        run_serve();
        return;
    }

    print_help();
}

fn print_help() {
    println!(
        "ai-helper {version}\n\
         \n\
         Kullanım:\n\
         \tai-helper --serve                  stdio JSONL kipi (Electron tarafından kullanılır)\n\
         \tai-helper bench --model ID_OR_PATH --model-dir DIR --tokens N [--prompt STR] [--threads N] [--ctx N]\n\
         \tai-helper --version | --help\n",
        version = env!("CARGO_PKG_VERSION")
    );
}

// ---------- serve kipi ----------

fn run_serve() {
    println!(
        "{}",
        Event::Hello {
            version: protocol::PROTOCOL_VERSION,
            binary: env!("CARGO_PKG_VERSION").to_string(),
        }
        .to_line()
    );
    let _ = io::stdout().flush();

    let (cmd_tx, cmd_rx) = mpsc::channel::<String>();
    let (event_tx, event_rx) = mpsc::channel::<Event>();

    thread::spawn(move || {
        let mut stdout = io::stdout().lock();
        while let Ok(event) = event_rx.recv() {
            let line = event.to_line();
            let _ = writeln!(stdout, "{line}");
            let _ = stdout.flush();
        }
    });

    thread::spawn(move || {
        let cancel = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let mut engine = Engine::new(cancel.clone());
        let mut model_dir: Option<PathBuf> = None;
        while let Ok(line) = cmd_rx.recv() {
            let line = line.trim().to_string();
            if line.is_empty() {
                continue;
            }
            let request: Request = match serde_json::from_str(&line) {
                Ok(request) => request,
                Err(error) => {
                    let _ = event_tx.send(Event::Error {
                        id: String::new(),
                        message: format!("Geçersiz istek: {error}"),
                    });
                    continue;
                }
            };
            let id = request.id.clone();
            let op = request.op.clone();
            let mut emit = |event: Event| {
                let _ = event_tx.send(event);
            };
            match op.as_str() {
                "set-model-dir" => {
                    if let Some(dir) = request.dir {
                        model_dir = Some(PathBuf::from(dir));
                    }
                    let _ = emit(Event::Status {
                        id: id.clone(),
                        state: "ok".to_string(),
                        model: engine.loaded_model().map(|s| s.to_string()),
                        model_path: engine.model_path().map(|p| p.display().to_string()),
                        threads: engine.threads(),
                        ctx: engine.ctx_size(),
                        message: "model dizini güncellendi".to_string(),
                    });
                }
                "status" => {
                    let state = if engine.loaded_model().is_some() {
                        "ready"
                    } else {
                        "idle"
                    };
                    let _ = emit(Event::Status {
                        id: id.clone(),
                        state: state.to_string(),
                        model: engine.loaded_model().map(|s| s.to_string()),
                        model_path: engine.model_path().map(|p| p.display().to_string()),
                        threads: engine.threads(),
                        ctx: engine.ctx_size(),
                        message: String::new(),
                    });
                }
                "load" => {
                    let model_id = request.model.unwrap_or_default();
                    if model_id.is_empty() {
                        let _ = emit(Event::Error {
                            id: id.clone(),
                            message: "model kimliği eksik".to_string(),
                        });
                        continue;
                    }
                    let dir = model_dir.clone().unwrap_or_else(model::default_model_dir);
                    let download = request.download.unwrap_or(true);
                    if !download
                        && !model::is_downloaded(
                            &model::model_path(&dir, &model_id).unwrap_or_default(),
                            &model_id,
                        )
                    {
                        let _ = emit(Event::Error {
                            id: id.clone(),
                            message: "model dosyası bulunamadı".to_string(),
                        });
                        continue;
                    }
                    let _ = emit(Event::Status {
                        id: id.clone(),
                        state: "loading".to_string(),
                        model: Some(model_id.clone()),
                        model_path: None,
                        threads: protocol::clamp_threads(request.threads),
                        ctx: protocol::clamp_ctx(request.ctx, 0),
                        message: "model yükleniyor".to_string(),
                    });
                    match engine.load(&model_id, &dir, request.threads, request.ctx, &mut emit) {
                        Ok(()) => {
                            let _ = emit(Event::Status {
                                id: id.clone(),
                                state: "ready".to_string(),
                                model: engine.loaded_model().map(|s| s.to_string()),
                                model_path: engine.model_path().map(|p| p.display().to_string()),
                                threads: engine.threads(),
                                ctx: engine.ctx_size(),
                                message: "hazır".to_string(),
                            });
                        }
                        Err(error) => {
                            let _ = emit(Event::Error {
                                id: id.clone(),
                                message: error,
                            });
                        }
                    }
                }
                "generate" => {
                    let prompt = request.prompt.clone().unwrap_or_default();
                    if prompt.is_empty() {
                        let _ = emit(Event::Error {
                            id: id.clone(),
                            message: "prompt boş".to_string(),
                        });
                        continue;
                    }
                    let max_tokens = request.max_tokens.unwrap_or(512);
                    let temperature = request.temperature.unwrap_or(0.7);
                    let seed = request.seed.unwrap_or(42);
                    match engine.generate(&prompt, max_tokens, temperature, seed, &id, &mut emit) {
                        Ok(generation) => {
                            let _ = emit(Event::Done {
                                id: id.clone(),
                                text: generation.text,
                                tokens_per_second: generation.tokens_per_second,
                                prompt_tokens: generation.prompt_tokens,
                                generated_tokens: generation.generated_tokens,
                            });
                        }
                        Err(error) => {
                            let _ = emit(Event::Error {
                                id: id.clone(),
                                message: error,
                            });
                        }
                    }
                }
                "cancel" => {
                    engine.cancel();
                }
                "unload" => {
                    engine.unload();
                    let _ = emit(Event::Status {
                        id: id.clone(),
                        state: "idle".to_string(),
                        model: None,
                        model_path: None,
                        threads: engine.threads(),
                        ctx: engine.ctx_size(),
                        message: "model bellekten çıkarıldı".to_string(),
                    });
                }
                "shutdown" => {
                    engine.unload();
                    return;
                }
                other => {
                    let _ = emit(Event::Error {
                        id: id.clone(),
                        message: format!("bilinmeyen op: {other}"),
                    });
                }
            }
        }
    });

    let stdin = io::stdin();
    let reader = BufReader::new(stdin);
    for line in reader.lines() {
        match line {
            Ok(line) => {
                if cmd_tx.send(line).is_err() {
                    break;
                }
            }
            Err(_) => break,
        }
    }
    let _ = cmd_tx.send("{\"id\":\"\",\"op\":\"shutdown\"}".to_string());
    thread::sleep(std::time::Duration::from_millis(200));
}

// ---------- bench ----------

fn run_bench(args: &[String]) -> Result<(), String> {
    let mut model_id: Option<String> = None;
    let mut model_dir: Option<PathBuf> = None;
    let mut tokens: u32 = 128;
    let mut prompt: String = "Merhaba, kendini kısaca tanıt.".to_string();
    let mut threads: Option<i32> = None;
    let mut ctx: Option<u32> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--model" => {
                i += 1;
                if i < args.len() {
                    model_id = Some(args[i].clone());
                }
            }
            "--model-dir" => {
                i += 1;
                if i < args.len() {
                    model_dir = Some(PathBuf::from(&args[i]));
                }
            }
            "--tokens" => {
                i += 1;
                if i < args.len() {
                    tokens = args[i].parse().unwrap_or(tokens);
                }
            }
            "--prompt" => {
                i += 1;
                if i < args.len() {
                    prompt = args[i].clone();
                }
            }
            "--threads" => {
                i += 1;
                if i < args.len() {
                    threads = args[i].parse().ok();
                }
            }
            "--ctx" => {
                i += 1;
                if i < args.len() {
                    ctx = args[i].parse().ok();
                }
            }
            _ => {}
        }
        i += 1;
    }

    let dir = model_dir.unwrap_or_else(model::default_model_dir);
    let id = model_id.unwrap_or_else(|| "Qwen/Qwen2.5-0.5B-Instruct".to_string());
    let cancel = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let mut engine = Engine::new(cancel);
    if let Err(error) = engine.load(&id, &dir, threads, ctx, &mut |_| {}) {
        return Err(error);
    }
    let result = engine.bench(&prompt, tokens, 0.7, 42)?;
    println!("{result}");
    Ok(())
}
