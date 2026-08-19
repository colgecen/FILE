import { describe, expect, it, vi } from 'vitest';
import { ExplorerModel } from './explorer';
import type { DirEntry, FileNode } from './types';

const folder = (path: string, name: string, children: readonly FileNode[]): FileNode => ({
  path,
  name,
  kind: 'directory',
  isOpen: false,
  children,
});

const file = (path: string, name: string): FileNode => ({
  path,
  name,
  kind: 'file',
  isOpen: false,
  children: [],
});

const TREE: readonly FileNode[] = [
  folder('/proje', 'proje', [
    folder('/proje/src', 'src', [
      file('/proje/src/main.ts', 'main.ts'),
      file('/proje/src/util.ts', 'util.ts'),
    ]),
    file('/proje/readme.md', 'readme.md'),
  ]),
];

describe('ExplorerModel satırlar', () => {
  it('genişletilmiş klasörler düzleştirilerek listelenir', () => {
    const model = new ExplorerModel();
    model.settle(TREE, '/proje');
    const rows = model.rows();
    expect(rows.map((row) => row.name)).toEqual(['proje', 'src', 'main.ts', 'util.ts', 'readme.md']);
  });

  it('dersinlik girintisi hiyerarşiyi yansıtır', () => {
    const model = new ExplorerModel();
    model.settle(TREE, '/proje');
    const rows = model.rows();
    expect(rows[0]!.depth).toBe(0);
    expect(rows[1]!.depth).toBe(1);
    expect(rows[2]!.depth).toBe(2);
  });

  it('daraltılmış klasörün çocukları görünmez', () => {
    const model = new ExplorerModel();
    model.settle(TREE, '/proje');
    model.toggleExpanded('/proje/src');
    const rows = model.rows();
    expect(rows.map((row) => row.name)).toEqual(['proje', 'src', 'readme.md']);
  });

  it('kök klasör açılışta otomatik genişler', () => {
    const model = new ExplorerModel();
    model.settle(TREE, '/proje');
    expect(model.getState().expanded.has('/proje')).toBe(true);
  });
});

describe('ExplorerModel veri kaynağı', () => {
  it('loadRoot ağacı kurar ve yükleme durumunu temizler', async () => {
    const model = new ExplorerModel();
    const readDir = vi.fn(async (): Promise<DirEntry[]> => [
      { name: 'src', path: '/proje/src', kind: 'directory' },
      { name: 'main.ts', path: '/proje/main.ts', kind: 'file' },
    ]);
    const ok = await model.loadRoot('/proje', readDir);
    expect(ok).toBe(true);
    expect(model.getState().loading).toBe(false);
    expect(model.getState().error).toBeNull();
    expect(model.getState().rootPath).toBe('/proje');
    expect(model.rows().map((row) => row.name)).toEqual(['proje', 'src', 'main.ts']);
  });

  it('loadRoot hata durumunda kırmızı göstergeyi besler', async () => {
    const model = new ExplorerModel();
    const readDir = vi.fn(async (): Promise<DirEntry[]> => {
      throw new Error('Erişim reddedildi');
    });
    const ok = await model.loadRoot('/proje', readDir);
    expect(ok).toBe(false);
    expect(model.getState().loading).toBe(false);
    expect(model.getState().error).toBe('Erişim reddedildi');
  });

  it('expandDirectory çocukları tembel okur ve genişletir', async () => {
    const model = new ExplorerModel();
    model.settle(TREE, '/proje');
    model.toggleExpanded('/proje/src');
    const readDir = vi.fn(async (): Promise<DirEntry[]> => [
      { name: 'deep.ts', path: '/proje/src/deep.ts', kind: 'file' },
    ]);
    const ok = await model.expandDirectory('/proje/src', readDir);
    expect(ok).toBe(true);
    expect(model.rows().map((row) => row.name)).toEqual([
      'proje',
      'src',
      'deep.ts',
      'readme.md',
    ]);
    expect(readDir).toHaveBeenCalledWith('/proje/src');
  });

  it('toggleFolder daraltır, tembel okumada genişletir', async () => {
    const model = new ExplorerModel();
    model.settle(TREE, '/proje');
    await model.toggleFolder('/proje/src', vi.fn());
    expect(model.getState().expanded.has('/proje/src')).toBe(false);
    const readDir = vi.fn(async (): Promise<DirEntry[]> => [
      { name: 'yeni.ts', path: '/proje/src/yeni.ts', kind: 'file' },
    ]);
    await model.toggleFolder('/proje/src', readDir);
    expect(model.getState().expanded.has('/proje/src')).toBe(true);
    expect(model.rows().map((row) => row.name)).toContain('yeni.ts');
  });

  it('pickAndLoad seçilen klasörü kök olarak yükler', async () => {
    const model = new ExplorerModel();
    const openFolder = vi.fn(async () => ({ path: '/proje', name: 'proje' }));
    const readDir = vi.fn(async (): Promise<DirEntry[]> => [
      { name: 'main.ts', path: '/proje/main.ts', kind: 'file' },
    ]);
    const ok = await model.pickAndLoad(openFolder, readDir);
    expect(ok).toBe(true);
    expect(model.getState().rootPath).toBe('/proje');
    expect(model.rows().map((row) => row.name)).toEqual(['proje', 'main.ts']);
  });

  it('pickAndLoad iptalde ağacı değiştirmez', async () => {
    const model = new ExplorerModel();
    const ok = await model.pickAndLoad(
      vi.fn(async () => null),
      vi.fn(async (): Promise<DirEntry[]> => []),
    );
    expect(ok).toBe(false);
    expect(model.getState().rootPath).toBeNull();
  });
});