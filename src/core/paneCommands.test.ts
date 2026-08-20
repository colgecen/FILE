import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import type { PaneLayout } from './types';
import { panesModel } from './panes';
import { registerPaneCommands, runPaneClose, runPaneNext, runPaneSplit } from './paneCommands';

function leafCount(layout: PaneLayout): number {
  if (layout.children === undefined) return 1;
  return layout.children.reduce((total, child) => total + leafCount(child), 0);
}

describe('paneCommands', () => {
  beforeEach(() => {
    panesModel.reset();
  });

  it('dikey bölme komutu çalışır', () => {
    const result = runPaneSplit('vertical');
    expect(result).toEqual({ ok: true });
    expect(leafCount(panesModel.getState().layout)).toBe(2);
    expect(panesModel.getState().layout.direction).toBe('vertical');
  });

  it('sonraki pane komutu çalışır', () => {
    panesModel.split('vertical');
    const second = panesModel.getState().activePaneId;
    runPaneNext();
    expect(panesModel.getState().activePaneId).not.toBe(second);
  });

  it('panel kapatma komutu tek pane kalınca zararsızdır', () => {
    const result = runPaneClose();
    expect(result).toEqual({ ok: true });
    expect(leafCount(panesModel.getState().layout)).toBe(1);
  });

  it('dört komutu kaydeder', () => {
    const registry = new CommandRegistry();
    registerPaneCommands(registry.register.bind(registry));
    expect(registry.list().map((c) => c.id)).toEqual([
      'view.split.vertical',
      'view.split.horizontal',
      'pane.next',
      'pane.close',
    ]);
  });
});