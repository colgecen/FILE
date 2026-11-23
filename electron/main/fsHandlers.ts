import { clipboard, ipcMain, shell } from 'electron';
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import type {
  CreateEntryResult,
  DirEntry,
  FsMutationResult,
  OpenFileResult,
  WriteFileResult,
} from '../shared/api-types';
import { languageForPath } from './fileUtils';
import { textFileCache } from './fileCache';
import { mediaKindForPath } from './mediaKinds';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function safePath(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const normalized = normalize(raw);
  return isAbsolute(normalized) ? normalized : null;
}

function validEntryName(rawName: unknown): string | null {
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
    return null;
  }
  return name;
}

function isInside(child: string, parent: string): boolean {
  const childPath = resolve(child);
  const parentPath = resolve(parent);
  return childPath === parentPath || childPath.startsWith(`${parentPath}${sep}`);
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
      const name = validEntryName(rawName);
      if (name === null) return { ok: false, error: 'Geçersiz ad' };
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
    'fs:copy-entry',
    async (_event, rawSource: string, rawTargetParent: string): Promise<FsMutationResult> => {
      const source = safePath(rawSource);
      const parent = safePath(rawTargetParent);
      if (source === null || parent === null) return { ok: false, error: 'Geçersiz yol' };
      const info = await stat(source).catch(() => null);
      if (info === null) return { ok: false, error: 'Kaynak bulunamadı' };
      const target = join(parent, basename(source));
      if (isInside(target, source)) return { ok: false, error: 'Klasör kendi içine kopyalanamaz' };
      try {
        await stat(target);
        return { ok: false, error: 'Hedef zaten var', path: target };
      } catch {
        // hedef yok — devam
      }
      try {
        await cp(source, target, { recursive: info.isDirectory(), errorOnExist: true, force: false });
        return { ok: true, path: target };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, path: target };
      }
    },
  );

  ipcMain.handle(
    'fs:move-entry',
    async (_event, rawSource: string, rawTargetParent: string): Promise<FsMutationResult> => {
      const source = safePath(rawSource);
      const parent = safePath(rawTargetParent);
      if (source === null || parent === null) return { ok: false, error: 'Geçersiz yol' };
      const info = await stat(source).catch(() => null);
      if (info === null) return { ok: false, error: 'Kaynak bulunamadı' };
      const target = join(parent, basename(source));
      if (isInside(target, source)) return { ok: false, error: 'Klasör kendi içine taşınamaz' };
      if (resolve(source) === resolve(target)) return { ok: true, path: target };
      try {
        await stat(target);
        return { ok: false, error: 'Hedef zaten var', path: target };
      } catch {
        // hedef yok — devam
      }
      try {
        await rename(source, target);
        return { ok: true, path: target };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'EXDEV') {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false, error: message, path: target };
        }
        try {
          await cp(source, target, { recursive: info.isDirectory() });
          await rm(source, { recursive: info.isDirectory(), force: true });
          return { ok: true, path: target };
        } catch (copyErr) {
          const message = copyErr instanceof Error ? copyErr.message : String(copyErr);
          return { ok: false, error: message, path: target };
        }
      }
    },
  );

  ipcMain.handle(
    'fs:rename-entry',
    async (_event, rawSource: string, rawName: string): Promise<FsMutationResult> => {
      const source = safePath(rawSource);
      if (source === null) return { ok: false, error: 'Geçersiz yol' };
      const name = validEntryName(rawName);
      if (name === null) return { ok: false, error: 'Geçersiz ad' };
      const target = join(dirname(source), name);
      if (resolve(source) === resolve(target)) return { ok: true, path: target };
      try {
        await stat(target);
        return { ok: false, error: 'Hedef zaten var', path: target };
      } catch {
        // hedef yok — devam
      }
      try {
        await rename(source, target);
        return { ok: true, path: target };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, path: target };
      }
    },
  );

  ipcMain.handle('fs:delete-entry', async (_event, rawPath: string): Promise<FsMutationResult> => {
    const path = safePath(rawPath);
    if (path === null) return { ok: false, error: 'Geçersiz yol' };
    try {
      const info = await stat(path);
      await rm(path, { recursive: info.isDirectory(), force: false });
      return { ok: true, path };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message, path };
    }
  });

  ipcMain.handle('shell:show-item', (_event, rawPath: string): boolean => {
    const path = safePath(rawPath);
    if (path === null) return false;
    shell.showItemInFolder(path);
    return true;
  });

  ipcMain.handle('clipboard:write', (_event, text: unknown): boolean => {
    if (typeof text !== 'string') return false;
    clipboard.writeText(text);
    return true;
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