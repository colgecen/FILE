# TODO.md — Görev Takvimi ve Roadmap

> Kural: **her görev tek commit**. Commit mesajları Türkçe, conventional commit biçiminde
> (`docs:`, `feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
> Her commit'ten önce: `typecheck` + `lint` + `build` çalışır; test varsa testler geçer.
> İşaretler: `[ ]` yapılacak · `[x]` yapıldı · `[~]` devam ediyor.

---

## Faz 0 — Dokümantasyon (tamamlandı)

- [x] ARCHITECTURE.md — `docs: mimari dokümanı ekle`
- [x] DECISIONS.md — `docs: teknoloji karar kayıtlarını ekle`
- [x] TODO.md — `docs: görev planını ekle`
- [x] AGENTS.md — `docs: yapay zeka çalışma kurallarını ekle`

---

## Faz 1 — Proje İskeleti

### 1.1 Vite + React + TypeScript iskeleti
- [ ] Doğrulama: `export PATH="$HOME/node/bin:$PATH"` → `node --version` (v24.x)
- [ ] Boş git deposuna Vite şablonu kur (react-ts); mevcut 4 dokümana dokunma
- [ ] Bağımlılıklar: `react`, `react-dom`, `monaco-editor`, `electron`, `electron-vite`, `vite`, `@vitejs/plugin-react`, `typescript`, `eslint`, `prettier`, `vitest`
- [ ] `npm install`; `npm run dev` çalışır
- [ ] Commit: `chore: vite react-ts iskeletini kur`

### 1.2 Electron kabuğu
- [ ] `electron/main` ve `electron/preload` klasörleri; electron-vite yapılandırması
- [ ] Main: BrowserWindow — siyah arka plan, 1px vurgu mavisi kenarlık, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- [ ] Preload: `contextBridge` ile boş `window.api` yüzeyi (tip tanımlı)
- [ ] Commit: `feat: electron main ve preload iskeletini kur`

### 1.3 Kalite araçları
- [ ] tsconfig strict; ESLint + Prettier kuralları (region `semi`, `quotes` vs. tutarlı)
- [ ] npm script'leri: `dev`, `build`, `typecheck`, `lint`, `test`
- [ ] `vitest` + React Testing Library kurulumu
- [ ] Commit: `chore: lint ve typecheck araçlarını yapılandır`

### 1.4 Görsel temel
- [ ] `src/theme/tokens.css`: renk tokenları (ARCHITECTURE Bölüm 7.1 tablosu birebir)
- [ ] `src/theme/theme.ts`: aynı tokenların TS karşılığı
- [ ] JetBrains Mono + Orbitron yazı tipi yükleme planı (yerel paketleme)
- [ ] Commit: `feat: tema tokenlarını ve font katmanını ekle`

### 1.5 İlk çalışan pencere
- [ ] AppShell iskelet boşluğu: siyah zemin, 1px mavi çerçeve, keskin köşeler
- [ ] Saydamlık/cam (backdrop-filter) denemesi + fallback mat siyah
- [ ] Commit: `feat: ilk calisan pencere iskeleti`

---

## Faz 2 — Çekirdek Katman

### 2.1 Tipler
- [ ] `src/core/types.ts`: `FileNode`, `DirEntry`, `OpenFile`, `CursorPos`, `PaneLayout`, `SplitDirection`, `TelemetrySnapshot`, `AIStatus`, `CommandDef`, `KeyBinding`
- [ ] Commit: `feat: cekirdek veri tiplerini tanimla`

### 2.2 Komut kaydı
- [ ] `CommandRegistry`: komut tanımı (id, başlık, kategorı, çalıştırıcı, kısayol bilgisi)
- [ ] Menü ağacındaki her öğe için komut tanımı (File/Edit/Selection/View/Go/Run/Terminal/Help)
- [ ] Çalıştırma durumu: başarı/hata sonucu döner
- [ ] Commit: `feat: komut kaydini kur`

### 2.3 Tuş kaydı (Keymap)
- [ ] `Keymap`: tuş birleşimi → komut id eşlemesi; çakışma tespiti + raporlama
- [ ] Varsayılan eşlemeler: F1 (menü), sol/sağ (üst butonlar), Tab/yukarı-aşağı (alt menü/dosyalar), F3 (klasörler), Ctrl+I (palet), Enter/Esc
- [ ] Odak bölgesine göre eşleme: editör / menü / palet / gezgin
- [ ] Commit: `feat: tus esleme kaydini kur (keymap)`

### 2.4 IPC köprüsü
- [ ] Preload `window.api`: `openFile`, `readFile`, `writeFile`, `readDir`, `gitBranch`, `sysStart`, `sysStop`, `appExit` (tip tanımlı)
- [ ] Main handler'lar: dialog'lar, fs işlemleri, yol doğrulama, boyut limiti
- [ ] Doğrulanmış ipc kanal listesi ARCHITECTURE Bölüm 3 ile senkron
- [ ] Commit: `feat: ipc koprusunu kur`

### 2.5 Telemetri
- [ ] Main: 1 Hz örnekleme (`os.cpus`, `totalmem`/`freemem`, `process.cpuUsage`, platform)
- [ ] Renderer tarafı tüketici: 500 ms throttle + `requestAnimationFrame` çizim
- [ ] Commit: `feat: sistem telemetri toplayicisini ekle`

### 2.6 AppShell çatısı
- [ ] Merkezi `keydown` dinleyicisi: odak bölgesine göre Keymap'i çağırır
- [ ] Odak bölgesi yönetimi (editör/menü/palet/gezgin) — bölge geçişleri yalnızca komutla
- [ ] IPC başlatma, hata toplama (kırmızı göstergeler), pencere kapatma
- [ ] Commit: `feat: appshell catisini kur`

---

## Faz 3 — Menü Çubuğu (üst navigasyon)

### 3.1 Menü ağacı verisi
- [ ] `src/menus/menuTree.ts`: 9 üst başlık + tüm alt öğeler (komut id bağlantılı)
  - File: Yeni Dosya/Yeni Pencere/Yeni Terminal; Aç (Dosya/Klasör/Son Kullanılanlar); Kaydet/Kaydet As/Tümünü Kaydet; Çıkış
  - Edit: Geri Al/Yinele/Geri Alma Ağacı; Kes/Kopyala/Yapıştır/Panoya Geçmişi; Ara/Bul/Değiştir (Regexp); Yorum Aç/Kapat
  - Selection: Tümünü Seç, Seçimi Genişlet/Daralt; İmleç Yukarı/Aşağı/Tümü; Sütun Modu, Dikdörtgen
  - View: Komut Paleti; Kenar Çubukları (Gezgin/Ara/Kaynak Kontrolü/Çalıştır); Tam Ekran, Zen Modu, Kelime Sarmalama; Tek Pencere, Dikey/Yatay Böl
  - Go: Dosyaya Git/Sembole Git/Tanıma Git/Referanslar; Satıra/Sütuna Git, Geri/İleri; Yer İmi (Aç/Kapat, Atla, Liste)
  - Run: Hata Ayıklamayı Başlat, Kesme Noktası, Devam; Üstüne Adım/İçine Adım/Üstünden Çık; Hata Ayıklamadan Çalıştır, Son Çalıştırmayı Tekrarla
  - Terminal: Yeni Terminal; Böl/Kapat; Görev Çalıştır/Son Görev
  - Help: Karşılama/Başlangıç/Dokümantasyon; Klavye Kısayolları, Fonksiyonu Değişkeni ve Modu Tanımla; Hakkında/Sürüm/Paket Güncelle/Bilgi
  - Local AI (ileri faz, yer tutucu): Sohbet, Satır İçi Tamamlama, Kodu Açıkla; Model Seç/Durum; Yapılandır/İndir
- [ ] Commit: `feat: menu agacini tanimla`

### 3.2 MenuBar bileşeni
- [ ] 9 üst buton; 1px mavi kenarlıklar; keskin köşeler; hover/focus vurgusu
- [ ] Alt menüler: buton odağına/hover'a gelince otomatik açılır; ikinci düzey alt menüler
- [ ] Commit: `feat: menu cubugunu ciz`

### 3.3 Klavye gezinmesi (menü modeli)
- [ ] F1: menü bölgesine geç / kapat
- [ ] Sol/sağ: üst butonlar arası; Tab/yukarı-aşağı: açık alt menü öğeleri
- [ ] Enter: komut çalıştır; Esc: adım adım kapat
- [ ] Odak kilidi: alt menü açıkken üst butonlara kaçış yok
- [ ] Commit: `feat: menu klavye gezimnesini ekle`

### 3.4 Menü → komut bağlama
- [ ] Tüm alt öğeler CommandRegistry komutlarına bağlanır (dosya işlemleri önce yer tutucu, sonra Faz 9)
- [ ] Çalıştırılamayanlar "Yakında" işaretiyle görünür
- [ ] Commit: `feat: menu ogelerini komutlara bagla`

---

## Faz 4 — Komut Paleti (Ctrl+I)

### 4.1 Palet arayüzü
- [ ] `CommandHUD`: ekran ortasında, %90 opak siyah, 1px mavi çerçeve, Orbitron
- [ ] Giriş kutusu + sonuç listesi; klavye ile tam kontrol
- [ ] Commit: `feat: komut paleti arayuzunu ciz`

### 4.2 Fuzzy filtre
- [ ] Komut adları, kısaltma eşanlamlar ve açık dosyalar üzerinde arama
- [ ] Sonuç sıralama; ok/Enter seçim; Esc kapama
- [ ] Commit: `feat: komut paletine bulanik arama ekle`

### 4.3 Kısayol + odak yönetimi
- [ ] Ctrl+I küresel kısayol → palet açar; odak palete geçer; Esc ile eski bölgeye dön
- [ ] Commit: `feat: ctrl+i kisa yolunu ve odak gecisini ekle`

### 4.4 `tree` komutu
- [ ] `tree` eşleşmesi → ExplorerView açılır (genişliğin 1/7'si) + odak gezgine geçer
- [ ] Gezgin zaten açıksa odak transferi yeter
- [ ] Commit: `feat: tree komutuyla dosya gezginini ac`

---

## Faz 5 — Dosya Gezgini (ExplorerView)

### 5.1 Panel çizimi
- [ ] Sol panel: genişlik = pencerenin 1/7'si; 1px mavi sağ sınır; keskin köşeler
- [ ] Klasör/dosya satırları: tip ikonları, girinti, durum (genişletilmiş/daraltılmış)
- [ ] Commit: `feat: dosya gezgini panelini ciz`

### 5.2 Veri bağlama
- [ ] `fs:read-dir` IPC ile kök klasör ağacını çek; klasör açılışlarında isteğe bağlı okuma
- [ ] Yükleme/hata durumları (hata → kırmızı gösterge)
- [ ] Commit: `feat: gezgin klasor verisini ipc ile bagla`

### 5.3 Gezinme modeli (KULLANICI SPESİFİKASYONU)
- [ ] **Klasörler arası:** F3 veya yön tuşları
- [ ] **Dosyalar arası:** Tab veya yön tuşları
- [ ] Enter: klasör aç/kapat, dosya → editörde aç; Esc: gezginden çık, editöre dön
- [ ] Commit: `feat: gezgin klavye gezimnesini ekle`

### 5.4 Dosya açma
- [ ] Gezginden dosya → model oluştur + Editör sekmesi + odak editor
- [ ] Commit: `feat: gezginden dosya acmayi ekle`

### 5.5 Araçlar
- [ ] Yenileme, kök klasör değiştirme, daralt/tümünü genişlet komutları
- [ ] Commit: `feat: gezgin araclarini ekle`

---

## Faz 6 — Editör Çekirdeği (EditorCore)

### 6.1 Monaco kurulumu
- [ ] Monaco yükleme (electron-vite worker kuralları: TS dil hizmeti worker'ı)
- [ ] İlk editor mount; JetBrains Mono + ligatürler (`fontLigatures: true`)
- [ ] Commit: `feat: monaco editoru monte et`

### 6.2 Özel tema
- [ ] `defineTheme` (ARCHITECTURE Bölüm 7.1 birebir): zemin `#03050A`, metin beyaz, anahtar kelime `#00D2FF`, string `#82AAFF`, yorum `#4A6B8C`, seçim `rgba(0,85,255,0.4)`, aktif satır `rgba(0,210,255,0.05)`, teşhis hata kırmızı `#FF5252`
- [ ] Commit: `feat: monaco ozel temasini ekle`

### 6.3 İmleç ve iz efekti
- [ ] İçi boş blok imleç (`block-outline`) + `cursorSmoothCaretAnimation`
- [ ] Sönümlenen mavi iz: editör overlay katmanı
- [ ] Commit: `feat: blok imlec ve iz efekti ekle`

### 6.4 Sekme/model yönetimi
- [ ] Açık sekmeler, kirli işareti, kapatma; LRU üst sınır (ARCHITECTURE 6.3)
- [ ] İmleç satır/sütun olayı → StatusBar'a akış
- [ ] Commit: `feat: sekme ve model yonetimini ekle`

### 6.5 Editör komutları
- [ ] Keymap → editor eylemleri: geri al/yinele, kes/kopyala/yapıştır, ara/değiştir (regexp), yorum aç/kapat, çoklu imleç, sütun/dikdörtgen seçim, seçimi genişlet/daralt, yer imleri, satıra git
- [ ] Commit: `feat: editor komutlarini keymap e bagla`

---

## Faz 7 — Panel Yönetimi (PaneManager)

### 7.1 Bölme düzeni
- [ ] Dikey/yatay bölme komutları; 1px mavi ayraçlar; keskin köşeler
- [ ] Tek pencere / split dinamikleri (View menüsü)
- [ ] Commit: `feat: bolunmus panel duzenini ekle`

### 7.2 Panel gezinme
- [ ] Paneller arası gezinme (yön tuşları veya alt tuş eşlemesi), panel kapatma, aktif panel takibi
- [ ] Commit: `feat: panel arasi gezimneyi ekle`

---

## Faz 8 — Durum Çubuğu (StatusBar)

- [ ] `StatusBar`: Orbitron; siyah zemin, 1px mavi üst sınır
- [ ] Dosya adı · satır:sütun · git branch · CPU/RAM göstergeleri · AI durumu (IDLE)
- [ ] Telemetri + git verisi IPC ile; 500 ms throttle
- [ ] Hata göstergesi: kırmızı HATA rozeti + panel çerçevesi yanıp sönme
- [ ] Commit: `feat: durum cubugunu ve telemetri bilesenlerini ekle`

---

## Faz 9 — Dosya İşlemleri (aç/kaydet)

- [ ] Aç: dialog + `fs:read-file` → sekme; Son Kullanılanlar listesi (persist)
- [ ] Kaydet / Kaydet As / Tümünü Kaydet; kirli işareti; `:w` palet komutu
- [ ] Kaydetme animasyonu: çerçevede kısa mavi glow
- [ ] Hata: kırmızı yanıp sönme + durum çubuğu rozeti + (Monaco teşhisi)
- [ ] Commit: `feat: dosya acma ve kaydetme akisini ekle`

---

## Faz 10 — Terminal (ileri faz başlangıcı)

- [ ] `xterm.js` panel bileşeni (menü: Yeni Terminal / Böl / Kapat)
- [ ] `node-pty` + `@electron/rebuild` (native derleme iş hattı, ADR D-012)
- [ ] pty kanalları: spawn/kill/resize/data; Görev Çalıştır/Son Görev
- [ ] Commit: `feat: xterm terminal panelini ekle`

---

## Faz 11 — Gelişmiş Editör Özellikleri

- [ ] Çoklu imleç yukarı/aşağı/tümü; sütun modu/dikdörtgen seçim (Selection menüsü + keymap)
- [ ] Yer imleri: aç/kapat, atla, liste (Go menüsü)
- [ ] Geri alma ağacı (Undo Tree) görünümü
- [ ] Go to: dosya/sembol/tanım/referans; geri/ileri gezinme
- [ ] Görünüm: zen modu, tam ekran, kelime sarmalama
- [ ] Yardım: karşılama ekranı, kısayol listesi, hakkında
- [ ] Commit: `feat: gelismis editor ve gezinme ozellikleri`

---

## Faz 12 — Yerel Yapay Zekâ (ileri faz)

- [ ] Kontrat tipleri: `AIStatus`, `ModelInfo`, `ChatMessage`, tamamlama istekleri
- [ ] Worker mimarisi: ağır işlemler izole worker'da
- [ ] Menü: Sohbet / Satır İçi Tamamlama / Kodu Açıkla; Model Seç + Durum; İndir
- [ ] StatusBar entegrasyonu (IDLE/COMPUTING/ERROR)
- [ ] Motor seçimi ADR'si (DECISIONS D-013) sonrası gerçek entegrasyon
- [ ] Commit: `feat: yerel ai menusu ve arayuzu`

---

## Faz 13 — Test ve Parlatma

- [ ] Komut paleti (Ctrl+I) end-to-end testi; `tree` → gezgin açılışı
- [ ] F1 menü modeli testleri (klavye senaryoları)
- [ ] Gezgin gezinme testleri (F3/Tab/yön tuşları)
- [ ] Temel dosya aç/kaydet testleri (IPC mock ile)
- [ ] `npm run build` üretim paketi + Electron başlatma doğrulaması
- [ ] Commit: `test: klavye akislarini test et`

---

## Kullanıcı Kararı Bekleyenler

- [ ] Klavyeye özel ek kısayollar (kullanıcı tarafından bildirilecek liste) — Keymap'e işlenecek
- [ ] UI metinlerinde İngilizce/Türkçe terim kararları (ör. "Yeni Dosya" vs "New File")
- [ ] Terminal varsayılan kabuğu (bash/zsh/fish)
- [ ] Yerel yapay zekâ motoru seçimi (Faz 12 öncesi)
- [ ] Büyük dosya performans hedefi (ör. MB sınırı) — Faz 6 öncesi netleştirilecek

---

## Tamamlanma Kriterleri (Faz 0–5)

- Ctrl+I → palet → `tree` → sol gezgin (1/7) açılır ve odaklanır
- Gezginde F3/yön ile klasörler, Tab/yön ile dosyalar arasında gezinilir
- F1 ile menü çubuğu; sol/sağ ile üst butonlar; Tab/yön ile alt menüler
- Pencere: siyah zemin, 1px mavi çerçeve, keskin köşeler; kırmızı yalnızca hata