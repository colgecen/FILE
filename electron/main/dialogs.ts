import { dialog, type BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import type { FolderResult, OpenFileResult } from '../shared/api-types';
import { languageForPath, readTextFile } from './fileUtils';
import { mediaKindForPath, MEDIA_EXTENSIONS } from './mediaKinds';

export function registerDialogHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('dialog:open-file', async (): Promise<OpenFileResult | null> => {
    const window = getWindow();
    const result = window
      ? await dialog.showOpenDialog(window, {
          properties: ['openFile'],
          filters: [
            {
              name: 'Düzenlenebilir dosyalar',
              extensions: [
                'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'md', 'txt', 'css', 'html', 'py',
                'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'java', 'rb', 'php', 'sh', 'yml', 'yaml',
                'toml', 'xml', 'sql',
              ],
            },
            { name: 'Medya dosyaları', extensions: MEDIA_EXTENSIONS },
            { name: 'Tüm dosyalar', extensions: ['*'] },
          ],
        })
      : await dialog.showOpenDialog({ properties: ['openFile'] });

    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0]!;
    const kind = mediaKindForPath(path);
    if (kind !== null) {
      return { path, name: path.split(/[\\/]/).pop() ?? path, content: '', language: 'plaintext', kind };
    }
    const content = await readTextFile(path);
    if (content === null) return null;
    return { path, name: path.split(/[\\/]/).pop() ?? path, content, language: languageForPath(path), kind: 'text' };
  });

  ipcMain.handle('dialog:open-folder', async (): Promise<FolderResult | null> => {
    const window = getWindow();
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] });

    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0]!;
    return { path, name: path.split(/[\\/]/).pop() ?? path };
  });

  ipcMain.handle('dialog:save-as', async (_event, defaultPath: string): Promise<string | null> => {
    if (typeof defaultPath !== 'string') return null;
    const window = getWindow();
    const result = window
      ? await dialog.showSaveDialog(window, { defaultPath })
      : await dialog.showSaveDialog({ defaultPath });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
}