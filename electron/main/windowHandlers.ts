import { ipcMain, type BrowserWindow } from 'electron';

export function registerWindowHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('window:set-fullscreen', (_event, enabled: unknown): boolean => {
    const window = getWindow();
    if (window === null) return false;
    if (typeof enabled !== 'boolean') return false;
    window.setFullScreen(enabled);
    return true;
  });
}