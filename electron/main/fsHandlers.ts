import { ipcMain } from 'electron';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, normalize } from 'node:path';
import type { DirEntry, OpenFileResult, WriteFileResult } from '../shared/api-types';
import { languageForPath } from './fileUtils';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function safePath(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const normalized = normalize(raw);
  return isAbsolute(normalized) ? normalized : null;
}

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

export function registerFsHandlers(): void {
  ipcMain.handle('fs:read-file', async (_event, rawPath: string): Promise<OpenFileResult | null> => {
    const path = safePath(rawPath);
    if (!path) return null;
    const content = await readFileOrNull(path);
    if (content === null || content.length > MAX_FILE_BYTES) return null;
    return { path, name: basename(path), content, language: languageForPath(path) };
  });

  ipcMain.handle(
    'fs:write-file',
    async (_event, rawPath: string, content: string): Promise<WriteFileResult> => {
      const path = safePath(rawPath);
      if (!path) return { ok: false, error: 'Geçersiz yol', path: rawPath };
      if (typeof content !== 'string' || content.length > MAX_FILE_BYTES) {
        return { ok: false, error: 'Geçersiz içerik', path };
      }
      try {
        await writeFile(path, content, 'utf8');
        return { ok: true, path };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, path };
      }
    },
  );

  ipcMain.handle('fs:read-dir', async (_event, rawPath: string): Promise<DirEntry[]> => {
    const path = safePath(rawPath);
    if (!path) return [];
    try {
      const entries = await readdir(path, { withFileTypes: true });
      const mapped: DirEntry[] = entries.map((entry) => ({
        name: entry.name,
        path: join(path, entry.name),
        kind: entry.isDirectory() ? 'directory' : 'file',
      }));
      mapped.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return mapped;
    } catch {
      return [];
    }
  });
}