import { ipcMain } from 'electron';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, normalize } from 'node:path';
import type { CreateEntryResult, DirEntry, OpenFileResult, WriteFileResult } from '../shared/api-types';
import { languageForPath } from './fileUtils';
import { textFileCache } from './fileCache';
import { mediaKindForPath } from './mediaKinds';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function safePath(raw: string): string | null {
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

/** Reads a file for the editor, reusing the main-process content cache. */
export async function readFileForEditor(rawPath: string): Promise<OpenFileResult | null> {
  const path = safePath(rawPath);
  if (!path) return null;
  const mediaKind = mediaKindForPath(path);
  if (mediaKind !== null) {
    return { path, name: basename(path), content: '', language: 'plaintext', kind: mediaKind };
  }
  const info = await stat(path).catch(() => null);
  if (info === null || !info.isFile() || info.size > MAX_FILE_BYTES) return null;
  const cached = textFileCache.get(path, info);
  if (cached !== null) return cached;
  const content = await readFileOrNull(path);
  if (content === null || content.length > MAX_FILE_BYTES) return null;
  const result: OpenFileResult = {
    path,
    name: basename(path),
    content,
    language: languageForPath(path),
    kind: 'text',
  };
  // Re-stat after the read so a file modified during the read is not cached
  // under the older mtime.
  const after = await stat(path).catch(() => null);
  if (after !== null) textFileCache.set(path, after, result);
  return result;
}

export function registerFsHandlers(): void {
  ipcMain.handle('fs:read-file', async (_event, rawPath: string): Promise<OpenFileResult | null> => {
    return readFileForEditor(rawPath);
  });

  ipcMain.handle(
    'fs:create-entry',
    async (
      _event,
      rawParent: string,
      rawName: string,
      kind: unknown,
    ): Promise<CreateEntryResult> => {
      const parent = safePath(rawParent);
      if (parent === null) return { ok: false, error: 'Geçersiz klasör' };
      if (kind !== 'file' && kind !== 'directory') {
        return { ok: false, error: 'Geçersiz öğe türü' };
      }
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      const hasControlChars = [...name].some((char) => char.charCodeAt(0) < 32);
      if (
        name.length === 0 ||
        name.length > 255 ||
        name === '.' ||
        name === '..' ||
        name.includes('/') ||
        name.includes('\\') ||
        hasControlChars
      ) {
        return { ok: false, error: 'Geçersiz ad' };
      }
      const info = await stat(parent).catch(() => null);
      if (info === null || !info.isDirectory()) {
        return { ok: false, error: 'Klasör bulunamadı' };
      }
      const target = join(parent, name);
      try {
        if (kind === 'directory') {
          await mkdir(target);
        } else {
          // 'wx' var olan dosyanın üzerine yazmaz.
          await writeFile(target, '', { encoding: 'utf8', flag: 'wx' });
        }
        return { ok: true, path: target };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, path: target };
      }
    },
  );

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
        textFileCache.invalidate(path);
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