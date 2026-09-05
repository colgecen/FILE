import { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import type { BrowserWindow as BW } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function registerAppHandlers(getWindow: () => BW | null): void {
  ipcMain.handle('app:exit', async (): Promise<void> => {
    getWindow()?.close();
  });

  ipcMain.handle('app:new-window', async (): Promise<void> => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 500,
      backgroundColor: '#000000',
      title: 'File',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: join(__dirname, '../preload/index.cjs'),
      },
    });
    const entryFile = join(__dirname, '../renderer/index.html');
    if (!process.env['ELECTRON_RENDERER_URL']) {
      await win.loadFile(entryFile);
    } else {
      await win.loadURL(process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost:5173');
    }
    void BrowserWindow;
  });
}