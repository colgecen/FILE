# DECISIONS.md — Teknoloji ve Tasarım Karar Kayıtları (ADR)

> Her madde, "Neden bu kütüphane/teknoloji/yaklaşım?" sorusunun cevabıdır.
> Mimariye dokunan her değişiklik önce buraya ADR olarak eklenir, sonra kod yazılır.

Format: **Durum** — Bağlam — Karar — Sonuçlar.

---

## D-001 Electron masaüstü kabuğu

- **Durum:** Kabul edildi
- **Bağlam:** Uygulama masaüstünde çalışacak; dosya sistemi erişimi, aç/kaydet dialogları, sistem telemetrisi ve gelecekte terminal (pty) ve yerel yapay zekâ desteği gerekiyor. Saf web ortamında bu yetenekler kısıtlı veya yok.
- **Karar:** Masaüstü kabuğu olarak Electron kullanılır.
- **Sonuçlar:** Node v24 zaten mevcut (ek araç kurulumu gerekmez); tüm fs/dialog işlemleri Main Process'te güvenle yürür; native modüller için napi/ABI yolu açık kalır. Renderer'da Node erişimi kapatılır (güvenlik, ARCHITECTURE Bölüm 9).

## D-002 electron-vite üzerinde Vite

- **Durum:** Kabul edildi
- **Bağlam:** Renderer'da React + Vite isteniyor; main/preload tarafının da derlenmesi gerekiyor.
- **Karar:** `electron-vite` tek yapılandırma ile üç katmanı (main/preload/renderer) derler.
- **Sonuçlar:** HMR renderer'da çalışır; worker ve static kaynak yolu kuralları tek yerden yönetilir.

## D-003 React + TypeScript (strict)

- **Durum:** Kabul edildi
- **Bağlam:** Büyüyecek, çok bileşenli bir arayüz; hata oranını düşük tutmak isteniyor.
- **Karar:** React + TypeScript, `strict` modda; `any` kullanımı yasak; `no-unused-vars` aktif.
- **Sonuçlar:** Daha güvenli refactor; IPC sözleşmesi tiplerle belgelenir.

## D-004 Monaco Editor + özel tema

- **Durum:** Kabul edildi
- **Bağlam:** Editör motoru seçimi; VS Code'la aynı motor olması dil hizmeti (LSP) ve worker ekosistemini hazır getirir.
- **Karar:** Monaco Editor; tema `defineTheme` ile tanımlanır; TypeScript dil hizmeti web worker ile.
- **Sonuçlar:** İmleç stili (boş blok), ligatürler ve renk tokenları Monaco API'si ile tam kontrol edilir.

## D-005 Komut kaydı ve tuş kaydı ayrıştırması

- **Durum:** Kabul edildi
- **Bağlam:** Tüm eylemler klavye ile tetiklenecek; kullanıcı tuş atamalarını zamanla değiştirecek.
- **Karar:** Her eylem `CommandRegistry`'de bir komut; tuş eşlemeleri ayrı `Keymap` kaydında; çakışma tespiti yapılır.
- **Sonuçlar:** Kısayol değişimi kod değişikliği gerektirmez; menüler, palet ve kısayollar aynı komutlara işaret eder.

## D-006 Klavye birinci sınıf, fare ikincil

- **Durum:** Kabul edildi
- **Bağlam:** Ürünün ana kullanım senaryosu klavye; fare yalnızca kolaylaştırıcı.
- **Karar:** Odak yönetimi ve gezinme modeli klavye için tasarlanır; fare etkileşimleri menülerde hover/click olarak çalışır ancak hiçbir kritik akış fareden geçmez.
- **Sonuçlar:** Tüm akışlar klavye ile test edilir.

## D-007 Renk paleti kısıtı

- **Durum:** Kabul edildi
- **Bağlam:** Görsel kimlik: holografik sade görünüm, keskin köşeler, ince çizgiler.
- **Karar:** Yalnızca mavi tonları + beyaz + siyah; **kırmızı yalnızca hata**; `border-radius: 0`; tüm kenarlıklar 1px vurgu mavisi. Token listesi ARCHITECTURE Bölüm 7.1'de zorunludur.
- **Sonuçlar:** Yeni renk tokenı eklemek için ADR gerekir; renk kullanımı otomatik kontrol edilebilir.

## D-008 BrowserWindow güvenlik ayarları sabit

- **Durum:** Kabul edildi
- **Bağlam:** Renderer'a Node erişimi açmak hızlı ama güvensizdir.
- **Karar:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` kalıcıdır; iletişim yalnızca `window.api` (preload contextBridge).
- **Sonuçlar:** Tüm fs işlemleri Main'de yazılır; pty/native modüller yalnızca Main'de kullanılır.

## D-009 Dosya gezgini: Ctrl+I komut paleti → `tree`

- **Durum:** Kabul edildi
- **Bağlam:** Gezgini her zaman görünür tutmak yerine isteğe bağlı çağırmak isteniyor.
- **Karar:** Ctrl+I ile açılan komut paletine `tree` yazınca sol tarafta, pencere genişliğinin 1/7'sini kaplayan geziin açılır ve odak geziinde olur. Gezginde klasörler arası **F3 / yön tuşları**, dosyalar arası **Tab / yön tuşları** ile gezinilir.
- **Sonuçlar:** `tree` komutu CommandRegistry'de birinci sınıf komuttur; gezgin kapalıyken paletle, açıkken Esc ile kapatılabilir.

## D-010 Durum çubuğu telemetrisi

- **Durum:** Kabul edildi
- **Bağlam:** Alt satır; dosya adı, imleç konumu, git branch, sistem yükü ve (ileride) yapay zekâ durumu tek bakışta görülmeli.
- **Karar:** `StatusBar` bileşeni; Orbitron fontu; veriler IPC üzerinden (telemetri 1 Hz örnekleme, renderer'da 500 ms throttle).
- **Sonuçlar:** Sistem bilgisi renderer'da hesaplanmaz; gelecek AI durumu aynı satıra `AIStatus` tipiyle eklenir.

## D-011 State yönetimi: önce kütüphanesiz

- **Durum:** Kabul edildi
- **Bağlam:** Faz 1-3 boyunca state küçük; aşırı kütüphane yükü istenmiyor.
- **Karar:** React Context + `useReducer` ile başlanır; state karmaşıklaşırsa (ör. AI fazı öncesi) kütüphane kararı ADR'ye bağlanır.
- **Sonuçlar:** Faz 1-3 boyunca ekstra bağımlılık yok.

## D-012 Terminal: xterm.js + node-pty (ileri faz)

- **Durum:** Kabul edildi (gerçekleştirme 2026-08-20 — kullanıcı onayıyla başladı)
- **Bağlam:** Emacs tarzı terminal özellikleri (yeni/split terminal, görev çalıştırma) terminal çekirdeği gerektirir.
- **Karar:** Görünüm `xterm.js`, arka uç `node-pty` (Main Process). Node-pty native bir modül olduğundan `@electron/rebuild` ile Electron ABI'sına derlenir.
- **Sonuçlar:** Terminal, native modül derleme iş hattını da beraberinde getirir; önceki fazlarda terminal menüsü yer tutucudur.
- **Uygulama notu (2026-08-20):** Geliştirme ortamında derleyici (make/g++) ve paket yöneticisi (sudo/apt) bulunmadığından kaynaktan derleme yapılamaz; bunun yerine kullanıcı onayıyla `@homebridge/node-pty-prebuilt-multiarch` kullanılır (Electron ABI v130 için ön derlemeli binary, aynı node-pty API'si). Kurallar ve bağımlılık listesi aynı kalır; adresleme VSZ API yüzeyinde değişmez.
- **Uygulama notu 2 (2026-08-20):** Pakette yalnızca Node ABI prebuild'leri bulunduğundan (Electron 33 = ABI 130 için prebuild yok) kullanıcı kararıyla pty, **ayrı bir Node sürecinde (helper)** çalıştırılır: `out/main/pty-helper.js` Node ile spawn edilir (`PTY_NODE_BIN` ortam değişkeniyle seçilebilir), Main Process ile JSONL/stdin-stdout üzerinden haberleşir (`pty:spawn | pty:write | pty:resize | pty:kill` → `pty:data | pty:exit`). Böylece Electron ABI derleme ihtiyacı ortadan kalkar; prebuild Node ABI'sıyla eşleşmeyen Node sürümlerinde `node-gyp rebuild` fallback'i kullanılır.

## D-013 Yerel yapay zekâ: kontrat önce, motor sonra

- **Durum:** Kabul edildi (gerçekleştirme ileri fazda)
- **Bağlam:** Chat, inline tamamlama, kod açıklama, model indirme/yönetim gerekiyor; motor seçimi belirsiz.
- **Karar:** Önce tip kontratları (AIStatus, model bilgisi, kanallar), sonra motor seçimi ADR'si. Ağır hesaplar worker'da.
- **Sonuçlar:** UI ve StatusBar entegrasyonu motordan bağımsız geliştirilir.

## D-014 Native çekirdek (Rust/C++) gelecekteki faz

- **Durum:** Ertelendi (kabul edilmedi, kontrat ayrıldı)
- **Bağlam:** Sistemde Rust/C++ araç zinciri yok; ilk fazlarda performans gereksinimi Node/Electron Main tarafını aşmıyor.
- **Karar:** İlk aşamada native modül derlenmez; tüm sistem işlemleri Electron Main Process'te. İleride native modül, IPC sözleşmesinin Main tarafını devralabilir (kanallar korunur).
- **Sonuçlar:** Şimdilik native/maddi ABI bağımlılığı yok; mimari buna hazır.

## D-016 Yerel yapay zekâ motoru: transformers.js (WebAssembly)

- **Durum:** Kabul edildi
- **Bağlam:** Faz 12 gerçek yerel inference ister; sistemde derleyici yok, native modül derlenemez (D-014); Electron 33 renderer'ında WebGPU garanti değildir; LLM motoru worker'da çalışmalı (D-013).
- **Karar:** Motor `@huggingface/transformers` (transformers.js) — saf WebAssembly (onnxruntime-web), native/AABB derleme gerektirmez; ONNX modelleri (Qwen2.5-Instruct, q4, ~400 MB–1 GB) Web Worker içinde çalışır; model indirme Hugging Face Hub'dan `progress_callback` ile izlenir, iptal worker terminate ile sağlanır.
- **Sonuçlar:** `contextIsolation`/`sandbox` korunur (worker renderer içindedir); ilk model indirme internet gerektirir; UI ve StatusBar (D-013 kontratları) motordan bağımsız kalır; WebGPU'suz WASM backend garantili çalışır.

## D-017 Pane başına sekme çubuğu — araştırma notu

- **Durum:** Taslak / Ertelendi
- **Bağlam:** Mevcut `TabBar` (`src/layout/AppShell.tsx:74-76` ve `src/ui/TabBar.tsx:1-*`) global tek bar olarak çalışır; `PaneManager` (`src/ui/PaneManager.tsx:34-43`, `src/core/panes.ts`) dikey/yatay bölme ile çoklu pane üretir fakat sekmeler tüm panellerde ortak `tabsModel` (`src/core/tabs.ts:4-85`) üzerinden paylaşılır. Kullanıcı pane başına ayrı sekme seti isteyebilir (VS Code modeli).
- **Seçenekler:** (A) Global tek bar korunur — basit, `tabsModel` değişmez; (B) Pane başına bar — `tabsModel` paneId → tab listesi haritasına dönüşür, `PaneManager` her pane'e `TabBar file={activeFileForPane}` render eder, `focusManager` ve `paneCommands` genişler.
- **Karar:** Faz A (12 görev) boyunca **(A) korunur**; pane başına bar ihtiyacı gerçek kullanım ölçülmeden karmaşıklık eklememek için ertelenir. Gelecekte ihtiyaç doğrulanırsa ADR güncellenir ve `src/core/tabs.ts` pane-aware hale getirilir (kanal adları korunur, `window.api` etkilenmez).
- **Sonuçlar:** Şimdilik ek bağımlılık / IPC değişimi yok; `AppShell` tek `TabBar` ile çalışmaya devam eder.

## D-018 Git sekmesi — VS Code benzeri, kusursuz, çakışmasız

- **Durum:** Kabul edildi
- **Bağlam:** Uygulama içi Git (uygulamanın git'i) Code'daki gibi commit/push/pull, stage/unstage, branch, log ve çakışma gösterimi ister; önceki iskelet (`src/core/viewCommands.ts:82-96`) yalnızca `gitBranch` paletiydi, tam sekme yoktu (`src/layout/AppShell.tsx:74-82`).
- **Karar:** Sol panel `GitPanel` (`src/ui/GitPanel.tsx:1-*`, `src/styles/git.css`, genişlik %20, `1px var(--border)`, `border-radius:0`) `AppShell`'e `ExplorerView` yanına koşullu (`gitModel.isOpen`) eklenir; IPC 9 kanal (`git:status/diff/log/commit/push/pull/checkout/add/restore`, `electron/main/gitHandlers.ts:1-*`, `electron/shared/api-types.ts:1-*`, `electron/preload/index.ts:12-49`, `ARCHITECTURE.md §3`) Main'de `execFile('git', …)` ile, yol doğrulama ve boyut limiti ile; model `src/core/gitModel.ts:1-*` (`branch/files/staged/log/isOpen/selected`); komutlar `src/core/gitCommands.ts:1-*` + `Keymap` `git` zone (`src/core/defaultBindings.ts:1-*`, `src/core/types.ts:84`, `src/core/focus.ts:7-43`); tümü `window.api` ve `CommandRegistry` üzerinden, çakışma `UU` → `!` `var(--error)` yalnızca çakışma satırında (`ARCHITECTURE.md §7.1` istisnası).
- **Sonuçlar:** `Görünüm → Kaynak Kontrolü` veya `Ctrl+I` → `git` ile panel açılır, `Tab/yön/Enter` `Ctrl+Enter` `Push`/`Pull` tamamen klavye ile, `StatusBar` branch `IDLE`, hata yalnızca gerçek git hatasında kırmızı; `ExplorerView` (1/7) ile yan yana çakışmaz.

## D-015 Doküman ve iletişim dili

- **Durum:** Kabul edildi
- **Bağlam:** Proje sahibi Türkçe çalışıyor; kod adları İngilizce standart.
- **Karar:** Dokümanlar, commit mesajları ve UI metinleri Türkçe; kod tanımlayıcıları İngilizce; teknik terimler UI'da İngilizce kalabilir (ör. "Find" yerine "Ara (Find)").
- **Sonuçlar:** Tutarlı iletişim; AGENTS.md'de kurallaştırıldı.