import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './theme/tokens.css';
import './styles/app.css';
import './styles/media.css';
import './styles/holo.css';
import './styles/pane.css';
import './styles/statusbar.css';
import './styles/terminal.css';
import './styles/help.css';
import './styles/ai.css';
import './styles/perf.css';
import 'xterm/css/xterm.css';
import { AppShell } from './layout/AppShell';
import { AppCover } from './ui/AppCover';
import { hydrateRestoredFiles, restoreSession, session } from './core/session';
import { tabsModel } from './core/tabs';
import { cursorModel } from './core/cursor';
import { environmentsModel } from './core/environments';
import { explorerModel } from './core/explorer';
import { fileContentCache } from './core/fileCache';
import { initUiLanguage } from './core/uiLanguage';

initUiLanguage();
document.documentElement.dataset.platform = window.api.platform;
restoreSession();

// Oturumdan gelen ortam varsa dosya ağacını ilk açılışta hazırla ve göster.
// Önceden `tree` komutu elle çalıştırılmadıkça gezgin boş/kapalı kalıyordu.
const restoredEnv = environmentsModel.active();
if (restoredEnv !== null && !restoredEnv.id.startsWith('browser:')) {
  explorerModel.open();
  // İlk React render'ı ve abonelik otursun; ardından diski oku. Böylece
  // "YÜKLENİYOR…" durumu güncellemesi abonelik öncesinde kaybolmaz.
  window.requestAnimationFrame(() => {
    void explorerModel.loadRoot(restoredEnv.rootPath, window.api.readDir);
  });
}

void hydrateRestoredFiles((path) => fileContentCache.read(window.api, path));
tabsModel.subscribe(() => session.schedule());
cursorModel.subscribe(() => {
  const cursor = cursorModel.getState();
  if (cursor.path !== null) session.updateMemory(cursor.path, { line: cursor.line, column: cursor.column });
});
window.addEventListener('beforeunload', () => session.remember());

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kok bulunamadi: #root');
}

createRoot(container).render(
  <StrictMode>
    <AppShell glass={window.api.glass} />
    <AppCover />
  </StrictMode>,
);

// İlk React karesi boyandıktan sonra pencereyi göster; gizli pencerede
// `ready-to-show` boş bir kareye denk gelip siyah/şeffaf flaş üretiyordu.
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => window.api.appReady());
});
