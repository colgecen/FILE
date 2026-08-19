import { afterEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import { focusManager } from './focus';
import { menuModel } from '../menus/menuModel';
import { registerNavCommands } from './navCommands';

describe('navCommands · menubar', () => {
  afterEach(() => {
    menuModel.openAt(0);
    menuModel.close();
    while (focusManager.get() !== 'editor') {
      focusManager.returnToPrevious();
    }
  });

  const setup = (): CommandRegistry => {
    const registry = new CommandRegistry();
    registerNavCommands(registry);
    return registry;
  };

  it('F1 menüyü açar: odak menü bölgesine geçer ve panel açılır', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    expect(focusManager.get()).toBe('menubar');
    expect(menuModel.getState().openTop).toBe(0);
  });

  it('F1 tekrar basılınca menüyü kapatır ve önceki bölgeye döner', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.toggle');
    expect(focusManager.get()).toBe('editor');
    expect(menuModel.getState().openTop).toBeNull();
  });

  it('sağ yön üst buton gezinmesi yapar ve paneli komşu menüye taşır', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.right');
    const state = menuModel.getState();
    expect(state.activeTop).toBe(1);
    expect(state.openTop).toBe(1);
    expect(state.activeItem).toBe(0);
  });

  it('sol yön en soldan en sağa sarar', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.left');
    expect(menuModel.getState().activeTop).toBe(menuModel.topCount() - 1);
  });

  it('aşağı yön öğe gezinmesi yapar, ayıraçları atlar', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.down');
    await registry.run('menubar.down');
    expect(menuModel.getState().activeItem).toBe(2);
  });

  it('Tab sonraki öğeye geçer', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.next');
    expect(menuModel.getState().activeItem).toBe(1);
  });

  it('yukarı yön listede sarar', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.up');
    expect(menuModel.getState().activeItem).toBe(9);
  });

  it('öğe gezinmesi üst buton aktifliğini değiştirmez (odak kilidi)', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.down');
    await registry.run('menubar.down');
    expect(menuModel.getState().activeTop).toBe(0);
  });
});