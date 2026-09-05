import { gitModel } from './gitModel';
import type { CommandDef } from './types';

export function registerGitCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'git.status',
    category: 'terminal',
    title: 'Git Durum',
    run: async () => {
      const cwd = gitModel.getState().rootPath ?? '.';
      await gitModel.loadStatus(window.api, cwd);
      return { ok: true };
    },
  });
  register({
    id: 'git.stage',
    category: 'terminal',
    title: 'Git Stage',
    run: async () => {
      const state = gitModel.getState();
      const cwd = state.rootPath ?? '.';
      const unstaged = state.files.filter((file) => !state.staged.has(file.path)).map((file) => file.path);
      if (unstaged.length === 0) return { ok: false, error: 'Stage edilecek dosya yok' };
      const result = await window.api.gitAdd(cwd, [unstaged[0]!]);
      if (result.ok) gitModel.setStaged(unstaged[0]!, true);
      return result;
    },
  });
  register({
    id: 'git.unstage',
    category: 'terminal',
    title: 'Git Unstage',
    run: async () => {
      const state = gitModel.getState();
      const cwd = state.rootPath ?? '.';
      const staged = [...state.staged];
      if (staged.length === 0) return { ok: false, error: 'Unstage edilecek dosya yok' };
      const result = await window.api.gitRestore(cwd, [staged[0]!]);
      if (result.ok) gitModel.setStaged(staged[0]!, false);
      return result;
    },
  });
  register({
    id: 'git.commit',
    category: 'terminal',
    title: 'Git Commit',
    run: async () => {
      const state = gitModel.getState();
      const cwd = state.rootPath ?? '.';
      // mesaj GitPanel'den alınır — iskelet sabit mesaj
      const result = await window.api.gitCommit(cwd, 'chore: guncelle');
      if (result.ok) await gitModel.loadStatus(window.api, cwd);
      return result;
    },
  });
  register({
    id: 'git.push',
    category: 'terminal',
    title: 'Git Push',
    run: async () => {
      const cwd = gitModel.getState().rootPath ?? '.';
      return window.api.gitPush(cwd);
    },
  });
  register({
    id: 'git.pull',
    category: 'terminal',
    title: 'Git Pull',
    run: async () => {
      const cwd = gitModel.getState().rootPath ?? '.';
      return window.api.gitPull(cwd);
    },
  });
  register({
    id: 'git.checkout',
    category: 'terminal',
    title: 'Git Checkout',
    run: async () => {
      const cwd = gitModel.getState().rootPath ?? '.';
      const branch = gitModel.getState().branch ?? 'main';
      return window.api.gitCheckout(cwd, branch);
    },
  });
  register({
    id: 'git.diff',
    category: 'terminal',
    title: 'Git Diff',
    run: async () => {
      const state = gitModel.getState();
      const cwd = state.rootPath ?? '.';
      const file = state.files[0]?.path;
      if (!file) return { ok: false, error: 'Dosya yok' };
      const diff = await window.api.gitDiff(cwd, file);
      return diff !== null ? { ok: true } : { ok: false, error: 'Diff alınamadı' };
    },
  });
  register({
    id: 'git.log',
    category: 'terminal',
    title: 'Git Log',
    run: async () => {
      const cwd = gitModel.getState().rootPath ?? '.';
      const log = await window.api.gitLog(cwd, 20);
      return log !== null ? { ok: true } : { ok: false, error: 'Log alınamadı' };
    },
  });
}
