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
}