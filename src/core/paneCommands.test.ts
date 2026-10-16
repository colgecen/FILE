import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import type { OpenFile, PaneLayout } from './types';
import { panesModel } from './panes';
import { tabsModel } from './tabs';
import {
  registerPaneCommands,
  runCloseActivePaneOrTab,
  runPaneClose,
  runPaneNext,
  runPaneSplit,
} from './paneCommands';

function leafCount(layout: PaneLayout): number {
  if (layout.children === undefined) return 1;
  return layout.children.reduce((total, child) => total + leafCount(child), 0);
}

function file(path: string, name: string): OpenFile {
  return { path, name, content: '', language: 'plaintext' };
}

describe('paneCommands', () => {
  beforeEach(() => {
    panesModel.reset();
    tabsModel.reset();
  });

  it('dikey bölme komutu çalışır', () => {
    tabsModel.open(file('/a.ts', 'a.ts'));
    const result = runPaneSplit('vertical');
    expect(result).toEqual({ ok: true });
    expect(leafCount(panesModel.getState().layout)).toBe(2);
    expect(panesModel.getState().layout.direction).toBe('vertical');
  });

  it('dosya kapalıyken bölüm oluşmaz', () => {
    const result = runPaneSplit('vertical');
    expect(result.ok).toBe(false);
    expect(leafCount(panesModel.getState().layout)).toBe(1);
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

  it('shift+4 komutu bölünmüş paneli kapatır, sekme kalır', () => {
    tabsModel.open(file('/a.ts', 'a.ts'));
    panesModel.split('vertical');
    const result = runCloseActivePaneOrTab();
    expect(result).toEqual({ ok: true });
    expect(leafCount(panesModel.getState().layout)).toBe(1);
    expect(tabsModel.getState().tabs).toHaveLength(1);
  });

  it('shift+4 komutu tek panelde aktif sekmeyi kapatır', () => {
    tabsModel.open(file('/a.ts', 'a.ts'));
    const result = runCloseActivePaneOrTab();
    expect(result).toEqual({ ok: true });
    expect(tabsModel.getState().tabs).toHaveLength(0);
  });

  it('shift+4 komutu sekme yokken başarısızdır', () => {
    const result = runCloseActivePaneOrTab();
    expect(result.ok).toBe(false);
  });

  it('beş komutu kaydeder', () => {
    const registry = new CommandRegistry();
    registerPaneCommands(registry.register.bind(registry));
    expect(registry.list().map((c) => c.id)).toEqual([
      'view.split.vertical',
      'view.split.horizontal',
      'pane.next',
      'pane.close',
      'view.closeActive',
    ]);
  });
});
