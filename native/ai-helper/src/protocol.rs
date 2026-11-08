//! stdio üzerinden konuşulan JSONL protokolü.
//!
//! Tüm istekler tek satır JSON, tüm olaylar tek satır JSON'dur.
//! `stderr` yalnızca insan okunabilir loglar içindir; `stdout` **sadece** protokol
//! satırları taşır (Electron tarafı bunu ayrıştırır).
//!
//! Olay şekli, renderer'daki `AIWorkerEvent` ile birebir aynıdır (kind ayrıştırıcı).

use std::num::NonZeroU32;

pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub id: String,
    pub op: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub prompt: Option<String>,
    #[serde(default)]
    pub messages: Option<Vec<Message>>,
    #[serde(default)]
    pub max_tokens: Option<u32>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub seed: Option<u32>,
    #[serde(default)]
    pub threads: Option<i32>,
    #[serde(default)]
    pub ctx: Option<u32>,
    #[serde(default)]
    pub dir: Option<String>,
    #[serde(default)]
    pub download: Option<bool>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProgress {
    pub phase: String,
    pub loaded: u64,
    pub total: u64,
    pub percent: u32,
    pub model_id: String,
}

/// Renderer'daki `AIWorkerEvent` ile birebir aynı şekil (kind ayrıştırıcı).
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Event {
    Ready { id: String, model_id: String },
    Download { id: String, progress: AiProgress },
    Computing { id: String },
    Token { id: String, text: String },
    Done {
        id: String,
        text: String,
        tokens_per_second: f64,
        prompt_tokens: u32,
        generated_tokens: u32,
    },
    Error { id: String, message: String },
    Status {
        id: String,
        state: String,
        model: Option<String>,
        model_path: Option<String>,
        threads: i32,
        ctx: u32,
        message: String,
    },
    Hello { version: u32, binary: String },
}

impl Event {
    pub fn to_line(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            "{\"kind\":\"error\",\"id\":\"\",\"message\":\"olay serileştirilemedi\"}".to_string()
        })
    }
}

// ---------- yardımcılar ----------

pub const MIN_THREADS: i32 = 1;
pub const MAX_THREADS: i32 = 16;
pub const MIN_CTX: u32 = 512;
pub const MAX_CTX: u32 = 32768;

pub fn clamp_threads(value: Option<i32>) -> i32 {
    let fallback = default_threads();
    match value {
        Some(t) if (MIN_THREADS..=MAX_THREADS).contains(&t) => t,
        _ => fallback,
    }
}

pub fn clamp_ctx(value: Option<u32>, model_limit: u32) -> u32 {
    let requested = match value {
        Some(c) if (MIN_CTX..=MAX_CTX).contains(&c) => c,
        _ => 4096,
    };
    let limit = if model_limit == 0 { MAX_CTX } else { model_limit.max(MIN_CTX) };
    requested.min(limit)
}

pub fn default_threads() -> i32 {
    let cpus = std::thread::available_parallelism().map_or(1, std::num::NonZeroUsize::get);
    i32::try_from(cpus.saturating_sub(1)).unwrap_or(1).max(1)
}

pub fn non_zero_ctx(ctx: u32) -> NonZeroU32 {
    NonZeroU32::new(ctx.max(MIN_CTX)).unwrap_or_else(|| NonZeroU32::new(MIN_CTX).unwrap_or(NonZeroU32::MIN))
}
