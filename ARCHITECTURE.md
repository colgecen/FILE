# Mimari Dokümanı

> Bu doküman projenin mimarisini, bellek/çizim stratejisini ve güvenlik kurallarını tanımlar.
> `AGENTS.md` ile birlikte, kod üreten yapay zekâ araçlarının hata yapmamasını sağlamak için yazılmıştır.
> Kod yazımına başlamadan önce bu dosya okunmalıdır.

## 1. Amaç ve Kapsam

Klavye-öncelikli, masaüstünde çalışan bir kod editörüdür.

- **Teknoloji:** TypeScript + React + Vite + Monaco Editor + Web Workers, masaüstü kabuğu olarak Electron.
- **Klavye önceliği:** Tüm ana akış klavye ile yürütülür; fare ikinci plandadır (yalnızca kolaylaştırıcı).
- **Görsel dil:** Yalnızca mavi tonları, beyaz ve siyah kullanılır. **Kırmızı yalnızca hata durumları içindir.** Köşeler daima keskin (`border-radius: 0`).

## 2. Genel Bakış

### 2.1 Süreç Mimarisi

Uygulama üç katmandan oluşur:

```
+------------------+   IPC (invoke/on)   +---------------------------------------+
|  MAIN PROCESS    | <-----------------> |  RENDERER (React + Monaco)            |
|  Electron main   |   contextBridge     |                                        |
|                  |                     |  AppShell                              |
|  dosya sistemi   |                     |   ├── MenuBar (9 üst buton)            |
|  dialoglar       |                     |   ├── PaneManager ── EditorCore × N   |
|  sistem telemetri|                     |   ├── ExplorerView (sol, genişliğin 1/7'si)|
|  git işlemleri   |                     |   ├── CommandHUD (Ctrl+I komut paleti) |
|  (ileride) pty   |                     |   └── StatusBar (alt telemetri satırı) |
|  (ileride) AI    |                     |                                        |
+------------------+                     |  Web Workers (Monaco dil hizmetleri)  |
                                         +---------------------------------------+
```

**Ana prensipler:**
- Dosya sistemi, sistem bilgisi ve diğer ayrıcalıklı işlemlere **yalnızca Main Process** erişebilir.
- Renderer tarafı, kısıtlı ve tip tanımlı bir API yüzeyi (`window.api`) üzerinden haberleşir.
- Tüm klavye girişleri önce **AppShell** içindeki merkezi dinleyiciden geçer; komut kaydına yönlendirilir.

### 2.2 Veri Akışı

```
Klavye olayı ─→ Merkezi keydown dinleyicisi (AppShell)
                  │
                  ├─→ keymap kaydı → CommandRegistry → komut çalışır
                  │                                     │
                  │                          ┌──────────┼──────────┐
                  │                    UI eylemi  IPC çağrısı  editor eylemi
                  │                                              (Monaco)
                  └─→ odak yönetimi (F1 modeli, palet, gezgin)
```

## 3. IPC Sözleşmesi

Renderer → Main `ipcRenderer.invoke`; Main → Renderer `webContents.send` (itki).

| Kanal                        | Yön      | Açıklama |
|------------------------------|----------|----------|
| `dialog:open-file`           | R → M    | Dosya açma penceresi; seçilen dosya içeriği |
| `dialog:open-folder`         | R → M    | Klasör açma penceresi; kök yol |
| `dialog:save-as`             | R → M    | Farklı kaydet penceresi; hedef yol |
| `fs:read-file`               | R → M    | Belirtilen yolun içeriği + dil tespiti |
| `fs:write-file`              | R → M    | Belirtilen yola içerik yazma |
| `fs:read-dir`                | R → M    | Klasör ağacı (gezgin için) |
| `git:branch`                 | R → M    | Aktif branch + durum |
| `sys:start` / `sys:stop`     | R → M    | Telemetri itkisini başlat/durdur |
| `sys:metrics`                | M → R    | Periyodik CPU/RAM örnekleri |
| `app:exit`                   | R → M    | Uygulamayı kapat |
| `app:new-window`             | R → M    | Yeni pencere aç (BrowserWindow, aynı güvenlik ayarları) |
| (ileride) `pty:spawn`        | R → M    | Terminal oturumu |
| (ileride) `ai:status`        | M → R    | Yerel yapay zekâ durumu |

- Tüm yollar Main tarafında doğrulanır ve normalleştirilir.
- İçerik boyutları için üst sınır kontrolü yapılır (bkz. Bölüm 8).

## 4. Renderer Mimarisi

### 4.1 Bileşen Hiyerarşisi

```
<AppShell>
 ├── <MenuBar>            üstte 9 buton + otomatik açılan alt menüler
 ├── <PaneManager>        1×N panel ızgarası, 1px mavi ayraçlar
 │    └── <EditorCore>    her panelde bir Monaco örneği
 ├── <ExplorerView>       sol panel; pencere genişliğinin 1/7'si
 ├── <CommandHUD>         Ctrl+I ile ekran ortasında beliren palet
 └── <StatusBar>          alt telemetri satırı (Orbitron)
```

### 4.2 Bileşen Sorumlulukları

| Bileşen | Sorumluluk |
|---------|------------|
| `AppShell` | İskelet; IPC köprüsü kurulumu; merkezi klavye dinleyicisi; odak yönetimi; `Keymap` + `CommandRegistry` sağlayıcıları |
| `MenuBar` | 9 üst buton; alt menüler; F1/sol/sağ/Tab/yukarı-aşağı gezinme modeli |
| `PaneManager` | Dikey/yatay bölme (`split` komutları), panel ızgarası, paneller arası gezinme |
| `EditorCore` | Monaco mount; özel tema; model/sekme yönetimi; imleç ve tetikleme olayları |
| `ExplorerView` | Sol klasör paneli (1/7 genişlik); klasörler arası **F3 / yön tuşları**, dosyalar arası **Tab / yön tuşları** gezinme; dosya açma |
| `CommandHUD` | Ctrl+I arama menüsü; fuzzy filtre; komut çalıştırma; `tree` → ExplorerView açma |
| `StatusBar` | Dosya adı, satır/sütun, git branch, CPU/RAM, yapay zekâ durumu (IDLE/COMPUTING) |

### 4.3 Kaynak Klasör Yapısı

```
src/
├── core/            tipler, CommandRegistry, Keymap, IPC API tipleri
├── layout/          AppShell, StatusBar
├── menus/           menü ağacı verisi, MenuBar ve alt menü bileşenleri
├── panes/           PaneManager
├── editor/          EditorCore, Monaco teması, worker kurulumu
├── explorer/        ExplorerView + gezgin gezinme mantığı
├── hud/             CommandHUD + fuzzy filtre
└── theme/           renk tokenları (tokens.css + tema.ts)
```

## 5. Klavye-Öncelikli Etkileşim Modeli

### 5.1 Odak Düzeni

Uygulamada birbiriyle örtüşmeyen odak bölgeleri vardır. Her an yalnızca biri aktif olabilir:

1. Editör (varsayılan)
2. Menü çubuğu (F1 ile gelinir)
3. Komut paleti (Ctrl+I)
4. Dosya gezgini (`tree` komutuyla açılır)

Odak bölgesi değişimi yalnızca komut kaydı üzerinden yapılır; doğrudan DOM `focus()` çağrıları yalnızca bölge içi hareket için kullanılır.

### 5.2 Menü Çubuğu Gezinmesi

- **F1:** Üst butonlara (menü çubuğu odak bölgesine) odaklanır / odaktaysa kapatır.
- **Sol / sağ yön tuşları:** Üst butonlar arasında dolaşır.
- Alt menüler, ilgili butona odak gelince otomatik açılır (fare hover da çalışır; ikincildir).
- **Tab veya yukarı/aşağı yön tuşları:** Açık alt menüdeki öğeler arasında gezinir.
- **Enter:** Öğeyi çalıştırır. **Esc:** Alt menüyü kapatır (adım adım geri çekilir).

### 5.3 Komut Paleti (Ctrl+I)

- **Ctrl+I:** Ekran ortasında arama menüsünü açar.
- Komut adları, dosya adları ve komut kısaltmaları üzerinde fuzzy arama yapılır.
- `tree` yazılıp Enter'a basılınca sol tarafta dosya gezgini açılır ve odak gezgine geçer.
- `:w` gibi kısa komut söz dizimi desteği (kaydetme vb.) aynı paletten sağlanır.

### 5.4 Dosya Gezgini Gezinmesi (ExplorerView)

- Sol panel, **pencere genişliğinin 1/7'si** kadar yer kaplar.
- **F3 veya yön tuşları:** Gezgindeki **klasörler** arasında gezinir.
- **Tab veya yön tuşları:** Gezgindeki **dosyalar** arasında gezinir.
- **Enter:** Dosya → editörde aç; klasör → aç/kapat (genişlet/daralt).
- Gezgin odağı, `tree` komutu sonrası otomatik gezgine devredilir; Esc ile editöre dönülür.

### 5.5 Komut ve Tuş Kaydı

- Her eylem bir **komut**tir (`CommandRegistry`).
- Tuş atamaları **ayrı bir kayıtta** (`Keymap`) tutulur; komutlara keydown olaylarından eşlenir.
- Çakışan atamalar yapılandırma yüklenirken tespit edilir ve raporlanır.
- Kullanıcı tarafından netleştirilecek tuş atamaları TODO.md "Kullanıcı Kararı Bekleyenler" bölümünde listelenir.

## 6. Editör Entegrasyonu (Monaco)

### 6.1 Kurulum ve Worker'lar

- Monaco, Vite tabanlı worker kurulumu ile yüklenir (TypeScript dil hizmeti worker'ı dahil).
- Worker sayısı tekildir (singleton); model başına worker üretilmez.
- Electron renderer'ında çalışan worker'lar, electron-vite'ın dosya protokolü kurallarına uygun şekilde yapılandırılır.

### 6.2 Özel Tema

Tema, ilk `EditorCore` mount edilmeden önce `monaco.editor.defineTheme` ile tanımlanır. Renk tokenları Bölüm 7'de.

### 6.3 Modeller ve Sekmeler

- Her açık sekme bir Monaco modeline karşılık gelir.
- Kapatılan sekmelerin modelleri bellekten düşürülür; yeniden açılırsa diskten yüklenir.
- Açık model sayısı için üst sınır (LRU) uygulanır; sınır aşılınca en az kullanılan model geri yazılır ve kapatılır.

## 7. Görsel Dil

### 7.1 Renk Tokenları

Yalnızca aşağıdaki tokenlar kullanılabilir. Salı bir renk, en az bir belirgin hata anlamı taşır.

| Token              | Değer                       | Kullanım |
|--------------------|-----------------------------|----------|
| `--bg-base`        | `#000000`                   | Uygulama geneli arka plan |
| `--bg-editor`      | `#03050A`                   | Monaco arka planı |
| `--bg-overlay`     | `rgba(0,0,0,0.9)`           | Komut paleti / paneller |
| `--text-primary`   | `#FFFFFF`                   | Düz kod, ana metin |
| `--accent`         | `#00D2FF`                   | Vurgu mavisi: kenarlıklar, anahtar kelimeler, imleç, durum vurguları |
| `--accent-soft`    | `#82AAFF`                   | String ifadeleri |
| `--accent-dim`     | `#4A6B8C`                   | Yorumlar, ikincil bilgi |
| `--selection`      | `rgba(0,85,255,0.4)`        | Metin seçimi arka planı |
| `--line-active`    | `rgba(0,210,255,0.05)`      | Aktif satır vurgusu |
| `--error`          | `#FF5252`                   | **Yalnızca hata**: teşhis kıvrımları, hata pencere/paneller |
| `--border`         | `#00D2FF`                   | Tüm 1px kenarlıklar |

### 7.2 Tipografi

| Font | Alan |
|------|------|
| **JetBrains Mono** (ligatür açık) | Editör, gezgin, menüler |
| **Orbitron** | Durum çubuğu, komut paleti, telemetri göstergeleri |

### 7.3 Sınırlar, Köşeler, Şeffaflık

- Pencereleri ve bölmeleri ayıran çizgiler **1px** kalınlığında vurgu mavisidir.
- Köşeler asla yuvarlatılmaz (`border-radius: 0`).
- Tek pencereli uygulama; Linux kompositor'ü destekliyorsa saydam pencere + `backdrop-filter` ile hafif cam/hologram etkisi; desteklemiyorsa mat siyah zemin (fallback).

### 7.4 Animasyon ve Geri Bildirim

- **Kaydetme:** Dosya kaydedilince pencere/sınır çizgileri kısa süreli mavi "glow" ile parlar.
- **Hata:** Kırmızı renk yalnızca buradadır. Hata oluşursa ilgili panelin çerçevesi kırmızı yanıp söner; editör teşhisleri kırmızı kıvrımlarla gösterilir; durum çubuğunda kırmızı HATA göstergesi belirir.
- **İmleç:** İçi boş (block-outline) vurgu mavisi kutu; hareket sonrası saliselik sönümlenen mavi iz dokusu editör overlay katmanında çizilir.

## 8. Bellek ve Çizim Stratejisi

- **Monaco:** Satır sanallaştırması Monaco'ya bırakılır; biz model sayısını sınırlarız (Bölüm 6.3).
- **Gezgin:** Klasör ağacında isteğe bağlı sanallaştırma; genişletilen düğümler okunduğunda bellekten geçici olarak düşürülebilir.
- **Telemetri:** Main Process örnekleme 1 Hz; renderer tarafında güncellemeler 500 ms'den sık işlenmez; `requestAnimationFrame` ile çizim.
- **React:** Değişmeyen alt ağaçlar `memo` ile korunur; ağır hesaplar `useMemo`/worker'a taşınır.
- Büyük dosyalar (ör. 10 MB+) açılışta yalnızca görünür satırlar çizilir; tam bellek kopyası alınmaz.

## 9. Güvenlik (SAFETY)

1. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — renderer'da Node erişimi yoktur.
2. Tüm dosya erişimi Main Process üzerinden; paths doğrulanır ve normalleştirilir; okuma boyutu sınırlanır.
3. Rayner → Main mesajlarında yalnızca tip kontrollü yükler kabul edilir.
4. Gizli bilgiler (token, şifre) asla loglanmaz ve `window.api` üzerinden dışarı sızdırılmaz.
5. İndex.html'de CSP tanımlanır; yalnızca yerel kaynaklar yüklenir.
6. Harici bağlantılar yalnızca onaylı işlemlerle açılır (ör. yardım dokümanı).
7. Worker'lar yalnızca kendi izole bağlamlarında çalışır, DOM'a erişemez.

## 10. Hata Yönetimi

- Hatalar üç katmanda ele alınır: IPC işlemleri (Main'de yakalanır, tip tanımlı hata nesneleri döner), komut yürütme (renderer), Monaco (editör teşhisleri).
- Kullanıcıya gösterim: durum çubuğunda kırmızı **HATA** göstergesi + ilgili panel çerçevesinde kırmızı yanıp sönme.
- Günlük kaydı yalnızca geliştirme modunda zengin; üretimde sessiz.

## 11. Gelecek Fazlar için Arabirim Kontratları

Aşağıdaki yüzeyler bugünden tiplenir; gerçekleştirme sonraki fazlardadır:

- **Terminal:** `xterm.js` + `node-pty` (Main Process). Kanallar: `pty:spawn`, `pty:kill`, `pty:resize`, `pty:data`. ABI yeniden derlemesi `@electron/rebuild` ile.
- **Yerel yapay zekâ:** `AIStatus = 'idle' | 'computing' | 'error'`; komutlar (chat, inline tamamlama, kod açıklama); model listesi/indirme yüzeyi; ağır işler worker'da. Durum göstergesi StatusBar'a bağlanır.
- **Native çekirdek:** Gelecekte Rust/C++ modülü aynı IPC sözleşmesinin Main tarafını devralabilir; kanal adları korunacak şekilde tasarım yapılır.

## 12. Mimariyi Değiştirmek

Mimariye dokunan her değişiklik önce `DECISIONS.md`'ye ADR olarak işlenir; sonra kod yazılır. Bu sıralama zorunludur.