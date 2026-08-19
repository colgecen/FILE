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

  it('Enter komut öğesini çalıştırır', async () => {
    const registry = setup();
    const run = { called: 0 };
    registry.register({
      id: 'file.new.file',
      title: 'Yeni Dosya',
      category: 'file',
      run: () => {
        run.called++;
        return { ok: true };
      },
    });
    await registry.run('menubar.toggle');
    await registry.run('menubar.activate');
    expect(run.called).toBe(1);
  });

  it('Enter alt menü öğesini açar', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    menuModel.setActiveItem(5);
    await registry.run('menubar.activate');
    expect(menuModel.getState().path).toHaveLength(1);
  });

  it('Esc alt menüyü kapatır, menüde kalır', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    menuModel.setActiveItem(5);
    await registry.run('menubar.activate');
    await registry.run('menubar.close');
    expect(focusManager.get()).toBe('menubar');
    expect(menuModel.getState().path).toHaveLength(0);
    expect(menuModel.getState().openTop).toBe(0);
  });

  it('Esc menüyü kapatınca önceki bölgeye döner', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.close');
    expect(focusManager.get()).toBe('editor');
    expect(menuModel.getState().openTop).toBeNull();
  });

  it('Esc üçüncü basışta güvenle çalışır (boş yığın)', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.close');
    await registry.run('menubar.close');
    expect(focusManager.get()).toBe('editor');
  });

  it('Enter yer tutucu komutta Yakında bilgisi gösterir', async () => {
    const registry = setup();
    await registry.run('menubar.toggle');
    await registry.run('menubar.activate');
    expect(menuModel.getState().feedback).toBe('Yakında: Yeni Dosya');
  });

  it('Enter başarılı komutta geri bildirimi temizler', async () => {
    const registry = setup();
    registry.register({
      id: 'file.new.file',
      title: 'Yeni Dosya',
      category: 'file',
      run: () => ({ ok: true }),
    });
    menuModel.setFeedback('eski');
    await registry.run('menubar.toggle');
    await registry.run('menubar.activate');
    expect(menuModel.getState().feedback).toBeNull();
  });
});