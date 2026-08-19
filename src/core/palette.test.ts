import { describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import { focusManager } from './focus';
import { registerMenuCommands } from './menuCommands';
import { paletteModel } from './palette';
import { registerNavCommands } from './navCommands';

const registry = new CommandRegistry();
registerMenuCommands(registry);
registerNavCommands(registry);

describe('PaletteModel', () => {
  it('varsayılan listede ilk on iki komutu gösterir', () => {
    paletteModel.reset(registry.list());
    const state = paletteModel.getState();
    expect(state.items.length).toBe(12);
    expect(state.activeIndex).toBe(0);
  });

  it('sorguya göre komutları filtreler', () => {
    paletteModel.reset(registry.list());
    paletteModel.setQuery('kaydet', registry.list());
    const titles = paletteModel.getState().items.map((item) => item.title);
    expect(titles).toContain('Kaydet');
  });

  it('seçim sarar', () => {
    paletteModel.reset(registry.list());
    paletteModel.move(-1);
    expect(paletteModel.getState().activeIndex).toBe(11);
    paletteModel.move(1);
    expect(paletteModel.getState().activeIndex).toBe(0);
  });
});

describe('palette açılış akışı', () => {
  it('toggle palet bölgesini açar ve komutları yükler', async () => {
    paletteModel.reset(registry.list());
    await registry.run('palette.toggle');
    expect(focusManager.get()).toBe('palette');
    expect(paletteModel.getState().items.length).toBeGreaterThan(0);
    while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
  });

  it('toggle tekrar paleti kapatır ve önceki bölgeye döner', async () => {
    paletteModel.reset(registry.list());
    await registry.run('palette.toggle');
    await registry.run('palette.toggle');
    expect(focusManager.get()).toBe('editor');
    expect(paletteModel.getState().query).toBe('');
  });
});