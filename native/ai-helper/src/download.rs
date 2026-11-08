//! GGUF model indirici: kalan bayttan devam eder, ilerleme yayınlar, bozuğu reddeder.

use std::io::{Read, Write};
use std::path::Path;
use std::time::Duration;

use crate::model::ModelSpec;

const HF_RESOLVE: &str = "https://huggingface.co";
const CHUNK_TIMEOUT: Duration = Duration::from_secs(120);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(20);
const TOTAL_ATTEMPTS: u32 = 4;

/// (indirilen bayt, toplam bayt, yüzde) — mutlak değerler.
pub type ProgressFn<'a> = &'a mut dyn FnMut(u64, u64, u32);

fn client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(CHUNK_TIMEOUT)
        .connect_timeout(CONNECT_TIMEOUT)
        .build()
        .map_err(|error| format!("İstemci kurulamadı: {error}"))
}

pub fn url_for(spec: &ModelSpec) -> String {
    format!("{HF_RESOLVE}/{}/resolve/main/{}", spec.repo, spec.file)
}

/// Dosyayı indirir; zaten tamamen indirilmişse `Ok(false)` döner.
pub fn download_model(
    spec: &ModelSpec,
    path: &Path,
    on_progress: ProgressFn<'_>,
) -> Result<bool, String> {
    let client = client()?;
    let url = url_for(spec);

    for attempt in 1..=TOTAL_ATTEMPTS {
        let have = crate::model::partial_len(path);
        let mut request = client.get(&url);
        if have > 0 {
            request = request.header("Range", format!("bytes={have}-"));
        }

        let mut response = request
            .send()
            .map_err(|error| format!("Model indirilemedi ({error}) — bağlantını kontrol edip tekrar dene"))?;

        let status = response.status();
        if !status.is_success() {
            return Err(format!("Model indirilemedi: sunucu {status} döndü"));
        }

        // 206 = kısmi devam, 200 = baştan indirme
        let resumable = status.as_u16() == 206;
        let total: u64 = if resumable {
            response
                .headers()
                .get("Content-Range")
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.rsplit('/').next())
                .and_then(|value| value.trim().parse().ok())
                .unwrap_or(spec.size_bytes)
        } else {
            response.content_length().unwrap_or(spec.size_bytes)
        };

        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(resumable)
            .write(true)
            .truncate(!resumable)
            .open(path)
            .map_err(|error| format!("Model yazılamadı: {error}"))?;

        let mut received = if resumable { have } else { 0 };
        let mut buffer = vec![0u8; 256 * 1024];
        let mut failure: Option<String> = None;

        loop {
            match response.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => {
                    if let Err(error) = file.write_all(&buffer[..read]) {
                        return Err(format!("Model yazılamadı: {error}"));
                    }
                    received += read as u64;
                    let percent = if total > 0 {
                        u32::try_from(received.saturating_mul(100) / total)
                            .unwrap_or(100)
                            .min(100)
                    } else {
                        0
                    };
                    on_progress(received, total, percent);
                }
                Err(error) => {
                    failure = Some(format!("Model indirmesi kesildi: {error}"));
                    break;
                }
            }
        }

        if let Err(error) = file.flush() {
            return Err(format!("Model yazılamadı: {error}"));
        }
        drop(file);

        if failure.is_none() && total > 0 && received >= total {
            return Ok(true);
        }

        // Kısmi indirme ya da ağ hatası: turu yeniden dene (append ile sürer).
        if let Some(message) = failure {
            if attempt >= TOTAL_ATTEMPTS {
                return Err(message);
            }
        } else if attempt >= TOTAL_ATTEMPTS {
            return Err("Model indirmesi tamamlanamadı".to_string());
        }
    }

    Err("Model indirilemedi".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model;

    #[test]
    fn indirme_adresi_hf_resolve() {
        let spec = model::spec_of("Qwen/Qwen2.5-0.5B-Instruct").unwrap();
        assert_eq!(
            url_for(spec),
            "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
        );
    }
}
