import { ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitBranchInfo } from '../shared/api-types';

const execFileAsync = promisify(execFile);

export function registerGitHandlers(): void {
  ipcMain.handle('git:branch', async (_event, path: string): Promise<GitBranchInfo | null> => {
    if (typeof path !== 'string' || path.length === 0) return null;
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
}