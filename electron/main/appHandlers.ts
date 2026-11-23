import { ipcMain, type BrowserWindow } from 'electron';

export function registerAppHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('app:exit', async (): Promise<void> => {
    getWindow()?.close();
  });

  // FILE is intentionally single-window; the menu command focuses the existing
  // window instead of spawning a second instance.
  ipcMain.handle('app:new-window', async (): Promise<void> => {
    const win = getWindow();
    if (win === null) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}
