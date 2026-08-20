# TODO.md — Görev Takvimi ve Roadmap

> **Kural: her görev (her checkbox) = tek commit.** Görevler özenle, ayrıntılı ve
> acele edilmeden yapılır; yarım veya özensiz iş commit edilmez.
> Commit mesajları Türkçe, conventional style: `docs:`, `feat:`, `fix:`, `chore:`, `refactor:`, `test:`.
> Her commit'ten önce: `typecheck` + `lint` + `build` çalışır; test varsa testler geçer.
> İşaretler: `[ ]` yapılacak · `[x]` yapıldı · `[~]` devam ediyor
> Her görev bittiğinde kutucuklara tik atmayı unutma

**Toplam planlanan commit: 140** (112'si tamamlandı, 28'i kaldı).

---

## Faz 0 — Dokümantasyon (4 commit · TAMAMLANDI)

- [x] ARCHITECTURE.md — yazıldı
    - Commit: `docs: mimari dokümanı ekle`
- [x] DECISIONS.md — yazıldı
    - Commit: `docs: teknoloji karar kayıtlarını ekle`
- [x] TODO.md — yazıldı
    - Commit: `docs: görev planını ekle`
- [x] AGENTS.md — yazıldı
    - Commit: `docs: yapay zeka çalışma kurallarını ekle`

---

## Faz 1 — Proje İskeleti (20 commit)

### 1.1 Vite + React + TypeScript kurulumu
- [x] `export PATH="$HOME/node/bin:$PATH"` ile node v24.x doğrulanır; boş depoya Vite react-ts şablonu kurulur (mevcut 4 dokümana dokunulmaz); `npm install` çalışır
    - Commit: `chore: vite react-ts iskeletini kur`
- [x] Çalışma bağımlılıkları: `react`, `react-dom`, `monaco-editor`; geliştirme: `electron`, `electron-vite`, `vite`, `@vitejs/plugin-react`, `typescript`, `eslint`, `prettier`, `vitest` — tek `npm install` ile temiz kurulum
    - Commit: `chore: bagimlilik listesini kur`

### 1.2 Electron kabuğu
- [x] `electron/main` + `electron/preload` klasörleri; electron-vite yapılandırması (main/preload/renderer tsconfig ayrımı)
    - Commit: `chore: electron-vite yapilandirmasini ekle`
- [x] Main: BrowserWindow — siyah arka plan, 1px vurgu mavisi kenarlık, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; app yaşam döngüsü
    - Commit: `feat: ana pencereyi olustur`
- [x] Preload: `contextBridge` ile tip tanımlı boş `window.api` yüzeyi + `api.d.ts`
    - Commit: `feat: preload api yuzeyini ekle`
- [x] Dev akışı: `npm run dev` renderer'ı derler, pencereyi açar, HMR çalışır
    - Commit: `feat: dev baslatma akisini dogrula`

### 1.3 Kalite araçları
- [x] tsconfig: strict, `noUnusedLocals`, dizi/nesne tipleri sıkı
    - Commit: `chore: strict typescript ayarlarini yapilandir`
- [x] ESLint (flat config) + Prettier: tutarlı biçimlendirme, `semi`, `quotes` kuralları
    - Commit: `chore: lint ve bicimlendirme araclarini kur`
- [x] npm script'leri: `dev`, `build`, `typecheck`, `lint`, `test`
    - Commit: `chore: npm scriptlerini tanimla`
- [x] Vitest + React Testing Library kurulumu; açılan ilk test (yapı doğrulaması)
    - Commit: `test: vitest ortamini kur`

### 1.4 Görsel temel
- [x] `src/theme/tokens.css`: renk tokenları (ARCHITECTURE Bölüm 7.1 tablosu birebir)
    - Commit: `feat: renk tokenlarini css olarak ekle`
- [x] `src/theme/theme.ts`: tokenların TS karşılığı (tek kaynak, css ile senkron)
    - Commit: `feat: tema tokenlarini ts olarak ekle`
- [x] Font katmanı: JetBrains Mono (ligatür hazırlığı) + Orbitron yükleme ve ön yükleme
    - Commit: `feat: yazi tiplerini ekle`

### 1.5 İlk çalışan pencere
- [x] AppShell iskeleti render edilir: saf siyah zemin
    - Commit: `feat: ilk appshell iskeletini ciz`
- [x] Pencere çerçevesi: 1px vurgu mavisi kenarlık, keskin köşeler (`border-radius: 0`)
    - Commit: `feat: pencere cercevesi stillerini ekle`
- [x] Saydam pencere + `backdrop-filter` cam/hologram denemesi (Linux compositor)
    - Commit: `feat: saydam pencere ve cam efekti denemesi`
- [x] Compositor desteklemezse fallback: mat siyah zemin, görsel bütünlük korunur
    - Commit: `feat: mat siyah fallback zemin`
- [x] Renderer güvenlik başlıkları: CSP yalnızca yerel kaynakları yükler
    - Commit: `chore: renderer icin csp basliklarini ekle`
- [x] `.gitignore` + temel depo düzeni (node_modules, out, dist dışı)
    - Commit: `chore: gitignore ve depo duzenini kur`
- [x] README.md: proje tanımı, kurulum ve komutlar (Türkçe)
    - Commit: `docs: readme dosyasini ekle`

---

## Faz 2 — Çekirdek Katman (21 commit)

### 2.1 Tipler
- [x] `src/core/types.ts` — dosya/gezgin: `FileNode`, `DirEntry`, `OpenFile`
    - Commit: `feat: dosya ve gezgin tiplerini tanimla`
- [x] Düzen/editör: `CursorPos`, `PaneLayout`, `SplitDirection`, `OpenTab`
    - Commit: `feat: duzen ve editor tiplerini ekle`
- [x] Sistem/komut: `TelemetrySnapshot`, `AIStatus`, `CommandDef`, `KeyBinding`, `FocusZone`
    - Commit: `feat: sistem ve komut tiplerini tanimla`

### 2.2 Komut kaydı (CommandRegistry)
- [x] Registry çekirdeği: komut tanımı (id, başlık, kategori, çalıştırıcı), kayıt/sorgu API'si
    - Commit: `feat: komut kaydinin cekirdegini kur`
- [x] Menü ağacındaki tüm öğeler için komut tanımları (File/Edit/Selection/View/Go/Run/Terminal/Help)
    - Commit: `feat: menu komutlarini tanimla`
- [x] Çalıştırma sonucu: başarı/hata nesnesi döner; hata merkezî gösterime taşınır
    - Commit: `feat: komut sonucu ve hata yuzeyini ekle`

### 2.3 Tuş kaydı (Keymap)
- [x] Keymap çekirdeği: birleşim → komut id eşlemesi, çakışma tespiti ve raporlama
    - Commit: `feat: keymap kaydini kur`
- [x] Varsayılan eşlemeler: F1 (menü), sol/sağ (üst butonlar), Tab/yukarı-aşağı (alt menü + gezgin dosyaları), F3 (gezgin klasörleri), Ctrl+I (palet), Enter, Esc
    - Commit: `feat: varsayilan tus eslemelerini tanimla`
- [x] Odak bölgesine göre eşleme: editör / menü / palet / gezgin ayrımı
    - Commit: `feat: odak bolgesine ozel eslemeleri ekle`

### 2.4 IPC köprüsü
- [x] Preload `window.api` tip tanımlı imzaları: `openFile`, `readFile`, `writeFile`, `readDir`, `gitBranch`, `sysStart`, `sysStop`, `appExit`
    - Commit: `feat: preload api imzalarini tanimla`
- [x] Main dialog handler'ları: dosya aç, klasör aç, farklı kaydet
    - Commit: `feat: dosya dialoglarini ekle`
- [x] Main fs handler'ları: okuma/yazma/klasör okuma + yol doğrulama + boyut limiti
    - Commit: `feat: fs isleyicilerini ekle`
- [x] `git:branch` + `app:exit` kanalları; kanal listesi ARCHITECTURE Bölüm 3 ile senkron kontrol
    - Commit: `feat: git ve uygulama kanallarini ekle`

### 2.5 Telemetri
- [x] Main: 1 Hz örnekleyici (`os.cpus`, `totalmem/freemem`, `process.cpuUsage`, platform) → `sys:metrics` itkisi
    - Commit: `feat: telemetri ornekleyicisini ekle`
- [x] Renderer tüketici: 500 ms throttle + `requestAnimationFrame` çizim planı
    - Commit: `feat: telemetri tuketicisini ekle`

### 2.6 AppShell çatısı
- [x] Merkezi `keydown` dinleyicisi: odak bölgesine göre Keymap'i çağırır, çakışma raporlarını gösterir
    - Commit: `feat: merkezi klavye dinleyicisini kur`
- [x] Odak bölgesi yönetimi: editör/menü/palet/gezgin; geçişler yalnızca komutla
    - Commit: `feat: odak bolgesi yonetimini ekle`
- [x] Hata toplama: hata nesneleri tek kanaldan; kırmızı göstergelere bağlanır
    - Commit: `feat: hata gostergesi altyapisini ekle`
- [x] IPC yaşam döngüsü: AppShell mount'ta `sysStart`, unmount'ta `sysStop`; kapatma akışı
    - Commit: `feat: ipc yasam dongusunu kur`
- [x] AppShell bileşen iskeleti: sağlayıcılar (CommandRegistry/Keymap/State), çocuk alanlar
    - Commit: `feat: appshell bilesenini kur`
- [x] Pencere kapanış onayı: kaydedilmemiş değişiklik varsa uyarı akışı
    - Commit: `feat: kapanis onayi akisini ekle`

---

## Faz 3 — Menü Çubuğu (13 commit)

### 3.1 Menü ağacı verisi
- [x] `src/menus/menuTree.ts`: veri yapısı + 9 üst başlık; her öğe komut id ile bağlı
    - Commit: `feat: menu agaci iskeletini kur`
- [x] File + Edit katalogları: Yeni Dosya/Yeni Pencere/Yeni Terminal; Aç (Dosya/Klasör/Son Kullanılanlar); Kaydet/Kaydet As/Tümünü Kaydet; Çıkış; Geri Al/Yinele/Geri Alma Ağacı; Kes/Kopyala/Yapıştır; Ara/Bul/Değiştir (Regexp); Yorum Aç/Kapat (katalog içeriği `feat: menu komutlarini tanimla` commit'inde birleştirildi)
    - Commit: `feat: dosya ve duzenleme menulerini tanimla`
- [x] Selection + View katalogları: Tümünü Seç/Genişlet/Daralt; İmleç Yukarı/Aşağı/Tümü; Sütun/Dikdörtgen; Komut Paleti; Kenar Çubukları (Gezgin/Ara/Kaynak Kontrolü/Çalıştır); Tam Ekran/Zen Modu/Kelime Sarmalama; Tek Pencere/Dikey/Yatay Böl (katalog içeriği `feat: menu komutlarini tanimla` commit'inde birleştirildi)
    - Commit: `feat: secim ve gorunum menulerini tanimla`
- [x] Go + Run + Terminal + Help + Local AI katalogları: Dosyaya/Sembole/Tanıma/Referans; Satıra Git; Geri/İleri; Yer İmleri; Hata Ayıklama komutları; Terminal/Görevler; Karşılama/Kısayollar/Hakkında; AI yer tutucuları (katalog içeriği `feat: menu komutlarini tanimla` commit'inde birleştirildi)
    - Commit: `feat: gezinme calistirma terminal yardim ve ai menulerini tanimla`

### 3.2 MenuBar bileşeni
- [x] Üst buton satırı: 9 buton, 1px mavi kenarlık, hover/focus vurgusu, keskin köşeler
    - Commit: `feat: ust buton satirini ciz`
- [x] Alt menü paneli: odağa/hover'a gelince otomatik açılır; 1px mavi çerçeve
    - Commit: `feat: alt menu panelini ciz`
- [x] İkinci düzey alt menüler: genişleme okları, konumlandırma
    - Commit: `feat: alt menu seviyelerini ekle`

### 3.3 Klavye gezinmesi
- [x] F1: menü bölgesine geçiş / menüden çıkış
    - Commit: `feat: f1 odak gecisini ekle`
- [x] Sol/sağ yön: üst butonlar arasında dolanım
    - Commit: `feat: ust buton gezinmesini ekle`
- [x] Tab/yukarı-aşağı: açık alt menü öğeleri arasında gezinme
    - Commit: `feat: alt menu gezinmesini ekle`
- [x] Enter: öğeyi çalıştırır; Esc: adım adım kapatır; alt menü açıkken odak kilidi (üst butonlara kaçış yok)
    - Commit: `feat: enter esc ve odak kilidi mantigini ekle`

### 3.4 Menü → komut bağlama
- [x] Tüm alt öğeler CommandRegistry komutlarına bağlanır (dosya işlemleri ilk etapta yer tutucu; tam akış Faz 9)
    - Commit: `feat: menu ogelerini komutlara bagla`
- [x] Çalıştırılamayan öğeler "Yakında" işaretiyle görünür, Enter'da bilgi gösterir
    - Commit: `feat: yer tutucu komut durumlarini ekle`

---

## Faz 4 — Komut Paleti / Ctrl+I (11 commit)

### 4.1 Palet arayüzü
- [x] `CommandHUD` bileşen iskeleti: ekran ortasında konumlanma, görünürlük kontrolü
    - Commit: `feat: komut paleti bilesen iskeletini ciz`
- [x] Panel stili: %90 opak siyah, 1px mavi çerçeve, Orbitron, keskin köşeler
    - Commit: `feat: komut paleti panel stilini ekle`
- [x] Giriş kutusu + sonuç listesi: tamamen klavye ile yönetilir
    - Commit: `feat: palet giris ve sonuc listesini ekle`

### 4.2 Fuzzy filtre
- [x] Komut adları üzerinde bulanık arama
    - Commit: `feat: komut bulanik aramasini ekle`
- [x] Kısaltma eşanlamları + açık dosya adları ile genişletilmiş arama
    - Commit: `feat: esanlam ve dosya aramasini ekle`
- [x] Sonuç sıralama; yukarı/aşağı seçim; Enter çalıştırır; Esc kapatır
    - Commit: `feat: palet secim akisini ekle`

### 4.3 Kısayol + odak yönetimi
- [x] Ctrl+I küresel kısayolu paleti açar (odak bölgesi: palet)
    - Commit: `feat: ctrl+i kisa yolunu ekle`
- [x] Esc ile önceki odak bölgesine dönüş; giriş kutusu odağı kilidi
    - Commit: `feat: palet odak korumasi ekle`

### 4.4 `tree` komutu
- [x] `tree` komut tanımı katalogda (açılışta eşleşmelere yüksek öncelik)
    - Commit: `feat: tree komutunu tanimla`
- [x] Çalışınca ExplorerView açılır: sol taraf, pencere genişliğinin 1/7.si, 1px mavi sınır
    - Commit: `feat: tree komutuyla gezgin acilisini ekle`
- [x] Gezgin zaten açıksa yalnızca odak transferi yapılır; gezgin kapatma komutu da tanımlı
    - Commit: `feat: gezginlere odak transferini ekle`

---

## Faz 5 — Dosya Gezgini / ExplorerView (14 commit)

### 5.1 Panel çizimi
- [x] ExplorerView iskelet: sol panel, genişlik 1/7, sağ 1px vurgu mavisi sınır, keskin köşeler (Faz 4: `feat: tree komutuyla gezgin acilisini ekle`)
    - Commit: `feat: gezgin panel iskeletini ciz`
- [x] Klasör/dosya satırları: girinti hiyerarşisi, satır yükseklikleri
    - Commit: `feat: gezgin satir gorunumlerini ekle`
- [x] Tip ikonları: klasör/dosya ayraçları (metin tabanlı, ikon kütüphanesi yok)
    - Commit: `feat: gezgin tip ikonlarini ekle`
- [x] Klasör durum göstergesi: genişletilmiş/daraltılmış oku
    - Commit: `feat: klasor durum gostergesini ekle`

### 5.2 Veri bağlama
- [x] `fs:read-dir` IPC ile klasör ağacı çekimi; genişletilen klasörler isteğe bağlı okunur
    - Commit: `feat: gezgin veri kaynagini bagla`
- [x] Kök klasör: açılışta yüklenir; kök değiştirme akışı
    - Commit: `feat: kok klasor yuklemesini ekle`
- [x] Yükleme ve hata durumları: bekleniyor göstergesi, hata → kırmızı gösterge
    - Commit: `feat: gezgin yukleme ve hata durumlarini ekle`

### 5.3 Gezinme modeli (kullanıcı spesifikasyonu)
- [x] **Klasörler arası:** F3 tuşu ile gezinme
    - Commit: `feat: f3 ile klasor gezinmesini ekle`
- [x] **Klasörler arası:** yön tuşları ile gezinme
    - Commit: `feat: yon tuslari ile klasor gezinmesini ekle`
- [x] **Dosyalar arası:** Tab tuşu ile gezinme
    - Commit: `feat: tab ile dosya gezinmesini ekle`
- [x] **Dosyalar arası:** yön tuşları ile gezinme
    - Commit: `feat: yon tuslari ile dosya gezinmesini ekle`

### 5.4 Eylemler
- [x] Enter: klasör → aç/kapat (genişlet/daralt)
    - Commit: `feat: klasor ac kapat eylemini ekle`
- [x] Enter: dosya → model oluştur + editör sekmesi + odak editöre geçer
    - Commit: `feat: dosya acma akisini ekle`
- [x] Esc: gezginden çıkış, odak editöre döner (odak bölgesi kuralı)
    - Commit: `feat: gezginden cikis akisini ekle`

---

## Faz 6 — Editör Çekirdeği / EditorCore (13 commit)

### 6.1 Monaco kurulumu
- [x] `monaco-editor` + worker kurulumu (electron-vite worker kuralları, TS dil hizmeti worker'ı)
    - Commit: `chore: monaco ve worker kurulumunu ekle`
- [x] İlk mount: EditorCore bileşeni model ile monte edilir
    - Commit: `feat: ilk monaco mountunu ekle`
- [x] JetBrains Mono + `fontLigatures: true`, doğru tema altında okunabilirlik
    - Commit: `feat: editor font ve ligatur ayarlarini ekle`

### 6.2 Özel tema
- [x] `defineTheme`: ARCHITECTURE Bölüm 7.1 tokenları birebir (zemin `#03050A`, metin beyaz, imleç mavi)
    - Commit: `feat: monaco temasini tanimla`
- [x] Sözdizimi renkleri: anahtar kelime `#00D2FF`, string `#82AAFF`, yorum `#4A6B8C`, seçim `rgba(0,85,255,0.4)`, aktif satır `rgba(0,210,255,0.05)`, teşhis hatası `#FF5252`
    - Commit: `feat: sozdizimi renklendirmesini ekle`

### 6.3 İmleç ve iz efekti
- [x] İçi boş blok imleç (`block-outline`) + `cursorSmoothCaretAnimation`
    - Commit: `feat: blok imlec ayarini ekle`
- [x] Sönümlenen mavi iz: editör overlay katmanı (düşük maliyetli çizim)
    - Commit: `feat: imlec iz efektini ekle`

### 6.4 Sekme ve model yönetimi
- [x] Sekme listesi, kirli işareti, kapama akışı; yeniden açma modeli
    - Commit: `feat: sekme durumlarini ekle`
- [x] LRU üst sınır: açık model sayısı sınırlanır, en az kullanılan geri yazılır (ARCHITECTURE 6.3)
    - Commit: `feat: model bellek sinirini ekle`
- [x] İmleç satır/sütun olayları → StatusBar'a akış
    - Commit: `feat: imlec konum olaylarini ekle`

### 6.5 Editör komutları (Keymap → editor)
- [x] Düzenleme komutları: geri al/yinele, kes/kopyala/yapıştır, yorum aç/kapat (Edit menüsüyle birebir)
    - Commit: `feat: duzenleme komutlarini bagla`
- [x] Bul/değiştir (regexp destekli); uygulama içi arama yüzeyi
    - Commit: `feat: bul ve degistir komutlarini ekle`
- [x] Çoklu imleç/sütun-dikdörtgen seçim/yer imleri temel bağlamaları (tam akış Faz 11)
    - Commit: `feat: coklu secim ve yer imi temellerini ekle`

---

## Faz 7 — Panel Yönetimi / PaneManager (5 commit)

- [x] PaneManager iskelet: ızgara düzeni, aktif panel takibi, EditorCore render
    - Commit: `feat: panel yoneticisi iskeletini kur`
- [x] Dikey bölme komutu (View menüsü, split vertical) çalışır durumda
    - Commit: `feat: dikey bolme komutunu ekle`
- [x] Yatay bölme komutu (split horizontal) çalışır durumda
    - Commit: `feat: yatay bolme komutunu ekle`
- [x] Panel ayraçları: 1px vurgu mavisi, keskin köşeler, bölme oranları
    - Commit: `feat: panel ayraclarini ekle`
- [x] Paneller arası gezinme + panel kapatma komutları
    - Commit: `feat: panel gezinmesini ve kapatmayi ekle`

---

## Faz 8 — Durum Çubuğu / StatusBar (5 commit)

- [x] StatusBar iskelet: siyah zemin, 1px vurgu mavisi üst sınır, Orbitron
    - Commit: `feat: durum cubugu iskeletini ciz`
- [x] Dosya adı + satır:sütun göstergesi (EditorCore olaylarıyla beslenir)
    - Commit: `feat: dosya bilgisi gostergesini ekle`
- [x] Git branch göstergesi (`git:branch` IPC; yoksa gizlenir)
    - Commit: `feat: git branch gostergesini ekle`
- [x] CPU/RAM göstergeleri (telemetri itkisi; 500 ms throttle)
    - Commit: `feat: sistem metrik gostergelerini ekle`
- [x] AI durum göstergesi (ilk değer `IDLE`) + hata rozeti (kırmızı, yalnızca hata)
    - Commit: `feat: ai durum ve hata rozetini ekle`

---

## Faz 9 — Dosya İşlemleri (5 commit · TAMAMLANDI)

- [x] Dosya açma akışı: dialog → `fs:read-file` → sekte/model; hatalar merkezî gösterime
    - Commit: `feat: dosya acma akisini ekle`
- [x] Son Kullanılanlar listesi: kalıcı depo, menüden erişim
    - Commit: `feat: son kullanilanlar listesini ekle`
- [x] Kaydet / Kaydet As / Tümünü Kaydet + `:w` palet komutu; kirli işareti temizlenir
    - Commit: `feat: kaydetme komutlarini ekle`
- [x] Kaydetme geri bildirimi: pencere çerçevesinde kısa mavi glow animasyonu
    - Commit: `feat: kaydetme isigi efektini ekle`
- [x] Hata geri bildirimi: ilgili panel çerçevesi kırmızı yanıp söner + durum çubuğu rozeti
    - Commit: `feat: hata geribildirim efektini ekle`

---

## Faz 10 — Terminal (5 commit · 10.1 TAMAMLANDI, 10.2–10.5 ERTELENDİ)

- [x] `xterm.js` panel bileşeni: menüden yeni terminal açılabilir (ilk aşamada taklit kabuk)
    - Commit: `feat: xterm terminal panelini ekle` *(10.2–10.5 ertelendi: node-pty native derleme    gerektirir — kullanıcı kararı 2026-08-20)*
- [ ] `node-pty` kurulumu + `@electron/rebuild` native derleme iş hattı (ADR D-012)
    - Commit: `chore: node-pty ve aabi derlemesini kur`
- [ ] pty kanalları: spawn/kill/resize/data (Main Process, güvenlik kurallarına uygun)
    - Commit: `feat: pty kanallarini ekle`
- [ ] Terminal komutları: yeni terminal, terminali böl, terminali kapat (Terminal menüsü)
    - Commit: `feat: terminal komutlarini ekle`
- [ ] Görev akışı: görev çalıştır / son görevi tekrarla
    - Commit: `feat: gorev calistirma komutlarini ekle`

---

## Faz 11 — Gelişmiş Editör Özellikleri (7 commit)

- [x] Çoklu imleç: yukarı/aşağı/tümü (Selection menüsü + keymap)
    - Commit: `feat: coklu imlec komutlarini ekle`
- [x] Sütun modu / dikdörtgen seçim
    - Commit: `feat: sutun ve dikdortgen secimini ekle`
- [x] Yer imleri: aç/kapat, atla, liste (Go menüsü)
    - Commit: `feat: yer imi komutlarini ekle`
- [x] Geri alma ağacı (Undo Tree) görünümü ve komutları
    - Commit: `feat: geri alma agaci komutlarini ekle`
- [x] Go to: dosyaya/sembole/tanıma/referansa git; geri/ileri gezinme
    - Commit: `feat: go to komutlarini ekle`
- [x] Görünüm modları: zen modu, tam ekran, kelime sarmalama
    - Commit: `feat: gorunum modlarini ekle`
- [ ] Yardım ekranları: karşılama, tuş listesi, hakkında
    - Commit: `feat: yardim ekranlarini ekle`

---

## Faz 12 — Yerel Yapay Zekâ (ileri faz · 6 commit)

- [ ] AI kontrat tipleri: `AIStatus`, `ModelInfo`, `ChatMessage`, tamamlama istekleri
    - Commit: `feat: ai kontrat tiplerini tanimla`
- [ ] Worker mimarisi: ağır işlemler izole worker'da (contextIsolation kuralı korunur)
    - Commit: `feat: ai worker mimarisini kur`
- [ ] AI menü kataloğu: sohbet, satır içi tamamlama, kodu açıkla
    - Commit: `feat: ai menu katalogunu tanimla`
- [ ] Model seçimi + durum yönetimi (model listesi, aktif model)
    - Commit: `feat: model secimi ve durum yonetimini ekle`
- [ ] Model indirme akışı: ilerleme, iptal, hata yönetimi
    - Commit: `feat: model indirme akisini ekle`
- [ ] StatusBar entegrasyonu (IDLE/COMPUTING/ERROR) + motor seçimi ADR'si sonrası gerçek bağlantı
    - Commit: `feat: ai durumunu durum cubuguna bagla`

---

## Faz 13 — Test ve Parlatma (6 commit)

- [ ] Komut paleti (Ctrl+I) end-to-end testleri; `tree` → gezgin açılış senaryosu
    - Commit: `test: komut paleti akislarini test et`
- [ ] F1 menü modeli testleri (klavye senaryoları: gezinme, kilit, Esc)
    - Commit: `test: menü modeli klavye testlerini ekle`
- [ ] Gezgin gezinme testleri (F3/Tab/yön tuşları, Enter/Esc)
    - Commit: `test: gezgin gezinme testlerini ekle`
- [ ] Dosya aç/kaydet testleri (IPC mock'ları ile)
    - Commit: `test: dosya akisi testlerini ekle`
- [ ] `npm run typecheck` + `lint` + `build` tam zincir; hata yok, uyarı paketlenir
    - Commit: `chore: uretim paketini dogrula`
- [ ] Electron başlatma doğrulaması: pencere açılır, telemetri itkisi gelir, kapanış temiz
    - Commit: `chore: electron baslatma dogrulamasini yap`

---

## Kullanıcı Kararı Bekleyenler (commit gerektirmez)

- [ ] Klavyeye özel ek kısayollar (kullanıcı bildirecek liste) → Keymap'e işlenecek
- [ ] UI metinlerinde Türkçe/İngilizce terim kararları (ör. "Yeni Dosya" vs "New File")
- [ ] Terminal varsayılan kabuğu (bash/zsh/fish)
- [ ] Yerel yapay zekâ motoru seçimi (Faz 12 öncesi)
- [ ] Büyük dosya performans hedefi (MB sınırı) — Faz 6 öncesi netleştirilecek

---

## Tamamlanma Kriterleri (Faz 0–5)

- Ctrl+I → palet → `tree` → sol gezgin (1/7) açılır ve odaklanır
- Gezginde F3/yön ile klasörler, Tab/yön ile dosyalar arasında gezinilir
- F1 ile menü çubuğu; sol/sağ ile üst butonlar; Tab/yön ile alt menüler
- Pencere: siyah zemin, 1px mavi çerçeve, keskin köşeler; kırmızı yalnızca hata
