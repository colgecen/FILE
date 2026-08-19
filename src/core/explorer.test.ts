import { describe, expect, it } from 'vitest';
import { ExplorerModel } from './explorer';
import type { FileNode } from './types';

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