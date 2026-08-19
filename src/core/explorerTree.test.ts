import { describe, expect, it } from 'vitest';
import { buildTree, replaceChildren } from './explorerTree';
import type { DirEntry } from './types';

const entries: readonly DirEntry[] = [
  { name: 'src', path: '/proje/src', kind: 'directory' },
  { name: 'readme.md', path: '/proje/readme.md', kind: 'file' },
];

describe('buildTree', () => {
  it('kök klasör düğümünü ve çocuk girdilerini kurar', () => {
    const root = buildTree('/proje', entries);
    expect(root.kind).toBe('directory');
    expect(root.name).toBe('proje');
    expect(root.children).toHaveLength(2);
    expect(root.children[0]).toMatchObject({
      name: 'src',
      path: '/proje/src',
      kind: 'directory',
    });
    expect(root.children[1]).toMatchObject({
      name: 'readme.md',
      path: '/proje/readme.md',
      kind: 'file',
    });
  });

  it('klasör girdileri boş çocuklarla başlar (tembel okuma)', () => {
    const root = buildTree('/proje', entries);
    expect(root.children[0]!.children).toEqual([]);
  });
});

describe('replaceChildren', () => {
  it('hedef klasörün çocuklarını yeni girdilerle değiştirir', () => {
    const root = buildTree('/proje', entries);
    const updated = replaceChildren([root], '/proje/src', [
      { name: 'main.ts', path: '/proje/src/main.ts', kind: 'file' },
    ]);
    expect(updated[0]!.children[0]!.children).toHaveLength(1);
    expect(updated[0]!.children[0]!.children[0]!.name).toBe('main.ts');
    expect(updated[0]!.children[1]!.name).toBe('readme.md');
  });

  it('hedef bulunamazsa ağaç değişmez', () => {
    const root = buildTree('/proje', entries);
    const updated = replaceChildren([root], '/yok', [
      { name: 'a.txt', path: '/yok/a.txt', kind: 'file' },
    ]);
    expect(updated[0]).toEqual(root);
  });
});