# Plan — Git Sekmesi Kusursuz (Code-benzeri: commit / push / çakışmasız) + Her Görev Ayrı Commit

> **Amaç:** Uygulama içi Git (uygulamanın git'i — VS Code'daki gibi) sekmesini kusursuz hâle getirmek: branch / status / diff / stage / commit / push / pull / çakışma çözümü, kod'daki gibi, çakışmasız. Her görev (her checkbox) **ayrı bir commit**'tir — commit mesajı Türkçe, conventional (`feat:`, `fix:`, `test:`, `chore:`), önce `typecheck + lint + test + build` yeşil, sonra `git add` + `commit`, kutucuk `[x]`. `AGENTS.md → ARCHITECTURE.md → DECISIONS.md → TODO.md → PLAN_YAKINDA_VE_SEKME.md` kuralları bağlayıcı.

**Kapsam:** Önceki plan (`PLAN_YAKINDA_VE_SEKME.md` `v0.2.0` `eff0a78` 39/39) üzerine; bu plan `v0.3.0` hedefler. “Git sekmesi de olsun (uygulama olan git) commit atma push falan vs code'da ki gibi” doğrudan karşılanır.

**Durum (kanıtlı):**
- Mevcut iskelet: `src/core/viewCommands.ts:82-96` `view.sidebar.source` sadece `window.api.gitBranch` palet; `electron/main/gitHandlers.ts:1-*` `git:branch` tek kanal; `src/layout/AppShell.tsx:74-78` tek `ExplorerView`, Git paneli yok; `src/menus/menuTree.ts:99-102` `Kaynak Kontrolü` iskelet; `ARCHITECTURE.md §3` IPC tablosunda `git:branch` tek satır.
- Önceki faz: `DECISIONS.md D-017` pane başı sekme taslak; bu planda Git sekmesi kendi paneli olarak eklenir, sekme/pane ile çakışmaz.

---

## 0. Kurallar (Sert — çakışmasız kusursuz)

1. **Renk:** `ARCHITECTURE.md §7.1` tokenlar; kırmızı yalnızca hata (`--error`); `border-radius:0`; `1px var(--border)`.
2. **Tuş:** hardcode yok — `CommandRegistry` (`src/core/commands.ts:21-50`) + `Keymap` (`src/core/keymap.ts` + `src/core/defaultBindings.ts`). Yeni kısayol → Keymap.
3. **IPC:** yalnızca `window.api` (`electron/preload/index.ts:1-*`, `src/api.d.ts:1-*`, `electron/shared/api-types.ts:1-*`); `contextIsolation:true`, `sandbox:true`; `fs`/`child_process` yalnızca Main.
4. **Klavye önceli:** her Git akışı fare olmadan: F1 menü, Ctrl+I palet, Explorer gibi `Tab / yön` ile listede gezinme, Enter stage/commit, Esc kapanış.
5. **Çakışmasız:** her commit öncesi `git status` temiz, `git fetch` arka planda; `push` öncesi `pull --rebase` denetimi; çakışma çıkarsa panelde net uyarı + `Durum Çubuğu` kırmızı olmadan `var(--accent-dim)` ile.
6. **Commit disiplini:** `typecheck:node+web` + `lint` + `test` + `build` → `git add <dar>` → `git commit -m "…"` → kutucuk `[x]` + `PLAN_GIT_KUSURSUZ.md` güncelleme aynı committe.

---

## 1. Faz Özet Tablosu

| Faz | Başlık | Görev | Durum |
|-----|--------|-------|-------|
| **G0** | Hazırlık — IPC & Model | 4 | `[ ]` |
| **G1** | Git Durum — branch/status/diff iskeleti | 5 | `[ ]` |
| **G2** | Git Sekmesi — UI (VS Code benzeri) | 6 | `[ ]` |
| **G3** | Code-benzeri akış — stage / commit / push / pull | 6 | `[ ]` |
| **G4** | Çakışmasızlık, test, build, doküman & tag `v0.3.0` | 4 | `[ ]` |
| **Toplam** | | **25** | |

---

## 2. Ayrıntılı Görev Listesi — Her Satır Ayrı Commit

### Faz G0 — Hazırlık (IPC & Model) — çakışmasız temel

- [x] **G0.1 — IPC sözleşmesi genişletme (branch/status/diff/log/commit/push/pull)**
  - Commit: `feat: git ipc kanallarini genislet`
  - Dosyalar: `electron/shared/api-types.ts:1-72` (`Api` tipine `gitStatus`, `gitDiff`, `gitLog`, `gitCommit`, `gitPush`, `gitPull`, `gitCheckout` ekle), `electron/preload/index.ts:12-49` (`window.api.gitStatus` vb.), `electron/main/gitHandlers.ts:1-*` (her kanal `ipcMain.handle`, yol doğrulama `fileUtils.ts`, `child_process.execFile` ile `git` çağrıları, 10MB limit), `ARCHITECTURE.md §3:64-70` tabloya 7 satır ekle.
  - Kabul: `rg "git:" electron` 8 kanal listeler, `typecheck` yeşil, `window.api` dışında `fs` yok.

- [x] **G0.2 — Git model çekirdeği (branch + status + diff + log tipleri)**
  - Commit: `feat: git model cekirdegini kur`
  - Dosyalar: `src/core/gitModel.ts` (yeni) — `GitBranchInfo` (`src/api.d.ts:16-19`), `GitFile {path,status: 'M'|'A'|'D'|'?'|'!'}`, `GitDiff`, `GitLogEntry`; `ExplorerModel` benzeri `GitModel` (state: `branch`, `files`, `staged:Set`, `loading`, `error`, `lastCommit`), `subscribe/emit` (`src/core/explorer.ts:47-59` deseni).
  - Kabul: `src/core/gitModel.test.ts` (yeni) durum geçişleri yeşil.

- [x] **G0.3 — Git IPC hata yönetimi & güvenlik (yol normalize, boyut limiti, gizli bilgi sızdırmama)**
  - Commit: `fix: git ipc guvenlik ve hata yonetimini ekle`
  - Dosyalar: `electron/main/gitHandlers.ts` (her handler `try/catch`, `reportError` değil `return {ok:false,error}`), `electron/main/fileUtils.ts` (yol `path.resolve` + `app` kökü dışına çıkma engeli), `ARCHITECTURE.md §9` uyumu, loglarda token yok (`AGENTS.md §4.10`).
  - Kabul: `git:branch` yoksa `null`, `git:status` depo değilse `{ok:false}` → StatusBar kırmızı değil `var(--accent-dim)` (`src/styles/app.css`).

- [x] **G0.4 — Keymap & CommandRegistry iskeleti (Git palet & kısayollar)**
  - Commit: `feat: git komut kaydi ve tus eslemelerini ekle`
  - Dosyalar: `src/core/defaultBindings.ts:1-71` (yeni `git.stage`, `git.unstage`, `git.commit`, `git.push`, `git.pull` zone `git`), `src/core/gitCommands.ts` (yeni) iskelet `CommandRegistry` kayıtları (placeholder değil, `ok:true` iskelet döner), `src/core/instances.ts:30-56` `registerGitCommands`.
  - Kabul: `rg "git\." src/core/defaultBindings.ts` 5 eşleme, `typecheck` yeşil.

### Faz G1 — Git Durum (branch / status / diff) — okunur, çakışmasız

- [x] **G1.1 — Branch göstergesi + StatusBar entegrasyonu (gerçek `git branch --show-current`)**
  - Commit: `feat: git branch gostergesini gercek veriye bagla`
  - Dosyalar: `src/ui/StatusBar.tsx:14-*` `useGitBranch` zaten `window.api.gitBranch`; `electron/main/gitHandlers.ts` `git:branch` gerçek `execFile('git', ['branch','--show-current'])` + `dirty` için `git status --porcelain` bayrağı; `src/core/gitModel.ts` `branch` state'i.
  - Kabul: repo içinde branch adı, dirty ise `• değişik` rozeti `var(--accent)`; repo değilse gizli (kırmızı yok).

- [x] **G1.2 — Dosya durumu listesi (`git status --porcelain`) — M/A/D/?**
  - Commit: `feat: git status dosya listesini ekle`
  - Dosyalar: `src/core/gitModel.ts` `loadStatus(cwd, api.gitStatus)`; `electron/main/gitHandlers.ts` `git:status` handler (`git status --porcelain -uall`), parser `M `, `??` vb. → `GitFile`; `src/menus/menuTree.ts:99-102` `Kaynak Kontrolü` artık gerçek listeyi tetikler.
  - Kabul: `src/core/gitModel.test.ts` porcelain parse yeşil; `paletteFlow` benzeri testte status listesi görünür.

- [x] **G1.3 — Diff önizleme (`git diff --unified`) — iskelet diff view**
  - Commit: `feat: git diff onizlemesini ekle`
  - Dosyalar: `src/core/gitCommands.ts` `git.diff` komutu `window.api.gitDiff(path)` → `paletteModel.showFiles` veya yeni `DiffPanel` iskeleti (`src/ui/DiffView.tsx` yeni, `tokens.css` tokenlar, `border-radius:0`); `electron/main/gitHandlers.ts` `git:diff` handler.
  - Kabul: Dosya seç → Enter → diff paletinde `+`/`-` satırları `var(--accent-soft)`/`var(--accent-dim)` (kırmızı yok).

- [x] **G1.4 — Log listesi (`git log --oneline -20`) — son commitler**
  - Commit: `feat: git log listesini ekle`
  - Dosyalar: `src/core/gitCommands.ts` `git.log` → `window.api.gitLog`; `electron/main/gitHandlers.ts` `git:log`; `src/ui/GitPanel.tsx` (yeni) log sekmesi iskeleti.
  - Kabul: `Ctrl+I` → `git log` → liste, Enter commit detay.

- [ ] **G1.5 — G1 testleri (branch/status/diff/log)**
  - Commit: `test: git durum testlerini ekle`
  - Dosyalar: `src/core/gitModel.test.ts`, `src/core/gitCommands.test.ts` (yeni), `electron/main/gitHandlers.test.ts` (yeni, `execFile` mock).
  - Kabul: `npm test` yeşil, `rg "git:"` IPC mock'ları ile.

### Faz G2 — Git Sekmesi UI (VS Code benzeri, 1/7 değil 1/5 genişlikte sol panel)

- [ ] **G2.1 — GitPanel iskeleti (sol panel, 1/5 genişlik, 1px mavi sınır, keskin köşe)**
  - Commit: `feat: git panel iskeletini ciz`
  - Dosyalar: `src/ui/GitPanel.tsx` (yeni, `ExplorerView` `src/ui/ExplorerView.tsx:1-*` desenini takip: `useGitPanelState`, `gitModel.subscribe`), `src/styles/app.css:115-130` `.git-panel` (genişlik `20%`, `border-right:1px solid var(--border)`, `background:var(--bg-base)`), `src/layout/AppShell.tsx:74-82` `ExplorerView` yanına `GitPanel` (koşullu `gitPanelOpen`).
  - Kabul: `Görünüm → Kaynak Kontrolü` (`view.sidebar.source` `src/core/viewCommands.ts:82-96`) GitPanel açar, `F1` menüden de erişilir, `Esc` editöre döner.

- [ ] **G2.2 — GitPanel bölümlemesi (Değişiklikler / Staged / Branch / Log)**
  - Commit: `feat: git panel bolumlerini ekle`
  - Dosyalar: `src/ui/GitPanel.tsx` bölümler: `Değişiklikler` (unstaged), `Hazırlanan` (staged), `Branch: <ad>` başlık, `Log` alt liste; her bölüm `1px var(--border)` ayraç, `JetBrains Mono` + `Orbitron` başlık; `src/styles/git.css` (yeni, tokenlar).
  - Kabul: Boş repo “Değişiklik yok” `var(--accent-dim)` ile, 4 bölüm görünür.

- [ ] **G2.3 — Dosya satırları — M/A/D rozeti + stage toggle**
  - Commit: `feat: git dosya satirlarini ve stage toggle ekle`
  - Dosyalar: `src/ui/GitPanel.tsx` satır: `M` `var(--accent)`, `A` `var(--accent-soft)`, `D` `var(--error)` yalnızca silinende (kırmızı yalnızca hata — silme hata değil ama `ARCHITECTURE.md §7.1` istisnası: silme rozeti `var(--accent-dim)` kullanılır, kırmızı yok), `?` `var(--accent-dim)`; satır tıklama → diff, `+` butonu → `git add` (`window.api.gitAdd`).
  - Kabul: `Tab / yön` ile dosyalar arası gezinme (`ExplorerView` gibi `F3/Tab` değil, `Tab/yön` — `AGENTS.md §3` klavye kuralı), `Enter` stage/unstage.

- [ ] **G2.4 — Klavye gezinmesi (git zone) + odak yönetimi**
  - Commit: `feat: git panel klavye gezinmesini ekle`
  - Dosyalar: `src/core/defaultBindings.ts` `zone:'git'` için `git.next` (`Tab`), `git.prev` (`Shift+Tab`), `git.up`/`down` (`ArrowUp/Down`), `git.stage` (`Enter`/`Space`), `git.commit` (`Ctrl+Enter`), `git.push` (`Ctrl+Shift+P` benzeri ama çakışmasız — `Keymap` çakışma tespiti `src/core/keymap.ts` yeşil); `src/core/focus.ts:7-43` `FocusZone` `'git'` ekle (`src/core/types.ts:84`).
  - Kabul: `F1` → `Görünüm → Kaynak Kontrolü` → odak `git`, `Tab` dosyalar, `Ctrl+Enter` commit, `Esc` editöre döner, fare olmadan tümü.

- [ ] **G2.5 — Boş / yükleme / hata durumları (siyah, mavi, kırmızı hata yalnızca)**
  - Commit: `fix: git panel bos yukleme hata durumlarini duzelt`
  - Dosyalar: `src/ui/GitPanel.tsx` `loading` → `...` `var(--accent-soft)` `Orbitron`; `error` → `1px solid var(--error)` panel (`src/styles/app.css:247-254` benzeri), `StatusBar` kırmızı rozet (`src/ui/StatusBar.tsx:1-*`) yalnızca gerçek hata; `src/styles/app.css` `min-height` korunur (`src/styles/app.css:40-45` gibi).
  - Kabul: Depo değilse “Git deposu değil” `var(--accent-dim)`, yüklenirken spinner yok, metin tabanlı.

- [ ] **G2.6 — GitPanel AppShell entegrasyonu + `tree` benzeri `git` palet komutu**
  - Commit: `feat: git paneli appshell ve palet entegrasyonunu ekle`
  - Dosyalar: `src/layout/AppShell.tsx` `useGitPanelState`, `src/core/palette.ts` `showGitStatus`, `src/core/navCommands.ts` `git` alias (`git`, `status`); `src/hud/CommandHUD.tsx` fuzzy `git` → GitPanel.
  - Kabul: `Ctrl+I` → `git` → Enter GitPanel açılır, odak `git`.

### Faz G3 — Code-benzeri akış (stage / unstage / commit / push / pull, çakışmasız)

- [ ] **G3.1 — Stage / Unstage (git add / restore --staged)**
  - Commit: `feat: git stage unstage komutlarini ekle`
  - Dosyalar: `src/core/gitCommands.ts` `git.stage`/`git.unstage` → `window.api.gitAdd`/`gitRestore`; `electron/main/gitHandlers.ts` `git:add`, `git:restore`; `src/ui/GitPanel.tsx` `+`/`−` butonları + `Enter` toggle; `src/core/gitModel.ts` `staged` seti.
  - Kabul: `git status` sonrası staged/unstaged ayrımı doğru, `Tab` ile seç → `Enter` → liste yer değiştirir, `dirtyTracker` ile çakışmaz.

- [ ] **G3.2 — Commit (mesaj kutusu, author, boş mesaj engeli)**
  - Commit: `feat: git commit akisini ekle`
  - Dosyalar: `src/ui/GitPanel.tsx` alt `Commit` kutusu (`textarea`, `JetBrains Mono`, `1px var(--border)`, `border-radius:0`, placeholder “Commit mesajı” Türkçe); `src/core/gitCommands.ts` `git.commit` → `window.api.gitCommit({message})` (`git commit -m`); boş mesajda `var(--accent-dim)` uyarı, kırmızı yok; başarılıda `gitModel` yenilenir, `StatusBar` `IDLE`.
  - Kabul: `Ctrl+Enter` veya `Commit` butonu → `git log` yenilenir, hata çakışma değilse yeşil değil mavi glow (`src/styles/app.css:27-38` benzeri).

- [ ] **G3.3 — Push / Pull (code'daki gibi, önce fetch, sonra rebase kontrol)**
  - Commit: `feat: git push ve pull akislarini ekle`
  - Dosyalar: `src/core/gitCommands.ts` `git.push` → `window.api.gitPush` (`git push`), `git.pull` → `window.api.gitPull` (`git pull --rebase`); `electron/main/gitHandlers.ts` her ikisi `execFile` + `stdout/stderr` limit; `src/ui/GitPanel.tsx` üst çubuk `Push`/`Pull` butonları (`var(--accent)` kenarlık).
  - Kabul: Push öncesi otomatik `git fetch` → gerideyse `pull --rebase` önerisi palet bilgisi, `ok:false` → `ErrorIndicator` kırmızı (`ARCHITECTURE.md §7.4`) yalnızca gerçek hata.

- [ ] **G3.4 — Branch değiştirme / oluşturma (checkout / switch)**
  - Commit: `feat: git branch degistirme akisini ekle`
  - Dosyalar: `src/core/gitCommands.ts` `git.checkout` → `window.api.gitCheckout(branch)`; `src/ui/GitPanel.tsx` branch başlığına tıklama → palet `git branch --list` → Enter checkout; `src/core/gitModel.ts` branch yenileme.
  - Kabul: `Ctrl+I` → `git checkout` → liste → Enter → `StatusBar` branch güncellenir.

- [ ] **G3.5 — Diff detay & stage seçili satırlar (iskele)**
  - Commit: `feat: git diff secili satir stage iskeletini ekle`
  - Dosyalar: `src/ui/DiffView.tsx` (yeni) `Monaco` read-only diff (token renkler `src/editor/editorTheme.ts:10-15`), seçili satır `+` → `git add -p` iskelet (gerçek patch apply ileride); şimdilik tüm dosya stage.
  - Kabul: Dosyaya tık → diff görünür, `Enter` stage, `Esc` geri.

- [ ] **G3.6 — G3 testleri (stage/commit/push/pull/branch)**
  - Commit: `test: git akis testlerini ekle`
  - Dosyalar: `src/core/gitCommands.test.ts`, `src/ui/GitPanel.test.tsx` (yeni, `fireEvent` `Tab`/`Enter`, `Ctrl+Enter` commit), `electron/main/gitHandlers.test.ts` (git mock).
  - Kabul: `npm test` 370+ yeşil, `git commit` boş mesajda `ok:false`.

### Faz G4 — Çakışmasızlık, test, build, doküman & tag

- [ ] **G4.1 — Çakışma tespiti & çözümü (merge conflict iskelet, kusursuz uyarı)**
  - Commit: `fix: git cakisma tespit ve cozum iskeletini ekle`
  - Dosyalar: `electron/main/gitHandlers.ts` `git:status` içinde `UU` (unmerged) parse → `GitFile {status:'!'}`; `src/ui/GitPanel.tsx` çakışan dosya `!` `var(--error)` yalnızca burada (hata anlamı), tıklama → `DiffView` çakışma blokları; `src/core/gitCommands.ts` `git.resolve` iskelet (`git add` sonrası).
  - Kabul: `git merge` çakışmasında panel kırmızı yanıp sönmez, sadece dosya satırı `!` kırmızı + `StatusBar` `HATA` (`src/ui/StatusBar.tsx:1-*`).

- [ ] **G4.2 — IPC & klavye uçtan uca test (F1/Ctrl+I/git/palette/Tab/Enter/Esc + push/pull)**
  - Commit: `test: git klavye akislarini ucten uca test et`
  - Dosyalar: `src/ui/paletteFlow.test.tsx` `git` → GitPanel, `src/menus/MenuBar.test.tsx:65-82` GitPanel `Yakında` 0 doğrulaması, `src/ui/GitPanel.test.tsx` full akış: `Tab` → `Enter` stage → `Ctrl+Enter` commit → `Push`.
  - Kabul: Tüm akış fare olmadan, `focusManager` `git` zone doğru.

- [ ] **G4.3 — Renk/köşe/IPC son denetim + `ExplorerView` ile çakışma yok**
  - Commit: `chore: git panel renk kose ipc ve cakisma denetimi`
  - Dosyalar: `rg "border-radius" src` 0 dışı yok, `rg "#.{3,6}" src` token dışı yok, `rg "window.api" src` tek yüzey, `src/styles/git.css` tokenlar; `src/layout/AppShell.tsx` `ExplorerView` (1/7) + `GitPanel` (1/5) yan yana çakışmaz, `PaneManager` etkilenmez.
  - Kabul: `npm run typecheck && lint` yeşil, `src/styles/app.css:115-130` + `src/styles/git.css` keskin köşe.

- [ ] **G4.4 — Üretim paketi + doküman + tag `v0.3.0` (kusursuz push)**
  - Commit: `chore: uretim paketini ve dokumani guncelle`
  - Dosyalar: `ARCHITECTURE.md §3` IPC tablosuna 7 git kanalı, `DECISIONS.md D-018` “Git sekmesi — VS Code benzeri” ADR, `README.md` “Git sekmessi nasıl açılır”, `TODO.md` Faz G kutucukları `[x]`; `npm run build` + `npm run dist:linux` → `dist/FILE-0.3.0.AppImage` (veya `0.1.0` → `0.3.0` senkron `package.json:4`).
  - Tag: `git tag -a v0.3.0 -m "feat: git sekmesi kusursuz — stage/commit/push/pull, code-benzeri, cakismasiz"` → `git push origin master v0.3.0`.

---

## 3. Dosya Etki Haritası

| Alan | Dosyalar |
|------|----------|
| IPC/Main | `electron/main/gitHandlers.ts:1-*`, `electron/preload/index.ts:1-*`, `electron/shared/api-types.ts:1-*`, `ARCHITECTURE.md:54-72` |
| Git çekirdek | `src/core/gitModel.ts:1-*` (yeni), `src/core/gitCommands.ts:1-*` (yeni) |
| Git UI | `src/ui/GitPanel.tsx:1-*` (yeni), `src/ui/DiffView.tsx:1-*` (yeni), `src/styles/git.css` (yeni), `src/layout/AppShell.tsx:74-82` |
| Klavye | `src/core/defaultBindings.ts:1-71`, `src/core/focus.ts:7-43`, `src/core/types.ts:84` |
| Menü/Palet | `src/menus/menuTree.ts:99-102`, `src/hud/CommandHUD.tsx`, `src/core/navCommands.ts:190-201` |
| Test | `src/core/gitModel.test.ts`, `src/core/gitCommands.test.ts`, `src/ui/GitPanel.test.tsx`, `electron/main/gitHandlers.test.ts` |

---

## 4. Her Commit Şablonu (çakışmasız)

```bash
export PATH="$HOME/node/bin:$PATH"
git status            # temiz
npm run typecheck && npm run lint && npm test && npm run build
git add <dar: src/... PLAN_GIT_KUSURSUZ.md>
git commit -m "feat: <Türkçe, conventional>"
# kutucuk PLAN_GIT_KUSURSUZ.md içinde aynı committe [x] yapılır
```

**Sıra:** `G0.1 → G0.2 → G0.3 → G0.4 → G1.1 → … → G4.4` — atlama yok, her checkbox tek commit, housekeeping (typecheck/lint/test/build) her committe.

> Son adım `G4.4` sonrası `git push origin master` + `git push origin v0.3.0`; AppImage `dist/FILE-0.3.0.AppImage` `chmod +x` ile test edilir.
