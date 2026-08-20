import { beforeEach, describe, expect, it } from 'vitest';
import { CursorModel } from './cursor';

describe('CursorModel', () => {
  const model = new CursorModel();

  beforeEach(() => {
    model.reset();
  });

  it('başlangıçta dosya seçili değilken 1:1 konum verir', () => {
    expect(model.getState()).toEqual({ path: null, line: 1, column: 1 });
  });

  it('imleç konumunu günceller', () => {
    model.update('/a.ts', 12, 4);
    expect(model.getState()).toEqual({ path: '/a.ts', line: 12, column: 4 });
  });

  it('aboneleri bildirir', () => {
    const seen: Array<{ path: string | null; line: number; column: number }> = [];
    const unsubscribe = model.subscribe(() => seen.push(model.getState()));
    model.update('/b.ts', 3, 7);
    unsubscribe();
    expect(seen).toEqual([{ path: '/b.ts', line: 3, column: 7 }]);
  });

  it('reset başlangıç durumuna döner', () => {
    model.update('/a.ts', 5, 5);
    model.reset();
    expect(model.getState()).toEqual({ path: null, line: 1, column: 1 });
  });
});