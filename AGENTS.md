# AGENTS.md — Yapay Zekâ Çalışma Kuralları

> Bu dosya, bu depoda kod üreten/yardım eden yapay zekâ araçları ve ajanlar için zorunlu kuralları tanımlar.
> Çalışmaya başlamadan önce sırasıyla okunmalıdır: `AGENTS.md` → `ARCHITECTURE.md` → `DECISIONS.md` → `TODO.md`.

## 1. Ortam

- **Node yalnızca `~/node/bin` içindedir** (PATH'te değil):
  - `export PATH="$HOME/node/bin:$PATH"`
  - Doğrulama: `node --version` → v24.x
- Paket yöneticisi: **npm** (pnpm yalnızca kullanıcı onayıyla).
- İlk `npm install` Electron binary'sini indirir (internet gerekir).
- **cargo/rustc sistemde YOKTUR.** Rust/C++ derlemesi denenmez. Native işlemler Electron Main Process ile yapılır (bkz. DECISIONS D-014).
- Linux desktop (compositor destekliyorsa saydamlık/cam efekti denenebilir, fallback mat siyah).

## 2. Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme (electron-vite, HMR) |
| `npm run build` | Üretim paketi |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

**Her görev bitiminde zorunlu:** `typecheck` + `lint` + (test varsa) `test` + `build`.

## 3. Dil Kuralları

- **Kod tanımlayıcıları:** İngilizce (`openFile`, `PaneManager`, `ExplorerView` ...).
- **UI metinleri:** Türkçe; teknik terimler parantez içinde İngilizce kalabilir: `"Ara (Find)"`.
- **Commit mesajları:** Türkçe; conventional style: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **Dokümanlar ve yorumlar:** Türkçe; kod yorumları en az düzeyde, yalnızca karmaşık public API'lerde.

## 4. Yapılmaması Gerekenler (Sert Kurallar)

1. **Hiçbir marka/özel proje adı yok:** dosya adında, kod yorumunda, UI'da, commit'te veya dokümanda hiçbir yerde görünmez.
2. **Hiçbir referans/kaynak dosya atfı yok:** nereden esinlenildiği asla yazılmaz.
3. **Renk kuralları:** Yalnızca `ARCHITECTURE.md` Bölüm 7.1'deki tokenlar. **Kırmızı yalnızca hata içindir.** Token dışı renk eklemek için ADR gerekir (DECISIONS D-007).
4. **Köşeler daima keskin:** her yerde `border-radius: 0`; kenarlıklar 1px vurgu mavisi.
5. **Tuş kısayolları asla hardcode edilmez:** her eylem `CommandRegistry` komutu; eşleme `Keymap` kaydından (DECISIONS D-005). Ana eşlemeler: F1 (menü), sol/sağ (üst butonlar), Tab/yukarı-aşağı (alt menü ve gezgin dosyaları), F3 (gezgin klasörleri), Ctrl+I (komut paleti), Enter, Esc.
6. **IPC yalnızca preload `window.api` üzerinden:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` ayarları asla değiştirilmez; renderer'da `require`/`fs` kullanılmaz.
7. **İnline style yok:** tüm stiller tema tokenlarına bağlanır (`tokens.css` / `theme.ts`).
8. **İzinsiz bağımlılık eklenmez:** gerekirse önce DECISIONS'a ADR yazılır ve kullanıcıya sorulur.
9. **Klavye akışları fareden bağımsız çalışmalı:** kritik hiçbir akış yalnızca fare ile erişilebilir olmamalı.
10. **Gizli bilgiler** (api anahtarı, token) kodda/loglarda asla bulunmaz.

## 5. Görev ve Commit Disiplini

- `TODO.md`'deki plan takip edilir; **her görev tek commit** ile tamamlanır.
- Commit öncesi doğrulama zinciri çalıştırılır (Bölüm 2).
- Görev bitince ilgili `TODO.md` checkbox'ları işaretlenir (`[x]`).
- Mimariye dokunan her değişiklik: önce ADR (DECISIONS.md), sonra kod.
- Şüphede kalındığında kod yazmadan önce kullanıcıya sorulur; varsayım yapılmaz.

## 6. Projeye Hızlı Bakış

- Masaüstü kod editörü; TypeScript + React + Vite + Monaco + Web Workers; Electron kabuğu.
- 5 temel bileşen: `AppShell`, `PaneManager`, `EditorCore`, `CommandHUD`, `StatusBar` + `MenuBar` + `ExplorerView` (tam klasör yapısı: ARCHITECTURE Bölüm 4.3).
- Klavye akışları: F1 menü çubuğu; Ctrl+I komut paleti; `tree` komutu → sol dosya gezgini (genişlik 1/7).
- Gezgin gezinmesi: klasörler arası **F3 / yön tuşları**; dosyalar arası **Tab / yön tuşları**.
- Editör teması, imleç (boş blok + iz), animasyonlar ve hata gösterimi: ARCHITECTURE Bölüm 7.