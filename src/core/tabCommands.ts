import type { CommandRegistry } from './commands';
import { dirtyTracker } from './dirty';
import { tabsModel } from './tabs';
import type { CommandResult } from './types';

function closeOpenedTab(path: string): void {
  tabsModel.close(path);
  dirtyTracker.clearDirty(path);
}

export { closeOpenedTab };

export function registerTabCommands(registry: CommandRegistry): void {
  registry.register({
    id: 'tab.close',
    title: 'Aktif Sekmeyi Kapat',
    category: 'file',
    run: (): CommandResult => {
      const { activeId } = tabsModel.getState();
      if (activeId !== null) {
        closeOpenedTab(activeId);
      }
      return { ok: true };
    },
  });
  registry.register({
    id: 'tab.next',
    title: 'Sonraki Sekme',
    category: 'file',
    run: (): CommandResult => {
      const { tabs, activeId } = tabsModel.getState();
      const index = tabs.findIndex((tab) => tab.id === activeId);
      const next = tabs[index + 1] ?? tabs[0];
      if (next !== undefined) {
        tabsModel.activate(next.id);
      }
      return { ok: true };
    },
  });
  registry.register({
    id: 'tab.prev',
    title: 'Önceki Sekme',
    category: 'file',
    run: (): CommandResult => {
      const { tabs, activeId } = tabsModel.getState();
      const index = tabs.findIndex((tab) => tab.id === activeId);
      const prev = tabs[index - 1] ?? tabs[tabs.length - 1];
      if (prev !== undefined) {
        tabsModel.activate(prev.id);
      }
      return { ok: true };
    },
  });
}