import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyEdits,
  clearPending,
  isWithinRoot,
  normalizePath,
  parseEditBlocks,
  peekPending,
  resolveEditPath,
  stagePending,
  takePending,
} from './apply';
import { tabsModel } from '../core/tabs';

describe('isWithinRoot', () => {
  it('kök altını kabul eder', () => {
    expect(isWithinRoot('/p', '/p/a.ts')).toBe(true);
    expect(isWithinRoot('/p', '/p')).toBe(true);
    expect(isWithinRoot('/p/', '/p/alt/derin/b.ts')).toBe(true);
  });

  it('önek tuzağına düşmez', () => {
    expect(isWithinRoot('/p', '/p-evil/a.ts')).toBe(false);
    expect(isWithinRoot('/proj', '/proj2/x')).toBe(false);
  });

  it('.. kaçışını yakalar', () => {
    expect(isWithinRoot('/p', '/p/../disa.ts')).toBe(false);
    expect(isWithinRoot('/p', '/p/alt/../../disa.ts')).toBe(false);
    expect(isWithinRoot('/p', '/etc/passwd')).toBe(false);
  });

  it('normalizePath noktaları temizler', () => {
    expect(normalizePath('/p/./a.ts')).toBe('/p/a.ts');
    expect(normalizePath('/p/alt/../a.ts')).toBe('/p/a.ts');
  });
});

describe('resolveEditPath', () => {
  it('göreliyi köke bağlar', () => {
    expect(resolveEditPath('/p', 'src/a.ts')).toBe('/p/src/a.ts');
  });

  it('mutlak kök dışını reddeder', () => {
    expect(resolveEditPath('/p', '/baska/a.ts')).toBeNull();
    expect(resolveEditPath('/p', '../disa.ts')).toBeNull();
    expect(resolveEditPath('/p', '')).toBeNull();
  });
});

describe('parseEditBlocks', () => {
  it('yollu blokları çözer, dil bloklarını atlar', () => {
    const text = [
      '```src/a.ts',
      'const a = 1;',
      '```',
      '',
      '```ts',
      'const dil = true;',
      '```',
    ].join('\n');
    const edits = parseEditBlocks(text);
    expect(edits).toEqual([{ path: 'src/a.ts', content: 'const a = 1;' }]);
  });

  it('yolsuz bloğu atlar', () => {
    expect(parseEditBlocks('```\nçıplak\n```')).toEqual([]);
  });
});

describe('applyEdits', () => {
  afterEach(() => {
    tabsModel.reset();
  });

  it('kök içini yazar, sekmeyi tazeler', async () => {
    tabsModel.open({ path: '/p/a.ts', name: 'a.ts', content: 'eski', language: 'ts' });
    const writeFile = vi.fn(async (path: string, content: string) => ({ ok: true, path, content }));
    const report = await applyEdits({ writeFile } as never, '/p', [
      { path: 'a.ts', content: 'yeni' },
    ]);
    expect(report.applied).toEqual(['/p/a.ts']);
    expect(report.rejected).toEqual([]);
    expect(writeFile).toHaveBeenCalledWith('/p/a.ts', 'yeni');
    expect(tabsModel.getState().tabs[0]?.file.content).toBe('yeni');
  });

  it('kök dışını ve hatayı reddeder', async () => {
    const writeFile = vi.fn(async (path: string) => ({ ok: false, path, error: 'disk dolu' }));
    const report = await applyEdits({ writeFile } as never, '/p', [
      { path: '../disa.ts', content: 'x' },
      { path: 'a.ts', content: 'y' },
    ]);
    expect(report.applied).toEqual([]);
    expect(report.rejected.map((entry) => entry.path)).toEqual(['../disa.ts', '/p/a.ts']);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});

describe('pending aşamaları', () => {
  afterEach(() => {
    clearPending();
  });

  it('stage/take/peek döngüsü', () => {
    expect(peekPending()).toBeNull();
    stagePending([{ path: 'a.ts', content: 'x' }]);
    expect(peekPending()).toHaveLength(1);
    expect(takePending()).toHaveLength(1);
    expect(peekPending()).toBeNull();
  });
});
