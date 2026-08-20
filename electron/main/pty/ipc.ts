import { ipcMain, type BrowserWindow } from 'electron';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { PtyManager } from './manager';

const MAX_DATA_LENGTH = 64 * 1024;
const MIN_DIM = 1;
const MAX_DIM = 500;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeDims(cols: unknown, rows: unknown): { cols: number; rows: number } | null {
  if (typeof cols !== 'number' || typeof rows !== 'number') return null;
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return null;
  return { cols: clamp(Math.floor(cols), MIN_DIM, MAX_DIM), rows: clamp(Math.floor(rows), MIN_DIM, MAX_DIM) };
}

export function registerPtyIpc(getWindow: () => BrowserWindow | null, pty: PtyManager): void {
  ipcMain.handle('pty:spawn', (_event, options: unknown): { id: string } | null => {
    const raw = options as { cols?: unknown; rows?: unknown; cwd?: unknown };
    const dims = sanitizeDims(raw.cols, raw.rows);
    if (dims === null) return null;
    let cwd: string | undefined;
    if (typeof raw.cwd === 'string' && raw.cwd.length <= 4096 && existsSync(raw.cwd)) {
      cwd = dirname(raw.cwd);
    }
    const id = pty.spawnSession(cwd === undefined ? { ...dims } : { ...dims, cwd });
    return { id };
  });

  ipcMain.handle('pty:write', (_event, id: unknown, data: unknown): boolean => {
    if (typeof id !== 'string' || typeof data !== 'string') return false;
    if (data.length > MAX_DATA_LENGTH) return false;
    pty.write(id, data);
    return true;
  });

  ipcMain.handle('pty:resize', (_event, id: unknown, cols: unknown, rows: unknown): boolean => {
    if (typeof id !== 'string') return false;
    const dims = sanitizeDims(cols, rows);
    if (dims === null) return false;
    pty.resize(id, dims.cols, dims.rows);
    return true;
  });

  ipcMain.handle('pty:kill', (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false;
    pty.kill(id);
    return true;
  });

  pty.onData = (id, data) => {
    const window = getWindow();
    if (window !== null && !window.isDestroyed()) {
      window.webContents.send('pty:data', id, data);
    }
  };
  pty.onExit = (id, exitCode) => {
    const window = getWindow();
    if (window !== null && !window.isDestroyed()) {
      window.webContents.send('pty:exit', id, exitCode);
    }
  };
}