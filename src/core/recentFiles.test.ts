import { beforeEach, describe, expect, it } from 'vitest';
import { RecentFilesModel } from './recentFiles';

const memory = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, value),
  };
};

describe('RecentFilesModel', () => {
  let model: RecentFilesModel;

  beforeEach(() => {
    model = new RecentFilesModel();
  });

  it('aynı dosyayı en üste taşır ve en çok on kayıt tutar', () => {
    model.add('/a.ts');
    model.add('/b.ts');
    model.add('/a.ts');
    expect(model.list().map((entry) => entry.path)).toEqual(['/a.ts', '/b.ts']);
    for (let i = 0; i < 12; i += 1) {
      model.add(`/d${i}.ts`);
    }
    expect(model.list()).toHaveLength(10);
  });

  it('adı yoldan çıkarır', () => {
    model.add('/proje/src/main.ts');
    expect(model.list()[0]?.name).toBe('main.ts');
  });

  it('depoya yazar ve yeniden okur', () => {
    const storage = memory();
    model.attach(storage);
    model.add('/kalici.ts');

    const restored = new RecentFilesModel();
    restored.attach(storage);
    expect(restored.list().map((entry) => entry.path)).toEqual(['/kalici.ts']);
  });

  it('bozuk depo içeriğini yok sayar', () => {
    const storage = memory();
    storage.setItem('file.recent', '{{{bozuk');
    const restored = new RecentFilesModel();
    restored.attach(storage);
    expect(restored.list()).toEqual([]);
  });

  it('replace listeyi değiştirir ve depoya yazar', () => {
    const storage = memory();
    model.attach(storage);
    model.replace([{ path: '/x.ts', name: 'x.ts' }]);
    const restored = new RecentFilesModel();
    restored.attach(storage);
    expect(restored.list().map((entry) => entry.path)).toEqual(['/x.ts']);
  });
});