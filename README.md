# Dosya Editörü

Klavye-öncelikli, masaüstünde çalışan kod editörü.

- **Arayüz:** TypeScript + React + Vite + Monaco Editor + Web Workers
- **Kabuk:** Electron (fs/dialog/telemetri işlemleri Main Process'te)
- **Görsel dil:** premium karanlık zemin, macOS tarzı cam (glassmorphism) paneller, Inter + JetBrains Mono tipografisi, tek vurgu rengi mavi; kırmızı yalnızca hata; yumuşak köşeler

## Gereksinimler

- Node.js v24 (`export PATH="$HOME/node/bin:$PATH"`)
- npm
- İlk kurulumda Electron binary'si indirilir (internet gereklidir)

### Zen Tarayıcı Gömme (isteğe bağlı)

`Görünüm → Zen'i Aç`, gerçek Zen Browser penceresini uygulama içine gömer. Bunun için:

- Linux + X11 veya XWayland (saf Wayland oturumunda XWayland gerekir)
- flatpak ve Zen: `flatpak install flathub app.zen_browser.zen`
- Python 3 + `python3-xlib` (Pacman: `python-xlib`, DNF: `python3-Xlib`, APT: `python3-xlib`)
- X11/XWayland zorlaması uygulamanın ilk çalıştırmada otomatik uyguladığı tek seferlik bir ayarla yapılır: `flatpak override --user --nosocket=wayland --socket=x11 --env=MOZ_ENABLE_WAYLAND=0 app.zen_browser.zen` (Böylece dışarıdan açılan Zen de yakalanıp uygulama içine alınır; normal Zen'in görünümü/dekorasyonu değişmez — `GTK_CSD=0` yalnızca uygulama içi örneğe verilir)

## Kurulum ve Çalıştırma

```bash
npm install
npm run dev
```

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme (electron-vite, HMR) |
| `npm run build` | Üretim paketi |
| `npm run start` | Üretim önizlemesi |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Klavye Akışları

- **F1** — menü çubuğu odağı; sol/sağ yön tuşları ile üst butonlar arasında gezinme
- **Tab / yukarı-aşağı** — açık alt menü ve dosyalar arasında gezinme
- **F3 / yön tuşları** — gezginde klasörler arasında gezinme
- **Ctrl+I** — komut paleti; `tree` yazarak sol dosya gezginini (genişliğin 1/7'si) açma
- **Enter / Esc** — seçim ve kapatma

Tuş eşlemeleri merkezi `Keymap` kaydında tutulur; doğrudan hardcode edilmez.

## Yapılandırma

- `TRANSPARENT=1` ortam değişkeni ile saydam pencere + cam (blur) efekti denenebilir; desteklenmeyen ortamlarda mat siyah zemin kullanılır:
  `TRANSPARENT=1 npm run dev`

## Yapay Zekâ

- **Sağlayıcılar:** Yerleşik (cihaz içi Qwen) + OpenAI-uyumlu: OpenAI, DeepSeek, Groq,
  OpenRouter, Ollama (`:11434`), LM Studio (`:1234`), llama.cpp (`:8080`), özel endpoint.
- **Anahtarlar:** OS anahtarlığında şifreli (`safeStorage`); yoksa `OPENAI_API_KEY`,
  `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` env değişkenleri okunur.
  Anahtar değeri log/IPC'ye düşmez, yalnızca var/yok taşınır.
- **Yerel tarama:** açılışta değil, `Yapay Zekâ → Modelleri Yenile` (veya paneldeki ⟳)
  ile Ollama/LM Studio/llama.cpp taranır; biri çökse diğerleri yine listelenir.
- **Sohbetler:** panel üstünde sekmeler; akış sürerken sekme geçişi engellenir.
- **Kipler:** Plan (diff önizleme + `ai.apply.confirm` onayı) / Yapım (doğrudan yazar).
  Efor: Düşük/Orta/Ultra (token + sıcaklık presetleri).
- **Güvenli yazma:** `ai.apply` son önerideki ` ```yol ` bloklarını yalnızca aktif proje
  kökü altına yazar (`..` kaçışı ve `/proj-evil` önek tuzağı reddedilir), açık sekmeyi tazeler.

## Dokümanlar

- `ARCHITECTURE.md` — mimari, bellek/çizim stratejisi, güvenlik
- `DECISIONS.md` — teknoloji ve tasarım karar kayıtları (ADR)
- `TODO.md` — görev takvimi ve roadmap
- `AGENTS.md` — yapay zekâ çalışma kuralları
- `FAZ_PROMPTLERI.md` — faz bazlı yapay zekâ komut şablonları