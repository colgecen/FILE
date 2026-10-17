import { ipcMain, type BrowserWindow } from 'electron';

const IS_MAC = process.platform === 'darwin';

export const WINDOW_CHROME: Electron.BrowserWindowConstructorOptions = IS_MAC
  ? { titleBarStyle: 'hiddenInset' }
  : ({ frame: false, transparent: true, backgroundColor: '#00000000', shadow: false } as Electron.BrowserWindowConstructorOptions);

export function attachFullscreenEvents(window: BrowserWindow): void {
  window.on('enter-full-screen', () => {
    window.webContents.send('window:fullscreen', true);
  });
  window.on('leave-full-screen', () => {
    window.webContents.send('window:fullscreen', false);
  });
}

export function registerWindowHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('window:set-fullscreen', (_event, enabled: unknown): boolean => {
    const window = getWindow();
    if (window === null) return false;
    if (typeof enabled !== 'boolean') return false;
    window.setFullScreen(enabled);
    return true;
  });

  ipcMain.handle('window:minimize', (): boolean => {
    const window = getWindow();
    if (window === null) return false;
    window.minimize();
    return true;
  });

  ipcMain.handle('window:toggle-maximize', (): boolean => {
    const window = getWindow();
    if (window === null) return false;
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
    return true;
  });
}