//! Model kayıt defteri ve dosya yolları.
//!
//! Model kimlikleri uygulamanın mevcut `ModelId` değerleriyle **birebir** aynıdır
//! (arayüz/hafıza formatı değişmesin diye); GGUF dosyasına eşleme burada yapılır.

use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ModelSpec {
    /// Uygulamadaki kimlik (ModelId).
    pub id: &'static str,
    /// Hugging Face GGUF deposu.
    pub repo: &'static str,
    /// Dosya adı.
    pub file: &'static str,
    /// Tahmini indirme boyutu (bayt) — ilerleme çubuğu için.
    pub size_bytes: u64,
}

/// Desteklenen yerleşik modeller (sıralama = varsayılan seçim sırası).
pub const MODELS: &[ModelSpec] = &[
    ModelSpec {
        id: "Qwen/Qwen2.5-0.5B-Instruct",
        repo: "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        file: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
        size_bytes: 398_000_000,
    },
    ModelSpec {
        id: "Qwen/Qwen2.5-1.5B-Instruct",
        repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        file: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        size_bytes: 1_056_000_000,
    },
];

pub fn spec_of(id: &str) -> Option<&'static ModelSpec> {
    MODELS.iter().find(|spec| spec.id == id)
}

/// Kullanıcı veri dizini altındaki model klasörü; testler için üzerine yazılabilir.
pub fn default_model_dir() -> PathBuf {
    match std::env::var_os("FILE_AI_MODEL_DIR") {
        Some(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => match dirs_like_user_data() {
            Some(base) => base,
            None => std::env::temp_dir().join("file-models"),
        },
    }
}

/// Electron `app.getPath('userData')` karşılığı. Ana süreç buna zorunlu olarak
/// `set-model-dir` ile kendi yolunu bildirir; olmadığında makul bir varsayılan.
fn dirs_like_user_data() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("FILE_AI_MODEL_DIR") {
        if !dir.is_empty() {
            return Some(PathBuf::from(dir));
        }
    }
    let home = std::env::var_os("HOME")?;
    let mut path = PathBuf::from(home);
    path.push(".config");
    path.push("FILE");
    path.push("models");
    Some(path)
}

pub fn model_path(dir: &Path, id: &str) -> Option<PathBuf> {
    let spec = spec_of(id)?;
    let safe_name = safe_component(spec.file);
    Some(dir.join(safe_name))
}

pub fn model_file_name(id: &str) -> Option<&'static str> {
    spec_of(id).map(|spec| safe_component(spec.file))
}

/// Dosya adını en basit bileşen indirir: yol ayrıştırma saldırılarını engeller.
fn safe_component(name: &'static str) -> &'static str {
    match name.rsplit(['/', '\\']).next() {
        Some(last) => last,
        None => name,
    }
}

/// Model dosyası var mı ve boyu makul mu? (kısmi indirmeyi reddeder)
pub fn is_downloaded(path: &Path, id: &str) -> bool {
    let spec = match spec_of(id) {
        Some(spec) => spec,
        None => return false,
    };
    match std::fs::metadata(path) {
        Ok(meta) => meta.is_file() && meta.len() >= spec.size_bytes,
        Err(_) => false,
    }
}

pub fn partial_len(path: &Path) -> u64 {
    std::fs::metadata(path).map_or(0, |meta| meta.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bilinen_model_bulunur() {
        assert!(spec_of("Qwen/Qwen2.5-0.5B-Instruct").is_some());
        assert!(spec_of("Qwen/Qwen2.5-1.5B-Instruct").is_some());
        assert!(spec_of("olmayan/model").is_none());
    }

    #[test]
    fn dosya_adi_yol_degil() {
        assert_eq!(
            model_file_name("Qwen/Qwen2.5-0.5B-Instruct"),
            Some("qwen2.5-0.5b-instruct-q4_k_m.gguf")
        );
    }

    #[test]
    fn kismi_indirme_tamamlanmis_sayilmaz() {
        let dir = std::env::temp_dir().join(format!("file-ai-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = model_path(&dir, "Qwen/Qwen2.5-0.5B-Instruct").unwrap();
        std::fs::write(&path, vec![0u8; 16]).unwrap();
        assert!(!is_downloaded(&path, "Qwen/Qwen2.5-0.5B-Instruct"));
        std::fs::write(&path, vec![0u8; 398_000_000]).unwrap();
        assert!(is_downloaded(&path, "Qwen/Qwen2.5-0.5B-Instruct"));
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
