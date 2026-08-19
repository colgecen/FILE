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
});