import type { CommandRegistry } from './commands';
import { focusManager } from './focus';
import { menuModel } from '../menus/menuModel';
import type { FocusZone } from './types';

const placeholder =
  (id: string) => (): { ok: boolean; error: string } => ({ ok: false, error: `Yakında: ${id}` });

const toggleZone = (zone: FocusZone) => (): { ok: boolean } => {
  if (focusManager.get() === zone) {
    focusManager.returnToPrevious();
  } else {
    focusManager.set(zone);
  }
  return { ok: true };
};

const closeToPrevious = (): { ok: boolean } => {
  focusManager.returnToPrevious();
  return { ok: true };
};

const goTop = (delta: number) => (): { ok: boolean } => {
  const state = menuModel.getState();
  if (state.openTop === null) {
    menuModel.moveTop(delta);
    menuModel.openAt(menuModel.getState().activeTop);
  } else {
    menuModel.openAt(state.activeTop + delta);
  }
  return { ok: true };
};

const goItem = (delta: number) => (): { ok: boolean } => {
  menuModel.moveItem(delta);
  return { ok: true };
};

export function registerNavCommands(registry: CommandRegistry): void {
  registry.register({
    id: 'menubar.toggle',
    title: 'Menü çubuğunu aç/kapat',
    category: 'view',
    run: () => {
      if (focusManager.get() === 'menubar') {
        menuModel.close();
        focusManager.returnToPrevious();
      } else {
        focusManager.set('menubar');
        menuModel.openAt(menuModel.getState().activeTop);
      }
      return { ok: true };
    },
  });
  registry.register({
    id: 'menubar.left',
    title: 'Üst buton: sol',
    category: 'view',
    run: goTop(-1),
  });
  registry.register({
    id: 'menubar.right',
    title: 'Üst buton: sağ',
    category: 'view',
    run: goTop(1),
  });
  registry.register({
    id: 'menubar.up',
    title: 'Alt menü: yukarı',
    category: 'view',
    run: goItem(-1),
  });
  registry.register({
    id: 'menubar.down',
    title: 'Alt menü: aşağı',
    category: 'view',
    run: goItem(1),
  });
  registry.register({
    id: 'menubar.next',
    title: 'Alt menü: sonraki',
    category: 'view',
    run: goItem(1),
  });
  registry.register({
    id: 'menubar.activate',
    title: 'Öğeyi çalıştır',
    category: 'view',
    run: () => {
      const result = menuModel.activate();
      if (result.type === 'command' && result.commandId !== undefined) {
        void registry.run(result.commandId);
      }
      return { ok: true };
    },
  });
  registry.register({
    id: 'menubar.close',
    title: 'Menüyü kapat',
    category: 'view',
    run: () => {
      const step = menuModel.closeStep();
      if (step === null || step === 'closed-menu') {
        focusManager.returnToPrevious();
      }
      return { ok: true };
    },
  });

  registry.register({
    id: 'palette.toggle',
    title: 'Komut paletini aç/kapat',
    category: 'view',
    run: toggleZone('palette'),
  });
  registry.register({
    id: 'palette.confirm',
    title: 'Seçimi çalıştır',
    category: 'view',
    run: placeholder('palette.confirm'),
  });
  registry.register({
    id: 'palette.up',
    title: 'Sonuç: yukarı',
    category: 'view',
    run: placeholder('palette.up'),
  });
  registry.register({
    id: 'palette.down',
    title: 'Sonuç: aşağı',
    category: 'view',
    run: placeholder('palette.down'),
  });
  registry.register({
    id: 'palette.close',
    title: 'Paleti kapat',
    category: 'view',
    run: closeToPrevious,
  });

  registry.register({
    id: 'explorer.toggle',
    title: 'Gezgini aç/kapat',
    category: 'view',
    run: toggleZone('explorer'),
  });
  registry.register({
    id: 'explorer.folder.next',
    title: 'Klasör: sonraki',
    category: 'view',
    run: placeholder('explorer.folder.next'),
  });
  registry.register({
    id: 'explorer.folder.prev',
    title: 'Klasör: önceki',
    category: 'view',
    run: placeholder('explorer.folder.prev'),
  });
  registry.register({
    id: 'explorer.up',
    title: 'Klasör/dosya: yukarı',
    category: 'view',
    run: placeholder('explorer.up'),
  });
  registry.register({
    id: 'explorer.down',
    title: 'Klasör/dosya: aşağı',
    category: 'view',
    run: placeholder('explorer.down'),
  });
  registry.register({
    id: 'explorer.file.next',
    title: 'Dosya: sonraki',
    category: 'view',
    run: placeholder('explorer.file.next'),
  });
  registry.register({
    id: 'explorer.file.prev',
    title: 'Dosya: önceki',
    category: 'view',
    run: placeholder('explorer.file.prev'),
  });
  registry.register({
    id: 'explorer.activate',
    title: 'Dosya aç / klasör aç-kapat',
    category: 'view',
    run: placeholder('explorer.activate'),
  });
  registry.register({
    id: 'explorer.close',
    title: 'Gezginden çık',
    category: 'view',
    run: closeToPrevious,
  });
}