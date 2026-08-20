import type { CommandDef, CommandResult } from './types';
import { panesModel } from './panes';

export function runPaneSplit(direction: 'vertical' | 'horizontal'): CommandResult {
  panesModel.split(direction);
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
}