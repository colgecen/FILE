import { ipcMain, type BrowserWindow } from 'electron';

const IS_MAC = process.platform === 'darwin';
const TRANSPARENT = !IS_MAC && process.env['TRANSPARENT'] !== '0';

// Linux/Windows use a frameless custom title bar. The window stays transparent
// so the small CSS corner radius does not paint black corners; set
// TRANSPARENT=0 to force an opaque window on setups where transparency glitches.
export const WINDOW_CHROME: Electron.BrowserWindowConstructorOptions = IS_MAC
  ? { titleBarStyle: 'hiddenInset' }
  : ({
      frame: false,
      transparent: TRANSPARENT,
      backgroundColor: TRANSPARENT ? '#00000000' : '#000000',
      shadow: false,
    } as Electron.BrowserWindowConstructorOptions);

export function attachFullscreenEvents(window: BrowserWindow): void {
  window.on('enter-full-screen', () => {
    window.webContents.send('window:fullscreen', true);
  });
  window.on('leave-full-screen', () => {
    window.webContents.send('window:fullscreen', false);
  });
}

export function registerWindowHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.on('window:ready', (event): void => {
    const window = getWindow();
    if (window === null || window.isDestroyed()) return;
    if (event.sender !== window.webContents) return;
    if (!window.isVisible()) window.show();
  });

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