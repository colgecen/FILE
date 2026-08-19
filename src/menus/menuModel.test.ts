import { describe, expect, it, vi } from 'vitest';
import { MenuModel } from './menuModel';

describe('MenuModel', () => {
  it('açılan üst menüde ilk seçilebilir öğeyi aktifleştirir', () => {
    const model = new MenuModel();
    model.openAt(0);
    const state = model.getState();
    expect(state.openTop).toBe(0);
    expect(state.activeItem).toBe(0);
    expect(model.topLabel(0)).toBe('Dosya');
  });

  it('üst buton gezinmesi kapalı menüde sarar', () => {
    const model = new MenuModel();
    model.moveTop(-1);
    expect(model.getState().activeTop).toBe(model.topCount() - 1);
    model.moveTop(1);
    expect(model.getState().activeTop).toBe(0);
  });

  it('alt menü açıkken üst buton gezinmesi kilitlenir', () => {
    const model = new MenuModel();
    model.openAt(0);
    model.moveTop(1);
    expect(model.getState().activeTop).toBe(0);
  });

  it('alt menü gezinmesi ayıraçları atlar ve sarar', () => {
    const model = new MenuModel();
    model.openAt(8);
    const initial = model.getState().activeItem ?? 0;
    for (let i = 0; i < 4; i++) {
      model.moveItem(1);
    }
    const state = model.getState();
    expect(state.activeItem).not.toBeNull();
    expect(state.path).toHaveLength(0);
    expect(state.activeItem).not.toBe(initial);
  });

  it('komut öğesi çalıştırılınca komut id döner', () => {
    const model = new MenuModel();
    model.openAt(0);
    const result = model.activate();
    expect(result.type).toBe('command');
    expect(result.commandId).toBe('file.new.file');
  });

  it('alt menü öğesi çalıştırılınca çocukları açar', () => {
    const model = new MenuModel();
    model.openAt(0);
    while (model.activate().type !== 'submenu' && model.getState().openTop !== null) {
      model.moveItem(1);
    }
    const state = model.getState();
    expect(state.path).toHaveLength(1);
  });

  it('moveLeft alt menüden bir üst düzeye döner', () => {
    const model = new MenuModel();
    model.openAt(0);
    while (model.activate().type !== 'submenu' && model.getState().openTop !== null) {
      model.moveItem(1);
    }
    expect(model.getState().path).toHaveLength(1);
    model.moveLeft();
    expect(model.getState().path).toHaveLength(0);
  });

  it('moveLeft açık menüyü kapatır', () => {
    const model = new MenuModel();
    model.openAt(0);
    model.moveLeft();
    expect(model.getState().openTop).toBeNull();
  });

  it('closeStep adım adım kapatır', () => {
    const model = new MenuModel();
    model.openAt(0);
    expect(model.closeStep()).toBe('closed-menu');
    expect(model.getState().openTop).toBeNull();
    expect(model.closeStep()).toBeNull();
  });

  it('değişimlerde aboneleri bilgilendirir', () => {
    const model = new MenuModel();
    const spy = vi.fn();
    model.subscribe(spy);
    model.openAt(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});