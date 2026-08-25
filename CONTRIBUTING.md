# Katkı Rehberi

## Başlamadan Önce

- `AGENTS.md` → `ARCHITECTURE.md` → `DECISIONS.md` → `TODO.md` sırasıyla okunmalı.
- Node `~/.nvm/versions/node/v24.19.0/bin` içindedir: `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` ve `node --version` → v24.x olmalı.

## Geliştirme

```bash
npm install
npm run dev
```

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme (electron-vite, HMR) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run build` | Üretim paketi |

Her görev bitiminde zorunlu: `typecheck` + `lint` + `test` + `build`.

## Kurallar

- Kod tanımlayıcıları İngilizce, UI metinleri Türkçe.
- Commit mesajları Türkçe, conventional: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Her görev (TODO.md checkbox) tek commit.
- Renkler yalnızca `tokens.css` tokenları; kırmızı yalnızca hata; `border-radius: 0`.
- Tuş kısayolları hardcode edilmez, `CommandRegistry` + `Keymap` üzerinden.
- IPC yalnızca `window.api` (preload) üzerinden; `contextIsolation: true` korunur.
- Inline style yok, izinsiz bağımlılık yok.

## Pull Request

1. Fork → branch (`feat/kisa-aciklama`)
2. Değişiklik + test ekle
3. `npm run typecheck && npm run lint && npm test && npm run build` yeşil olmalı
4. PR açıklamasında ne/neden/net etki yazılmalı

## Hata Bildirimi

- `SECURITY.md` kapsamındakiler dışındaki hatalar için Issue açın.
- Tekrar adımları, beklenen/gerçek davranış ve ortam bilgisi ekleyin.
