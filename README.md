# Dosya Editörü

Klavye-öncelikli, masaüstünde çalışan kod editörü.

- **Arayüz:** TypeScript + React + Vite + Monaco Editor + Web Workers
- **Kabuk:** Electron (fs/dialog/telemetri işlemleri Main Process'te)
- **Görsel dil:** mavi tonları, beyaz, siyah; kırmızı yalnızca hata; köşeler keskin (`border-radius: 0`)

## Gereksinimler

- Node.js v24 (`export PATH="$HOME/node/bin:$PATH"`)
- npm
- İlk kurulumda Electron binary'si indirilir (internet gereklidir)

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

## Dokümanlar

- `ARCHITECTURE.md` — mimari, bellek/çizim stratejisi, güvenlik
- `DECISIONS.md` — teknoloji ve tasarım karar kayıtları (ADR)
- `TODO.md` — görev takvimi ve roadmap
- `AGENTS.md` — yapay zekâ çalışma kuralları
- `FAZ_PROMPTLERI.md` — faz bazlı yapay zekâ komut şablonları