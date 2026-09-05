# Plan — "Çok Yakında" Temizliği ve Dosya Açıldığında Sekme Görünümü

> **Amaç:** Depoda menülerde / paletde görünen tüm `Yakında` yer tutucularını kaldırmak ve
> **dosya açıldığında sekme (Tab) görünümünü** eksiksiz hâle getirmek.
> Her görev (checkbox) **ayrı bir commit**'tir — commit mesajı Türkçe, conventional style
> (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`). Görev bittiğinde kutucuk `[x]` yapılır.
> Her commit öncesi zorunlu zincir: `npm run typecheck` + `npm run lint` + `npm test` + `npm run build`.

**Okuma sırası (bağlayıcı):** `AGENTS.md` → `ARCHITECTURE.md` → `DECISIONS.md` → `TODO.md` → bu plan.

**Oluşturulma:** 2026-09-05 · İncelenen commit aralığı: `TODO.md` 140 plan / 131 tamam + `src/core/menuCommands.ts:4-142` + `src/menus/menuTree.ts:1-193` + `src/core/instances.ts:40-54`.

---

## 0. Mevcut Durum Analizi (kanıtlı)

### 0.1 "Yakında" nerede çıkıyor?

Rozet `src/menus/MenuPanel.tsx:56-58` içinde `registry.get(item.commandId)?.placeholder === true` ise `Yakında` yazar:

```ts
src/menus/MenuPanel.tsx:57: <span className="menu-panel__soon">Yakında</span>
src/menus/menuModel.ts:95:         menuModel.setFeedback(`Yakında: ${def.title}`);
src/core/menuCommands.ts:6:        error: `Yakında: ${id}`,
```

Tüm komut tohumları `src/core/menuCommands.ts:17-129` içinde tanımlı. `seed.run === undefined` ise `placeholder: true` (`src/core/menuCommands.ts:139`). Sonra `src/core/instances.ts:40-54` sırasıyla **üzerine yazan** gerçek kayıtlar var:

| Tohum (placeholder) | Üzerine yazan gerçek kayıt | Sonuç |
|---|---|---|
| `file.open.file`, `file.save`, `file.save.as`, `file.save.all` | `src/core/fileCommands.ts:104-137` | ✅ gerçek |
| `file.exit` | `src/core/exit.ts:58-68` | ✅ gerçek |
| `edit.undo`, `edit.redo`, `edit.cut/copy/paste`, `edit.comment.*`, `edit.find/replace*`, `selection.*`, `cursor.*` | `src/editor/editorCommands.ts:98-116` | ✅ gerçek |
| `view.fullscreen/zen/wordwrap/clock` | `src/core/viewCommands.ts:5-47` | ✅ gerçek |
| `view.split.*`, `pane.*` | `src/core/paneCommands.ts:19-44` | ✅ gerçek |
| `go.to.*`, `go.back/forward` | `src/core/goCommands.ts:43-107` | ✅ gerçek |
| `bookmark.*` | `src/core/bookmarkCommands.ts:8-61` | ✅ gerçek |
| `terminal.*`, `file.new.terminal` | `src/core/terminalCommands.ts:34-87` | ✅ gerçek |
| `help.welcome/shortcuts/about` | `src/core/helpCommands.ts:12-43` | ✅ gerçek |
| `ai.chat/inline/explain/model.*` | `src/ai/aiCommands.ts:63-184` | ✅ gerçek |
| `edit.undo.tree.view/clean` | `src/core/historyCommands.ts:16-54` | ✅ gerçek |

**Kalan `placeholder: true` (yaklaşık 30 rozet):**

- **Dosya:** `file.new.file`, `file.new.window`, `file.open.folder`, `file.open.recent`, `file.open.recent.none` (`src/menus/menuTree.ts:34-42`, `src/core/menuCommands.ts:19-25`)
- **Düzenle:** `edit.undo.tree` (submenu başlığı — tıklanmaz ama tohum var), `edit.paste.history`, `edit.paste.history.open` (`src/menus/menuTree.ts:57-66`, `src/core/menuCommands.ts:34-41`)
- **Görünüm kenar çubukları:** `view.sidebar.explorer`, `view.sidebar.search`, `view.sidebar.source`, `view.sidebar.run` + `view.layout.single` (`src/menus/menuTree.ts:99-109`, `src/core/menuCommands.ts:60-68`)
- **Çalıştır/Hata ayıklama:** `debug.start`, `debug.breakpoint.toggle`, `debug.continue`, `debug.step.*` (4), `run.without.debug`, `run.last` — 8 adet (`src/menus/menuTree.ts:139-148`, `src/core/menuCommands.ts:85-92`)
- **Yardım:** `help.getting.started`, `help.documentation`, `help.describe`, `help.version`, `help.update`, `help.system.info` — 6 adet (`src/menus/menuTree.ts:167-176`, `src/core/menuCommands.ts:102-110`)
- **AI tercihler:** `ai.prefs` (`src/menus/menuTree.ts:190`, `src/core/menuCommands.ts:118`)
- **Gezgin yardımcı:** `explorer.toggle`, `explorer.refresh`, `view.command.palette` tohumlarının bir kısmı zaten `focusManager`/`palette` ile çalışıyor ama `menuCommands` tohumunda hâlâ placeholder — `src/core/menuCommands.ts:122-125`

> Not: `view.command.palette` gerçekte `focusManager.set('palette')` ile çalışır (`src/core/focus.ts:63-89` üzerinden dolaylı), fakat `menuCommands` tohumu üzerine yazılmadığı için rozet gösterebilir — Faz 17'de netleştirilir.

### 0.2 Sekme (Tab) görünümü — mevcut

- Model: `src/core/tabs.ts:4-85` — `TabsModel` (open/activate/updateContent/close, `activeId`).
- UI: `src/ui/TabBar.tsx:1-45`, `src/layout/AppShell.tsx:74-76`, `src/styles/app.css:40-113`.
  - Satır `src/styles/app.css:63-65` aktif sekme `background: var(--selection)` ile vurgulanır.
  - Kirli nokta `src/ui/TabBar.tsx:28-32` ve `src/core/dirty.ts` üzerinden.
  - Kapat düğmesi `src/ui/TabBar.tsx:33-40` + `src/core/tabCommands.ts:6-11`.
  - Klavye: `src/core/defaultBindings.ts:40-42` → `tab.close` (Ctrl+W), `tab.next` (Ctrl+Tab), `tab.prev` (Ctrl+Shift+Tab) zaten tanımlı.
  - Dosya açma → `src/core/fileCommands.ts:90-102` `adoptFile()` → `tabsModel.open(file)` + `recentFiles.add`.
  - Editör: `src/editor/EditorCore.tsx:112-116` `resolveModel(file)` ile mount.
- Eksikler (kullanıcı isteği "dosya açıldığında sekme görünümü"):
  1. Aktif sekme görsel olarak zayıf (sadece `selection` zemini); üst kenar 1px vurgu mavisi + keskin köşe yok.
  2. Uzantı ikon/renk ayrımı yok (hepsi aynı).
  3. Tam yol tooltip yok.
  4. Taşmada yatay kaydırma + klavye ile görünür kılma yok.
  5. Orta tık / çift tık ile kapatma yok.
  6. Sekme taşıma / sürükle-bırak yok (faz 2).
  7. Pane başına sekme barı yok — hâlâ tek global bar (`AppShell`'de tek `TabBar`); `PaneManager` ile uyumlu değil.
  8. Boş durumda bar yüksekliği korunmuyor / "Dosya seçin" ile çakışıyor.
  9. Dosya gezgininden açılan dosya sonrası odak her zaman editöre dönmüyor (bazı yollarda).

---

## 1. Kurallar ve Kısıtlar

1. **Renk:** yalnızca `ARCHITECTURE.md §7.1` tokenları. Kırmızı yalnızca hata (`--error`). Yeni renk için ADR (`DECISIONS.md`).
2. **Köşe:** her yerde `border-radius: 0` (`src/styles/app.css`, `src/theme/tokens.css`).
3. **Kenarlık:** 1px `var(--border)` (= `--accent` `#00D2FF`).
4. **Tuşlar:** hardcode yok — her eylem `CommandRegistry` (`src/core/commands.ts:21-50`), eşleme `Keymap` (`src/core/keymap.ts`) + `src/core/defaultBindings.ts`. Yeni kısayol → oraya eklenir.
5. **IPC:** yalnızca `window.api` (`electron/preload`, `src/api.d.ts`). Renderer'da `fs/require` yok; `contextIsolation: true`, `sandbox: true` korunur.
6. **Inline style yok:** tüm stiller `tokens.css` / `theme.ts` tokenlarına bağlı.
7. **Klavye akışı fareden bağımsız** olmalı.
8. **Commit disiplini:** her checkbox = tek commit, mesaj Türkçe conventional, önce `typecheck+lint+test+build`.

---

## 2. Faz Planı — Özet Tablo

| Faz | Başlık | Görev sayısı | Durum |
|-----|--------|--------------|-------|
| **A — Sekme Görünümü** | Dosya açıldığında sekme (Tab) | 12 | `[ ]` |
| **B1 — Dosya menüsü** | Yeni Dosya / Yeni Pencere / Klasör Aç | 4 | `[ ]` |
| **B2 — Düzenle** | Yapıştırma geçmişi + geri alma ağacı temizliği | 3 | `[ ]` |
| **B3 — Görünüm** | Kenar çubukları + Tek Pencere | 6 | `[ ]` |
| **B4 — Çalıştır/Debug** | Debug + Run menüsü | 5 | `[ ]` |
| **B5 — Yardım & Sistem** | Yardım ekranları + sistem bilgisi | 5 | `[ ]` |
| **C — Final** | Yakında rozeti tamamen kaldır + test/parlatma | 4 | `[ ]` |
| **Toplam** |  | **39** |  |

---

## 3. Ayrıntılı Görev Listesi

### Faz A — Sekme Görünümü (Dosya açıldığında sekme)

> Hedef: `src/ui/TabBar.tsx`, `src/core/tabs.ts`, `src/core/fileCommands.ts`, `src/editor/EditorCore.tsx`, `src/styles/app.css`, `src/layout/AppShell.tsx` eksiksiz hâle gelir.

- [x] **A1 — Sekme aktif görünümünü güçlendir (üst vurgu + keskin köşe)**
  - Commit: `feat: aktif sekme ust vurgu ve keskin kose stilini ekle`
  - Dosyalar: `src/styles/app.css:54-82`, `src/ui/TabBar.tsx:12-17`
  - İş: `.tab-bar__item--active` için `border-top: 1px solid var(--border)` + `background: var(--bg-editor)` + `border-radius: 0` zaten var; üst vurgu kalınlığı ve aktif metin `var(--accent)` korunur. Hover/focus görünümü token dışı renk kullanmadan düzenlenir. Test: iki dosya aç → aktif sekme üstte mavi çizgi, köşe keskin.
  - Doğrulama: `npm run typecheck && npm run lint && npm test && npm run build`

- [x] **A2 — Sekme tooltip'i: tam yol + kirli durumu**
  - Commit: `feat: sekme tooltipine tam yol ve kirli durumunu ekle`
  - Dosyalar: `src/ui/TabBar.tsx:12-26`, `src/core/tabs.ts:4-7`
  - İş: `title={dirty ? `${path} • Kaydedilmedi` : path}` eklenir. `aria-label` korunur. Uzun yol ellipsis ile kesilir, tooltip'te tam yol görünür.
  - Doğrulama: fareyle sekme üzerine gel → tooltip'te `/home/.../dosya.ts` görünür.

- [x] **A3 — Dosya uzantısına göre ikon/renk ayrımı (token içinde)**
  - Commit: `feat: sekme ikonlarini uzantiya gore renklendir`
  - Dosyalar: `src/ui/TabBar.tsx:1-20`, `src/styles/app.css:54-113`, `src/theme/tokens.css`
  - İş: Metin tabanlı ikon: `TS`/`JS`/`JSON`/`MD` gibi küçük etiket; renkler yalnızca `--accent-soft` (string), `--accent-dim` (yorum), `--accent` (vurgu) arası; yeni renk eklenmez. `getFileIcon(name)` yardımcı fonksiyonu yazılır. ADR gerekmez.
  - Kural: kırmızı yok.

- [x] **A4 — Sekme barı taşma: yatay kaydırma ve klavye ile görünür kılma**
  - Commit: `feat: sekme bari tasmasinda yatay kaydirmayi ekle`
  - Dosyalar: `src/styles/app.css:47-52`, `src/ui/TabBar.tsx`
  - İş: `.tab-bar { overflow-x: auto; scrollbar-width: thin; }` + `scrollbar-color: var(--border) transparent` (token). Aktif sekmeye geçişte `element.scrollIntoView({ block: 'nearest', inline: 'nearest' })` çağrılır (`tabsModel.subscribe` ile). Fare tekerleği yatay değilse dikey → yatay çevrilmez; yalnızca native scroll.
  - Doğrulama: 10 dosya aç → bar taşar, aktif sekme otomatik görünür.

- [x] **A5 — Orta tık ve çift tık ile sekme kapatma**
  - Commit: `feat: orta tik ve cift tik ile sekme kapatmayi ekle`
  - Dosyalar: `src/ui/TabBar.tsx:12-40`, `src/core/tabCommands.ts:6-11`
  - İş: `onMouseDown` → `button === 1` (orta) ise `closeOpenedTab(tab.id)`; `onDoubleClick` → kapat. `onClick` ile çakışma önlenir. Klavye erişimi korunur (Enter ile seç, Ctrl+W ile kapat zaten var).
  - Test: `src/ui/TabBar.test.tsx`'e orta tık testi eklenir.

- [x] **A6 — Sekme barı boş durum yüksekliği ve "Dosya seçin" uyumu**
  - Commit: `fix: bos sekme barinda yukseklik ve placeholder uyumunu duzelt`
  - Dosyalar: `src/styles/app.css:40-46`, `src/editor/EditorCore.tsx:119-123`, `src/layout/AppShell.tsx:74-76`
  - İş: Hiç sekme yokken `TabBar` 32px yüksekliği korur (çökmez); `EditorCore` placeholder'ı barın altındaki workspace'de ortalanır. `min-height: 32px` zaten var — boş durumda `aria-hidden` değil, erişilebilir kalır.

- [x] **A7 — Dosya açıldığında odak editöre geçer + sekme aktifleşir (gezgin/diyalog sonrası)**
  - Commit: `fix: dosya acildiginda odagi editore ve aktif sekmeye tasi`
  - Dosyalar: `src/core/fileCommands.ts:90-102`, `src/core/tabs.ts:29-38`, `src/core/focus.ts:7-43`, `src/ui/ExplorerView.tsx`
  - İş: `adoptFile()` sonrası `focusManager.set('editor')` çağrılır. `tabsModel.open()` zaten `activeId`'yi ayarlar; ek olarak `ExplorerView` Enter akışında da odak transferi doğrulanır (`src/core/explorer.ts` ve `src/ui/ExplorerView.test.tsx` ile uyumlu).
  - Doğrulama: Gezginden Enter ile dosya aç → sekme belirir ve editör yazmaya hazır.

- [x] **A8 — Sekme kapatma sonrası doğru komşuya geçiş (sağ, yoksa sol)**
  - Commit: `fix: sekme kapandiginda komsu sekmeye gecisi duzelt`
  - Dosyalar: `src/core/tabs.ts:56-67`, `src/core/tabCommands.ts:6-11`
  - İş: Mevcut `close()` zaten `tabs[index] ?? tabs[index-1]` mantığında; bu davranış korunur ve testle belgelenir. `dirtyTracker.clearDirty` çağrısı `TabBar` ve `tabCommands`'ta çiftlenmez.
  - Test: ortadaki sekme kapat → sağdaki aktif olur.

- [x] **A9 — Klavye ile sekme geçişi görünür kılma (Ctrl+Tab / Ctrl+Shift+Tab)**
  - Commit: `feat: klavye ile sekme gecisinde otomatik kaydirmayi ekle`
  - Dosyalar: `src/core/tabCommands.ts:26-54`, `src/core/defaultBindings.ts:40-42`, `src/ui/TabBar.tsx`
  - İş: `tab.next` / `tab.prev` sonrası `requestAnimationFrame` içinde aktif sekme `scrollIntoView` ile görünür kılınır. Binding'ler zaten tanımlı — hardcode eklenmez.
  - Test: `src/core/tabCommands.test.ts` genişletilir.

- [x] **A10 — Sekme sağ tık menüsü yer tutucu (gelecek) — şimdilik bilgi feedback'i**
  - Commit: `feat: sekme sag tik menusu icin bilgi geri bildirimini ekle`
  - Dosyalar: `src/ui/TabBar.tsx`, `src/menus/menuModel.ts`
  - İş: Sağ tık → `menuModel.setFeedback('Yakında: sekme menüsü')` yerine gerçek bir context menü iskeleti hazırlanır veya en azından hata göstermeden sessiz kalır. Kırmızı yok. İleride ADR ile genişletilebilir.

- [x] **A11 — TabBar birim testleri: tooltip, taşma, orta tık**
  - Commit: `test: sekme gorunumu testlerini genislet`
  - Dosyalar: `src/ui/TabBar.test.tsx:1-57`
  - İş: Yeni testler: tooltip tam yol içerir, kirli nokta varlığı, orta tık kapatma, aktif sekme sınıfı. `vitest run` yeşil.

- [x] **A12 — Pane başına sekme barı araştırması ve ADR taslağı (opsiyonel, kod yok)**
  - Commit: `docs: pane basina sekme bari icin arastirma notu ekle`
  - Dosyalar: `DECISIONS.md` (yeni D-017 taslağı), bu plan
  - İş: Mevcut global `TabBar` (`AppShell`'de tek) vs pane başına bar seçenekleri karşılaştırılır. Karar verilmezse kod değişmez; yalnızca not eklenir. Bu görev commit gerektirir ama kod zorunlu değil.

---

### Faz B1 — Dosya Menüsü "Yakında" Temizliği

- [x] **B1.1 — Yeni Dosya (file.new.file): boş untitled sekme aç**
  - Commit: `feat: yeni dosya komutunu ekle`
  - Dosyalar: `src/core/fileCommands.ts:104-137`, `src/core/menuCommands.ts:19`, `src/menus/menuTree.ts:34`, `src/core/tabs.ts:29-38`
  - İş: `untitled-${Date.now()}.ts` adında `content: ''`, `language: 'plaintext'` dosya oluştur; `tabsModel.open()` ile sekme aç; `dirtyTracker.markDirty(path)` ile kirli işaretle. `CommandRegistry` üzerine yaz: `file.new.file` gerçek `run`. Rozet kalkar.
  - Doğrulama: Dosya → Yeni Dosya → sekme görünür, adı `untitled-...`, kirli nokta var.

- [x] **B1.2 — Yeni Pencere (file.new.window): Electron yeni pencere**
  - Commit: `feat: yeni pencere komutunu ekle`
  - Dosyalar: `electron/main/window.ts` (BrowserWindow oluşturma), `electron/preload/index.ts` (`window.api.newWindow`), `src/api.d.ts`, `src/core/fileCommands.ts`
  - İş: Main'de `newWindow` IPC kanalı (`app:new-window`) eklenir; `BrowserWindow` aynı ayarlarla (`contextIsolation`, `sandbox`, 1px vurgu mavi kenarlık, `ARCHITECTURE.md §2.1`) açılır. Renderer'dan `window.api.newWindow()` çağrılır. Hata yoksa `ok:true`.
  - Not: IPC kanal adı `ARCHITECTURE.md §3` tablosuna eklenir (doküman güncellemesi bu commit içinde).

- [x] **B1.3 — Klasör Aç (file.open.folder): dialog + gezgin kökünü değiştir**
  - Commit: `feat: klasor ac komutunu ekle`
  - Dosyalar: `electron/main/ipc.ts` (dialog:open-folder zaten varsa bağla), `src/core/fileCommands.ts`, `src/core/explorer.ts`, `src/ui/ExplorerView.tsx`
  - İş: `window.api.openFolder()` → yol alınır; `explorerModel.setRoot(path)` + `fs:read-dir` ile ağaç yenilenir. Gezgin açıksa odak gezgine geçer (`focusManager.set('explorer')`), kapalıysa `tree` komutu gibi açılır (genişlik 1/7, `ARCHITECTURE.md §5.4`). İptalde sessiz `ok:true`.
  - Doğrulama: Dosya → Klasör Aç → dialog → gezgin kökü değişir.

- [x] **B1.4 — Son Kullanılanlar boş durumu: "Kayıt Yok" tıklanamaz ve rozetsiz**
  - Commit: `fix: son kullanilanlar bos durumunu duzelt`
  - Dosyalar: `src/menus/MenuPanel.tsx:11-22`, `src/menus/menuTree.ts:40-42`, `src/core/menuCommands.ts:25`
  - İş: `file.open.recent.none` placeholder kalabilir ama rozet göstermez (separator gibi işlem). `recentFiles.list().length === 0` ise menüde tek satır "Kayıt Yok" gri ve tıklanamaz; `placeholder:false` yapılır. Rozet kalkar.

---

### Faz B2 — Düzenle Menüsü "Yakında" Temizliği

- [x] **B2.1 — Yapıştırma Geçmişi paneli (edit.paste.history / edit.paste.history.open)**
  - Commit: `feat: yapistirma gecmisi panelini ekle`
  - Dosyalar: `src/core/clipboardHistory.ts` (yeni), `src/core/fileCommands.ts` benzeri, `src/editor/EditorCore.tsx`, `src/menus/menuTree.ts:65-66`
  - İş: Basit ring buffer (son 20 kopyala). `edit.copy/cut` sonrası `navigator.clipboard.readText()` ile doldurulur (Electron clipboard API Main'den de yapılabilir; önce renderer denemesi, izin yoksa Main IPC `clipboard:read`). Palet üzerinden `paletteModel.showClipboardHistory()` ile listelenir; Enter ile editöre yapıştırılır. `placeholder:false`.
  - Kural: kırmızı yok, tokenlar korunur.

- [x] **B2.2 — Geri Alma Ağacı başlığı: submenu rozetini kaldır**
  - Commit: `fix: geri alma agaci submenu rozetini kaldir`
  - Dosyalar: `src/core/menuCommands.ts:34`, `src/menus/menuTree.ts:57-60`, `src/menus/MenuPanel.tsx:56-58`
  - İş: `edit.undo.tree` bir **submenu**'dür, komut değil; `SEEDS` içindeki `edit.undo.tree` tohumu `placeholder:false` yapılır veya tamamen kaldırılır (alt öğeleri `view/clean` zaten gerçek). Menüde rozet görünmez. Doğrulama: Düzenle → Geri Alma Ağacı → rozet yok, alt menüde "Ağacı Görüntüle" / "Dalları Temizle" çalışır.

- [x] **B2.3 — Düzenle menüsü test güncellemesi**
  - Commit: `test: duzenle menusu yakinda temizligini test et`
  - Dosyalar: `src/menus/MenuBar.test.tsx:65-71`, `src/menus/menuTree.test.ts`, `src/core/navCommands.test.ts:138-142`
  - İş: `Yakında` rozeti sayım testi güncellenir: `edit.paste.history*` artık rozet taşımaz. `file.new.file` gibi yeni gerçek komutlar da rozetsiz sayılır.

---

### Faz B3 — Görünüm Menüsü "Yakında" Temizliği

- [x] **B3.1 — Gezgin kenar çubuğu toggle (view.sidebar.explorer)**
  - Commit: `feat: gezgin kenar cubugu toggle komutunu ekle`
  - Dosyalar: `src/core/explorer.ts`, `src/core/focus.ts:63-89`, `src/menus/menuTree.ts:99`, `src/core/menuCommands.ts:60`
  - İş: `explorer.toggle` zaten `src/core/menuCommands.ts:123` tohumunda var ama placeholder; `view.sidebar.explorer` id'si üzerine gerçek `run` yazılır: açıksa kapat (`explorerModel.close()`), kapalıysa aç (`setRoot` + `focusManager.set('explorer')`). Rozet kalkar. `view.command.palette` ile çakışma yok.

- [x] **B3.2 — Arama Paneli (view.sidebar.search) — iskelet panel**
  - Commit: `feat: arama paneli iskeletini ekle`
  - Dosyalar: `src/ui/SearchPanel.tsx` (yeni), `src/layout/AppShell.tsx:78`, `src/menus/menuTree.ts:100`, `src/styles/app.css`
  - İş: Basit iskelet: input + "Yakında: tam metin arama" yerine gerçek iskelet metni "Arama (Find) — çok yakında tam" değil, **gerçek** filtre: açık dosyalar içinde `fuzzy` arama (`src/core/fuzzy.ts` reuse). Sonuçlar palet gibi listelenir; Enter ile dosyada o satıra atlar. Tokenlar, keskin köşe, 1px mavi çerçeve korunur. Rozet kalkar.

- [x] **B3.3 — Kaynak Kontrolü (view.sidebar.source) — git branch + durum iskeleti**
  - Commit: `feat: kaynak kontrolu panel iskeletini ekle`
  - Dosyalar: `src/ui/SourcePanel.tsx` (yeni), `electron/main/git.ts`, `src/core/gitModel.ts`, `src/menus/menuTree.ts:101`
  - İş: `git:branch` (`ARCHITECTURE.md §3`) verisini gösterir; değişiklik dosyaları `git status --porcelain` (Main'de `child_process`) ile listelenir. Yoksa "Git deposu değil" bilgisi — kırmızı değil, `var(--accent-dim)` ile. Rozet kalkar.

- [x] **B3.4 — Çalıştır Paneli (view.sidebar.run) — görev listesi iskeleti**
  - Commit: `feat: calistir paneli iskeletini ekle`
  - Dosyalar: `src/ui/RunPanel.tsx` (yeni), `src/core/taskModel.ts`, `src/menus/menuTree.ts:102`
  - İş: `COMMON_TASKS` (`src/core/terminalCommands.ts:6-12`) listesi buton olarak gösterilir; tıklayınca `writeToActiveTerminal` ile çalışır. Rozet kalkar.

- [x] **B3.5 — Tek Pencere (view.layout.single): bölmeleri kapat**
  - Commit: `feat: tek pencere duzenine don komutunu ekle`
  - Dosyalar: `src/core/panes.ts`, `src/core/paneCommands.ts:19-44`, `src/menus/menuTree.ts:104`
  - İş: `panesModel.reset()` veya `panesModel.closeAllExceptActive()` ile tüm bölmeler tek pane'e indirilir. `view.split.*` ile simetrik. Rozet kalkar.

- [x] **B3.6 — Görünüm menüsü bağlama testi**
  - Commit: `test: gorunum menusu komutlarini test et`
  - Dosyalar: `src/menus/MenuBar.test.tsx`, `src/core/viewCommands.test.ts`
  - İş: 5 yeni komutun `placeholder === false` olduğu ve `registry.run`'ın `ok:true` döndürdüğü doğrulanır.

---

### Faz B4 — Çalıştır / Hata Ayıklama "Yakında" Temizliği

- [x] **B4.1 — Hata Ayıklamayı Başlat / Kesme Noktası (debug.start, debug.breakpoint.toggle)**
  - Commit: `feat: hata ayiklama iskelet komutlarini ekle`
  - Dosyalar: `src/core/debugModel.ts` (yeni), `src/menus/menuTree.ts:139-140`, `src/core/menuCommands.ts:85-86`
  - İş: Gerçek debugger yok; iskelet: `debug.start` → `StatusBar`'da `IDLE → COMPUTING` kısa animasyon + `ErrorIndicator` değil, `paletteModel` üzerinden "Hata ayıklama çok yakında — yapılandırma bekleniyor" bilgisi. `breakpoint.toggle` → `bookmarkModel` benzeri `breakpointModel` ile satırda glyph ekler (`editor.glyphMargin`). Rozetler kalkar ama işlev iskelettir — ADR D-011 gibi dokümante edilir.

- [x] **B4.2 — Adım komutları (debug.continue, step.over/into/out)**
  - Commit: `feat: adim komutlari iskeletini ekle`
  - Dosyalar: `src/core/debugModel.ts`, `src/menus/menuTree.ts:142-145`, `src/core/menuCommands.ts:87-90`
  - İş: `debugModel.step()` çağrıları; henüz motor yoksa `ok:false, error: 'Hata ayıklama motoru bağlı değil'` döner ve `ErrorIndicator` kırmızı yanıp söner (`ARCHITECTURE.md §7.4`) — kırmızı yalnızca burada kullanılır. Rozet kalkar.

- [x] **B4.3 — Hata Ayıklamadan Çalıştır / Son Çalıştırmayı Tekrarla (run.without.debug, run.last)**
  - Commit: `feat: calistirma komutlari iskeletini ekle`
  - Dosyalar: `src/core/taskModel.ts`, `src/menus/menuTree.ts:147-148`, `src/core/menuCommands.ts:91-92`
  - İş: `run.without.debug` → `terminalModel.open()` + `taskModel.runLastOrDefault('npm run dev')`; `run.last` → `terminalCommands`'taki `run.last` ile birleştirilir (duplicate id çözülür). Rozet kalkar.

- [x] **B4.4 — Terminal yeni/böl/kapat zaten gerçek — menü rozeti doğrulaması**
  - Commit: `fix: terminal menu rozetlerini dogrula`
  - Dosyalar: `src/menus/menuTree.ts:155-157`, `src/core/terminalCommands.ts:34-61`, `src/core/menuCommands.ts:95-97`
  - İş: `terminal.new/split/kill` zaten gerçek; eğer `menuCommands` tohumu hâlâ placeholder ise üzerine yazıldığı doğrulanır ve testte rozet sayısından düşülür. Kod değişmeyebilir, test düzeltmesi yeter.

- [x] **B4.5 — Çalıştır menüsü testleri**
  - Commit: `test: calistir debug komutlari testlerini ekle`
  - Dosyalar: `src/menus/menuBar.test.tsx`, yeni `src/core/debugModel.test.ts`
  - İş: 8 komutun rozetsiz olduğu ve `run`'ın beklenen `ok` döndürdüğü test edilir.

---

### Faz B5 — Yardım & Sistem "Yakında" Temizliği

- [x] **B5.1 — Başlangıç / Dokümantasyon (help.getting.started, help.documentation)**
  - Commit: `feat: baslangic ve dokumantasyon yardim ekranlarini ekle`
  - Dosyalar: `src/core/helpModel.ts`, `src/ui/HelpOverlay.tsx`, `src/styles/help.css`, `src/menus/menuTree.ts:168-169`, `src/core/menuCommands.ts:103-104`
  - İş: `helpModel`'e `getting-started` ve `documentation` screen'leri eklenir; `HelpOverlay`'da markdown benzeri statik içerik (kurulum, klavye akışları, `ARCHITECTURE.md §5` özet). `focusManager.set('help')` ile açılır, Esc ile kapanır (`src/core/defaultBindings.ts:50`). Rozet kalkar.

- [x] **B5.2 — Fonksiyonu Tanımla (help.describe) — editör sembol açıklaması**
  - Commit: `feat: fonksiyon tanimla komutunu ekle`
  - Dosyalar: `src/core/helpCommands.ts:12-43`, `src/editor/editorCommands.ts`, `src/menus/menuTree.ts:171`
  - İş: `help.describe` → `editor.action.quickOutline` veya `editor.action.showHover` tetikler (`src/core/goCommands.ts:31-41` benzeri `withSnapshot`). Editör yoksa `ok:false`. Rozet kalkar.

- [x] **B5.3 — Sürüm / Paketleri Güncelle / Sistem Bilgisi (help.version, help.update, help.system.info)**
  - Commit: `feat: surum ve sistem bilgisi komutlarini ekle`
  - Dosyalar: `src/core/helpCommands.ts`, `src/core/telemetry.ts`, `electron/main/sys.ts`, `src/menus/menuTree.ts:173-176`
  - İş: `help.version` → `package.json:version` IPC (`app:version`) ile gösterilir; `help.system.info` → `telemetry` snapshot + `os.platform()` bilgisi `HelpOverlay`'da; `help.update` → `npm run build` / `git pull` bilgilendirmesi (gerçek güncelleme yok, bilgi feedback'i). Rozetler kalkar.

- [x] **B5.4 — Yapay Zekâ Tercihleri (ai.prefs)**
  - Commit: `feat: yapay zeka tercihleri komutunu ekle`
  - Dosyalar: `src/ai/aiCommands.ts:63-184`, `src/core/menuCommands.ts:118`, `src/menus/menuTree.ts:190`
  - İş: `ai.prefs` → `AIChatPanel` içinde ayarlar sekmesi (model seçimi, sıcaklık) veya `HelpOverlay` benzeri basit panel. En azından `paletteModel.showModels` + bilgi mesajı. Rozet kalkar.

- [ ] **B5.5 — Explorer yardımcı komutlar (explorer.toggle/refresh, view.command.palette)**
  - Commit: `fix: gezgin yardimci komutlarinin rozetlerini kaldir`
  - Dosyalar: `src/core/menuCommands.ts:122-125`, `src/core/focus.ts`, `src/core/explorer.ts`
  - İş: `explorer.toggle` → `view.sidebar.explorer` ile aynı toggle'a bağlanır; `explorer.refresh` → `fs:read-dir` yeniden çağırır; `view.command.palette` → `paletteModel.toggle()` gerçek. Üçü de `placeholder:false` yapılır.

---

### Faz C — Final Temizlik ve Parlatma

- [ ] **C1 — "Yakında" rozeti tamamen kalktı mı? — kapsamlı tarama ve temizlik**
  - Commit: `refactor: yakinda rozetini tamamen kaldir`
  - Dosyalar: `src/menus/MenuPanel.tsx:56-58`, `src/styles/app.css:502-511`, `src/core/menuCommands.ts:4-7`
  - İş: `MenuPanel`'de `.menu-panel__soon` stili korunabilir ama hiçbir komut `placeholder:true` kalmayana kadar rozet görünmez. Tarama: `rg -n "placeholder.*true" src/` 0 sonuç beklenir (veya yalnızca testlerde). `PLACEHOLDER` helper'ı (`src/core/menuCommands.ts:4-7`) artık kullanılmıyorsa kaldırılır veya yalnızca bilinmeyen id fallback'i olarak tutulur.

- [ ] **C2 — Renk / köşe / IPC denetimi (ARCHITECTURE §7, §9)**
  - Commit: `chore: renk kose ve ipc kurallarini denetle`
  - İş: `rg -n "border-radius" src/` → yalnızca `0` olmalı; `rg -n "#[0-9a-fA-F]{3,6}" src/styles` → yalnızca tokenlar; `rg -n "window\.api" src/` → tüm IPC `window.api` üzerinden. İhlal varsa düzeltilir. `npm run lint` temiz.

- [ ] **C3 — Klavye akışları uçtan uca test: F1 / Ctrl+I / tree / F3/Tab / sekme / Esc**
  - Commit: `test: klavye akislarini ucten uca test et`
  - Dosyalar: `src/ui/paletteFlow.test.tsx`, `src/ui/ExplorerView.test.tsx`, `src/menus/MenuBar.test.tsx`, `src/ui/TabBar.test.tsx`, `src/core/focus.test.ts`
  - İş: Senaryolar: `F1 → sol/sağ → Tab → Enter → feedback`, `Ctrl+I → tree → gezgin 1/7 + odak`, `F3/Tab ile gezinme`, `Ctrl+Tab sekme geçişi`, `Esc ile geri dönüş`. Kırmızı yalnızca hata durumunda.

- [ ] **C4 — Üretim paketi doğrulaması ve doküman güncellemesi**
  - Commit: `chore: uretim paketini ve dokumani guncelle`
  - Dosyalar: `TODO.md`, `ARCHITECTURE.md §3` (IPC tablosu), `DECISIONS.md` (yeni ADR'ler), `README.md`
  - İş: `npm run typecheck && npm run lint && npm test && npm run build` yeşil. `TODO.md`'de ilgili Faz kutucukları `[x]` yapılır. `ARCHITECTURE.md` IPC tablosuna `app:new-window`, `app:version`, `clipboard:read` gibi yeni kanallar eklenir (eklendiyse).

---

## 4. Uygulama Notları

- **Sıra önerisi:** A (sekme) → B1 → B2 → B3 → B4 → B5 → C. A ve B1 paralel de yapılabilir ama her görev tek commit olduğu için sıra korunmalı.
- **Her commit şablonu:**
  ```bash
  export PATH="$HOME/node/bin:$PATH"
  npm run typecheck && npm run lint && npm test && npm run build
  git add <ilgili dosyalar>
  git commit -m "feat: <Türkçe açıklama>"
  # sonra TODO.md / bu plandaki kutucuğu [x] yap (ayrı commit değil, aynı commit içinde)
  ```
- **Görsel doğrulama:** `npm run dev` ile pencere açılır; siyah zemin, 1px vurgu mavisi çerçeve, keskin köşeler korunur. Sekme barı 1px alt sınır `var(--border)` ile ayrılır.
- **Geri alma:** Herhangi bir fazda `rg -n "Yakında" src/` ile kalan rozetler sayılabilir; hedef C1 sonrası 0.

---

## 5. Kabul Kriterleri (Definition of Done)

- [ ] Hiçbir menü öğesinde `Yakında` rozeti görünmüyor; `src/menus/MenuPanel.tsx:57` satırı tetiklenmiyor.
- [ ] Dosya açıldığında (`Dosya Aç`, `Klasör Aç → dosya seç`, `Gezgin Enter`, `Son Kullanılanlar`) sekme barında yeni sekme beliriyor, aktif vurgu mavi, tooltip tam yol, kirli nokta çalışıyor.
- [ ] Sekme barı taşınca yatay kaydırma var; Ctrl+Tab / Ctrl+Shift+Tab ile sekme değişimi görünür kılıyor; Ctrl+W / orta tık / çift tık kapatıyor.
- [ ] Tüm yeni komutlar `CommandRegistry`'de, tuşlar `Keymap`'te, IPC `window.api` üzerinden.
- [ ] `npm run typecheck`, `lint`, `test`, `build` hatasız.
- [ ] `TODO.md` ve bu plandaki kutucuklar işaretli, her görev ayrı commit ile geçmişte.

---

## 6. Dosya Etki Haritası

| Alan | Dosyalar |
|------|----------|
| Sekme UI | `src/ui/TabBar.tsx:1-45`, `src/styles/app.css:40-113`, `src/layout/AppShell.tsx:74-76` |
| Sekme mantığı | `src/core/tabs.ts:4-85`, `src/core/tabCommands.ts:1-54`, `src/core/dirty.ts`, `src/core/defaultBindings.ts:40-42` |
| Dosya akışları | `src/core/fileCommands.ts:90-137`, `src/core/explorer.ts`, `src/ui/ExplorerView.tsx:1-*` |
| Menü | `src/menus/menuTree.ts:1-193`, `src/menus/MenuPanel.tsx:56-58`, `src/menus/MenuBar.tsx` |
| Komut tohumları | `src/core/menuCommands.ts:4-142` |
| Görünüm/panel | `src/layout/AppShell.tsx`, `src/ui/SearchPanel.tsx` (yeni), `src/ui/SourcePanel.tsx` (yeni), `src/ui/RunPanel.tsx` (yeni) |
| Debug iskelet | `src/core/debugModel.ts` (yeni), `src/editor/EditorCore.tsx` |
| Yardım | `src/core/helpModel.ts`, `src/ui/HelpOverlay.tsx`, `src/styles/help.css` |
| IPC/Main | `electron/main/ipc.ts`, `electron/preload/index.ts`, `src/api.d.ts`, `ARCHITECTURE.md:56-75` |

---

> **Son adım:** Bu plan `TODO.md`'ye ek bir faz olarak taşınabilir veya bağımsız kalabilir. Her görev bittiğinde buradaki kutucuk da `[x]` yapılır ve commit mesajı yukarıdaki listeyle birebir aynı kullanılır.
