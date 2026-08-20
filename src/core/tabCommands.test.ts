import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import { dirtyTracker } from './dirty';
import { tabsModel } from './tabs';
import { registerTabCommands } from './tabCommands';
import type { OpenFile } from './types';

const file = (path: string): OpenFile => ({
  path,
  name: path.split('/').pop() ?? path,
  content: 'içerik',
  language: 'typescript',
});

function createRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerTabCommands(registry);
  return registry;
}

beforeEach(() => {
  tabsModel.reset();
  dirtyTracker.clearDirty('/kirli.ts');
});

describe('tab komutları', () => {
  it('tab.close aktif sekmeyi kapatır ve kirli işaretini temizler', () => {
    const registry = createRegistry();
    tabsModel.open(file('/a.ts'));
    tabsModel.open(file('/kirli.ts'));
    dirtyTracker.markDirty('/kirli.ts');
    const result = registry.run('tab.close');
    expect(result).resolves.toEqual({ ok: true });
    expect(tabsModel.getState().tabs.map((tab) => tab.id)).toEqual(['/a.ts']);
    expect(dirtyTracker.isDirty('/kirli.ts')).toBe(false);
  });

  it('tab.next sıradaki sekmeye geçer; sonda ilkine döner', async () => {
    const registry = createRegistry();
    tabsModel.open(file('/a.ts'));
    tabsModel.open(file('/b.ts'));
    tabsModel.open(file('/c.ts'));
    tabsModel.activate('/a.ts');
    await registry.run('tab.next');
    expect(tabsModel.getState().activeId).toBe('/b.ts');
    await registry.run('tab.next');
    await registry.run('tab.next');
    expect(tabsModel.getState().activeId).toBe('/a.ts');
  });

  it('tab.prev önceki sekmeye geçer; başta sona döner', async () => {
    const registry = createRegistry();
    tabsModel.open(file('/a.ts'));
    tabsModel.open(file('/b.ts'));
    tabsModel.activate('/a.ts');
    await registry.run('tab.prev');
    expect(tabsModel.getState().activeId).toBe('/b.ts');
  });

  it('açık sekme yokken tab.close başarısız sayılmaz', async () => {
    const registry = createRegistry();
    const result = await registry.run('tab.close');
    expect(result.ok).toBe(true);
  });
});