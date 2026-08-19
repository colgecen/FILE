import { afterEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import { focusManager } from './focus';
import { menuModel } from '../menus/menuModel';
import { registerNavCommands } from './navCommands';

describe('navCommands · menubar', () => {
  afterEach(() => {
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
});