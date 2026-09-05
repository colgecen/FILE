# Plan — Performans Ayarları & RAM Düzeltmesi (Kusursuz, Her Görev Ayrı Commit)

> Her görev (checkbox) ayrı commit — `typecheck + lint + test + build` yeşil → `git add` dar → `commit` Türkçe conventional → `[x]`.

## Faz P — Özet

| Faz | Başlık | Görev |
|-----|--------|-------|
| P0 | Hazırlık — Perf model & ayar UI iskeleti | 2 |
| P1 | Monaco & Tab LRU — model sınırı + dispose | 2 |
| P2 | Gezgin sanal liste + büyük dosya lazy | 2 |
| P3 | Git & telemetri debounce/cache | 2 |
| P4 | AI lazy + reduced-motion + RAM test & tag | 2 |
| Toplam | | 10 |

## Ayrıntı

- [x] **P0.1 — Perf model çekirdeği (telemetri/gezgin sanal/model limiti/ai lazy toggle)**
  - Commit: `feat: perf model cekirdegini kur`
  - Dosyalar: `src/core/perfModel.ts` (yeni) `PerfState {telemetry:boolean, explorerVirtual:boolean, modelLimit:number, aiLazy:boolean, reducedMotion:boolean}` + `subscribe/emit`.

- [ ] **P0.2 — Ayar paneli UI (SettingsPanel, 1px var(--border), JetBrains Mono)**
  - Commit: `feat: performans ayar panelini ekle`
  - Dosyalar: `src/ui/SettingsPanel.tsx` (yeni) + `src/styles/perf.css` + `src/layout/AppShell.tsx` entegrasyon, `src/menus/menuTree.ts` `Ayarlar` öğesi.

- [ ] **P1.1 — Monaco LRU sınırı ayarlı + model dispose**
  - Commit: `feat: monaco lru sinirini ayarli yap`
  - Dosyalar: `src/editor/editorModel.ts` `MAX_MODELS = perfModel.getState().modelLimit` (10/20/50), en eski model `dispose()`.

- [ ] **P1.2 — Tab LRU & kirli takibi ile bellek düşürme**
  - Commit: `fix: tab lru ile bellek sizintisini duzelt`
  - Dosyalar: `src/core/tabs.ts` `close` en eski otomatik, `src/core/dirty.ts` ile senkron.

- [ ] **P2.1 — Gezgin sanal liste (windowing)**
  - Commit: `feat: gezgin sanal listeyi ekle`
  - Dosyalar: `src/ui/ExplorerView.tsx` `max-height + overflow-y` ve `slice` ile sadece görünür 60 satır render, `src/core/explorer.ts` `rows()` cache.

- [ ] **P2.2 — Büyük dosya lazy (10MB+ sadece görünür satır)**
  - Commit: `feat: buyuk dosya lazy yuklemeyi ekle`
  - Dosyalar: `src/editor/EditorCore.tsx` `file.content.length > 10_000_000` ise `model.setValue` chunk, `src/editor/monacoSetup.ts` `renderLineHighlight: off`.

- [ ] **P3.1 — Git status/log debounce + cache (500ms, 5sn)**
  - Commit: `feat: git debounce ve cache ekle`
  - Dosyalar: `src/core/gitModel.ts` `loadStatus` debounce 500ms + 5sn cache, `src/core/gitCommands.ts` `git.status` aynı.

- [ ] **P3.2 — Telemetri throttle + kapatma ayarı**
  - Commit: `feat: telemetri throttle ve kapatma ayari ekle`
  - Dosyalar: `electron/main/telemetry.ts` `perfModel.telemetry` false ise 0Hz, `src/core/telemetry.ts` 500ms → 1000ms, `src/ui/StatusBar.tsx` gizle.

- [ ] **P4.1 — AI lazy load + worker terminate**
  - Commit: `feat: ai lazy load ve worker terminate ekle`
  - Dosyalar: `src/ai/engine.ts` `perfModel.aiLazy` true ise `ensureModel` sadece ihtiyaçta, `cancel()` + `worker.terminate`, `src/ai/ai.worker.ts` `self.close()`.

- [ ] **P4.2 — Reduced-motion + RAM test & build & tag v0.3.1**
  - Commit: `chore: ram test ve build al`
  - Dosyalar: `src/styles/app.css` `@media (prefers-reduced-motion: reduce)` animasyon kapat, `src/core/perfModel.test.ts` + `npm test` + `npm run build` + `dist:linux` + `git tag v0.3.1`.

