import { ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitBranchInfo, GitFile, GitLogEntry } from '../shared/api-types';

const execFileAsync = promisify(execFile);

function isValidPath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length < 4096;
}

export function registerGitHandlers(): void {
  ipcMain.handle('git:branch', async (_event, path: string): Promise<GitBranchInfo | null> => {
    if (!isValidPath(path)) return null;
    try {
      const { stdout } = await execFileAsync('git', ['-C', path, 'branch', '--show-current']);
      const name = stdout.trim();
      if (!name) return null;
      const status = await execFileAsync('git', ['-C', path, 'status', '--porcelain']);
      return { name, dirty: status.stdout.trim().length > 0 };
    } catch {
      return null;
    }
  });

  ipcMain.handle('git:status', async (_event, path: string): Promise<GitFile[] | null> => {
    if (!isValidPath(path)) return null;
    try {
      const { stdout } = await execFileAsync('git', ['-C', path, 'status', '--porcelain', '-uall']);
      if (stdout.trim().length === 0) return [];
      const lines = stdout.split('\n').filter((line) => line.length > 0);
      const files: GitFile[] = [];
      for (const line of lines) {
        const code = line.slice(0, 2).trim();
        const filePath = line.slice(3).trim();
        let status: GitFile['status'] = 'M';
        if (code === '??') status = '?';
        else if (code === 'UU' || code.includes('U')) status = 'U';
        else if (code.includes('D')) status = 'D';
        else if (code.includes('A')) status = 'A';
        else if (code.includes('M')) status = 'M';
        files.push({ path: filePath, status });
      }
      return files;
    } catch {
      return null;
    }
  });

  ipcMain.handle('git:diff', async (_event, path: string, file: string): Promise<string | null> => {
    if (!isValidPath(path) || typeof file !== 'string') return null;
    try {
      const { stdout } = await execFileAsync('git', ['-C', path, 'diff', '--unified=3', '--', file]);
      return stdout;
    } catch {
      return null;
    }
  });

  ipcMain.handle('git:log', async (_event, path: string, limit: unknown): Promise<GitLogEntry[] | null> => {
    if (!isValidPath(path)) return null;
    const count = typeof limit === 'number' && limit > 0 && limit <= 100 ? String(limit) : '20';
    try {
      const { stdout } = await execFileAsync('git', [
        '-C',
        path,
        'log',
        `--max-count=${count}`,
        '--pretty=format:%H%x1f%s%x1f%an%x1f%ad',
        '--date=short',
      ]);
      if (stdout.trim().length === 0) return [];
      return stdout.split('\n').map((line) => {
        const [hash, message, author, date] = line.split('\x1f');
        return { hash: hash ?? '', message: message ?? '', author: author ?? '', date: date ?? '' };
      });
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    'git:commit',
    async (_event, path: string, message: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPath(path) || typeof message !== 'string' || message.trim().length === 0) {
        return { ok: false, error: 'Commit mesajı boş' };
      }
      if (message.length > 5000) return { ok: false, error: 'Mesaj çok uzun' };
      try {
        await execFileAsync('git', ['-C', path, 'commit', '-m', message]);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg.slice(0, 500) };
      }
    },
  );

  ipcMain.handle('git:push', async (_event, path: string): Promise<{ ok: boolean; error?: string }> => {
    if (!isValidPath(path)) return { ok: false, error: 'Geçersiz yol' };
    try {
      await execFileAsync('git', ['-C', path, 'push']);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg.slice(0, 500) };
    }
  });

  ipcMain.handle('git:pull', async (_event, path: string): Promise<{ ok: boolean; error?: string }> => {
    if (!isValidPath(path)) return { ok: false, error: 'Geçersiz yol' };
    try {
      await execFileAsync('git', ['-C', path, 'pull', '--rebase']);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg.slice(0, 500) };
    }
  });

  ipcMain.handle(
    'git:checkout',
    async (_event, path: string, branch: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPath(path) || typeof branch !== 'string' || branch.length === 0) {
        return { ok: false, error: 'Dal adı boş' };
      }
      if (branch.length > 256 || branch.includes('..') || branch.includes('\n')) {
        return { ok: false, error: 'Geçersiz dal' };
      }
      try {
        await execFileAsync('git', ['-C', path, 'checkout', branch]);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg.slice(0, 500) };
      }
    },
  );

  ipcMain.handle(
    'git:add',
    async (_event, path: string, files: unknown): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPath(path) || !Array.isArray(files)) return { ok: false, error: 'Geçersiz parametre' };
      const list = files.filter((item): item is string => typeof item === 'string' && item.length > 0);
      if (list.length === 0) return { ok: false, error: 'Dosya yok' };
      if (list.length > 100) return { ok: false, error: 'Çok fazla dosya' };
      try {
        await execFileAsync('git', ['-C', path, 'add', '--', ...list]);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg.slice(0, 500) };
      }
    },
  );

  ipcMain.handle(
    'git:restore',
    async (_event, path: string, files: unknown): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPath(path) || !Array.isArray(files)) return { ok: false, error: 'Geçersiz parametre' };
      const list = files.filter((item): item is string => typeof item === 'string' && item.length > 0);
      if (list.length === 0) return { ok: false, error: 'Dosya yok' };
      try {
        await execFileAsync('git', ['-C', path, 'restore', '--staged', '--', ...list]);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg.slice(0, 500) };
      }
    },
  );
}
