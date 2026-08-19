import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';

export function registerAppHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('app:exit', async (): Promise<void> => {
    getWindow()?.close();
  });
}