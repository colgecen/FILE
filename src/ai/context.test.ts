import { describe, expect, it } from 'vitest';
import { collectProjectContext, excerptOf, renderContextBlock } from './context';

const TABS = [
  { id: '/p/a.ts', file: { path: '/p/a.ts', name: 'a.ts', content: 'const a = 1;', language: 'ts' } },
  { id: '/p/b.ts', file: { path: '/p/b.ts', name: 'b.ts', content: 'const b = 2;', language: 'ts' } },
];

describe('collectProjectContext', () => {
  it('ortam kökünü ve aktif dosyayı seçer', () => {
    const ctx = collectProjectContext({
      env: { rootPath: '/p', name: 'projem' },
      explorerRoot: '/baska',
      tabs: TABS,
      activeId: '/p/b.ts',
    });
    expect(ctx.rootPath).toBe('/p');
    expect(ctx.projectName).toBe('projem');
    expect(ctx.activeFile?.path).toBe('/p/b.ts');
    expect(ctx.openFiles.map((file) => file.name)).toEqual(['a.ts', 'b.ts']);
  });

  it('ortam yoksa gezgin köküne düşer', () => {
    const ctx = collectProjectContext({ env: null, explorerRoot: '/g', tabs: [], activeId: null });
    expect(ctx.rootPath).toBe('/g');
    expect(ctx.projectName).toBe('g');
    expect(ctx.activeFile).toBeNull();
  });

  it('kök yoksa null döner', () => {
    const ctx = collectProjectContext({ env: null, explorerRoot: null, tabs: [], activeId: null });
    expect(ctx.rootPath).toBeNull();
  });
});

describe('excerptOf', () => {
  it('kısa içeriği aynen bırakır', () => {
    expect(excerptOf('abc', 10)).toBe('abc');
  });

  it('uzunu kırpıp not düşer', () => {
    const excerpt = excerptOf('x'.repeat(100), 10);
    expect(excerpt.startsWith('x'.repeat(10))).toBe(true);
    expect(excerpt).toContain('kırpıldı');
  });
});

describe('renderContextBlock', () => {
  it('kip kuralları ve bağlamı birleştirir', () => {
    const ctx = collectProjectContext({
      env: { rootPath: '/p', name: 'projem' },
      explorerRoot: null,
      tabs: TABS,
      activeId: '/p/a.ts',
    });
    const block = renderContextBlock(ctx, 'plan');
    expect(block).toContain('PLAN MODU');
    expect(block).toContain('/p');
    expect(block).toContain('a.ts, b.ts');
    expect(block).toContain('const a = 1;');
    const build = renderContextBlock(ctx, 'build');
    expect(build).toContain('YAPIM MODU');
  });
});
