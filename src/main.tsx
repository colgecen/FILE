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

restoreSession();
void hydrateRestoredFiles((path) => window.api.readFile(path));
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
