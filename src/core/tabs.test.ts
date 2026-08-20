import { describe, expect, it } from 'vitest';
import { TabsModel } from './tabs';
import type { OpenFile } from './types';

const file = (path: string, name: string): OpenFile => ({
  path,
  name,
  content: 'içerik',
  language: 'typescript',
});

describe('TabsModel', () => {
  it('dosya açılınca sekme eklenir ve aktif olur', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    const state = model.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeId).toBe('/a.ts');
  });

  it('aynı dosya yeniden açılırsa kopya oluşmaz', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    model.open(file('/b.ts', 'b.ts'));
    model.open(file('/a.ts', 'a.ts'));
    const state = model.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.activeId).toBe('/a.ts');
  });

  it('reset tüm sekmeleri temizler', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    model.reset();
    const state = model.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeId).toBeNull();
  });

  it('activate seçilen sekmeyi aktif yapar', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    model.open(file('/b.ts', 'b.ts'));
    model.activate('/a.ts');
    expect(model.getState().activeId).toBe('/a.ts');
  });

  it('aktif sekme kapanınca sağındaki sekme aktif olur', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    model.open(file('/b.ts', 'b.ts'));
    model.open(file('/c.ts', 'c.ts'));
    model.activate('/b.ts');
    model.close('/b.ts');
    const state = model.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.activeId).toBe('/c.ts');
  });

  it('son sekme kapanınca solundaki aktif olur; hepsi kapanırsa null', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    model.open(file('/b.ts', 'b.ts'));
    model.close('/b.ts');
    expect(model.getState().activeId).toBe('/a.ts');
    model.close('/a.ts');
    const state = model.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeId).toBeNull();
  });

  it('aktif olmayan sekme kapanınca aktif sekme korunur', () => {
    const model = new TabsModel();
    model.open(file('/a.ts', 'a.ts'));
    model.open(file('/b.ts', 'b.ts'));
    model.close('/a.ts');
    expect(model.getState().activeId).toBe('/b.ts');
  });
});