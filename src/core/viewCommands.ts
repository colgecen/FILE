import { clockModel } from './clock';
import { explorerModel } from './explorer';
import { focusManager } from './focus';
import { gitModel } from './gitModel';
import { paletteModel } from './palette';
import { panesModel } from './panes';
import { openFilesModel } from './openFiles';
import { viewModeModel } from './viewMode';
import type { CommandDef } from './types';

export function registerViewCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'view.fullscreen',
    category: 'view',
    title: 'Tam Ekran',
    run: () => {
      const next = !viewModeModel.getState().fullscreen;
      viewModeModel.setFullscreen(next);
      void window.api.setFullscreen(next);
      return { ok: true };
    },
  });

  register({
    id: 'view.zen',
    category: 'view',
    title: 'Zen Modu',
    run: () => {
      viewModeModel.toggleZen();
      return { ok: true };
    },
  });

  register({
    id: 'view.wordwrap',
    category: 'view',
    title: 'Kelime Sarmalama',
    run: () => {
      viewModeModel.toggleWordWrap();
      return { ok: true };
    },
  });

  register({
    id: 'view.clock.toggle',
    category: 'view',
    title: 'Saat Göster/Gizle',
    run: () => {
      clockModel.toggle();
      return { ok: true };
    },
  });

  register({
    id: 'view.sidebar.explorer',
    category: 'view',
    title: 'Gezgin',
    run: () => {
      if (explorerModel.getState().isOpen) {
        explorerModel.close();
        focusManager.set('editor');
      } else {
        explorerModel.open();
        focusManager.set('explorer');
      }
      return { ok: true };
    },
  });

  register({
    id: 'view.sidebar.search',
    category: 'view',
    title: 'Arama Paneli',
    run: () => {
      const files = openFilesModel.list();
      if (files.length === 0) return { ok: false, error: 'Açık dosya yok' };
      paletteModel.showFiles(files);
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'view.sidebar.source',
    category: 'view',
    title: 'Kaynak Kontrolü',
    run: async () => {
      const explorerState = explorerModel.getState();
      const cwd = explorerState.rootPath ?? explorerState.files[0]?.path ?? '.';
      const isOpen = gitModel.getState().isOpen;
      if (isOpen) {
        gitModel.close();
        focusManager.set('editor');
        return { ok: true };
      }
      gitModel.open();
      focusManager.set('git');
      await gitModel.loadStatus(window.api, cwd);
      return { ok: true };
    },
  });

  register({
    id: 'view.sidebar.run',
    category: 'view',
    title: 'Çalıştır Paneli',
    run: () => {
      paletteModel.showFiles([
        { name: 'npm run dev', path: 'task:dev' },
        { name: 'npm run build', path: 'task:build' },
        { name: 'npm test', path: 'task:test' },
      ]);
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'view.layout.single',
    category: 'view',
    title: 'Tek Pencere',
    run: () => {
      panesModel.reset();
      return { ok: true };
    },
  });

  register({
    id: 'view.command.palette',
    category: 'view',
    title: 'Komut Paleti',
    run: () => {
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'explorer.toggle',
    category: 'view',
    title: 'Gezgini Aç/Kapat',
    run: () => {
      if (explorerModel.getState().isOpen) {
        explorerModel.close();
        focusManager.set('editor');
      } else {
        explorerModel.open();
        focusManager.set('explorer');
      }
      return { ok: true };
    },
  });

  register({
    id: 'explorer.refresh',
    category: 'view',
    title: 'Gezgini Yenile',
    run: async () => {
      const state = explorerModel.getState();
      const root = state.rootPath;
      if (root === null) return { ok: false, error: 'Kök klasör yok' };
      const ok = await explorerModel.loadRoot(root, (path) => window.api.readDir(path));
      return ok ? { ok: true } : { ok: false, error: 'Yenileme başarısız' };
    },
  });
}