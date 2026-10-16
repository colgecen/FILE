import type { CommandDef, CommandResult } from './types';
import { countLeaves, panesModel } from './panes';
import { dirtyTracker } from './dirty';
import { tabsModel } from './tabs';

export function runPaneSplit(direction: 'vertical' | 'horizontal'): CommandResult {
  if (tabsModel.getState().tabs.length === 0) {
    return { ok: false, error: 'Açık dosya yok — bölüm oluşturulamaz' };
  }
  panesModel.split(direction);
  return { ok: true };
}

export function runCloseActivePaneOrTab(): CommandResult {
  const { layout, activePaneId } = panesModel.getState();
  if (countLeaves(layout) > 1) {
    panesModel.close(activePaneId);
    return { ok: true };
  }
  const { activeId } = tabsModel.getState();
  if (activeId === null) {
    return { ok: false, error: 'Kapatılacak sekme yok' };
  }
  tabsModel.close(activeId);
  dirtyTracker.clearDirty(activeId);
  return { ok: true };
}

export function runPaneNext(): CommandResult {
  panesModel.next();
  return { ok: true };
}

export function runPaneClose(): CommandResult {
  panesModel.close(panesModel.getState().activePaneId);
  return { ok: true };
}

export function registerPaneCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'view.split.vertical',
    category: 'view',
    title: 'Dikey Böl',
    run: () => runPaneSplit('vertical'),
  });
  register({
    id: 'view.split.horizontal',
    category: 'view',
    title: 'Yatay Böl',
    run: () => runPaneSplit('horizontal'),
  });
  register({
    id: 'pane.next',
    category: 'view',
    title: 'Sonraki Panel',
    run: runPaneNext,
  });
  register({
    id: 'pane.close',
    category: 'view',
    title: 'Panel Kapat',
    run: runPaneClose,
  });
  register({
    id: 'view.closeActive',
    category: 'view',
    title: 'Sekmeyi veya Paneli Kapat',
    run: runCloseActivePaneOrTab,
  });
}