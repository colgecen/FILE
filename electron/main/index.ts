import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCENT = '#00D2FF';
const BG_BASE = '#000000';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  if (mainWindow !== null) return;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: BG_BASE,
    title: 'File',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.mjs'),
    },
  });

  mainWindow.on('closed', (): void => {
    mainWindow = null;
  });

  // Henuz URL yok (commit 6 ile baglanacak).
  void ACCENT;
}

void app.whenReady().then((): void => {
  createMainWindow();

  app.on('activate', (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
