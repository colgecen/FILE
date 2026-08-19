import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from './commands';
import { focusManager } from './focus';
import { menuModel } from '../menus/menuModel';
import { registerNavCommands } from './navCommands';

describe('navCommands · menubar', () => {
  afterEach(() => {
    menuModel.close();
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
});