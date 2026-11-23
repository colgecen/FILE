import { describe, expect, it } from 'vitest';
import type { OpenFileResult } from '../shared/api-types';
import { TextFileCache } from './fileCache';

function file(content: string): OpenFileResult {
  return {
    path: '/proje/a.ts',
    name: 'a.ts',
    content,
    language: 'typescript',
    kind: 'text',
  };
}

describe('TextFileCache', () => {
  it('aynı mtime ve boyuttaki dosyayı önbellekten döndürür', () => {
    const cache = new TextFileCache(1024, 4);
    const value = file('const a = 1;');
    cache.set('/proje/a.ts', { mtimeMs: 10, size: 12 }, value);
    expect(cache.get('/proje/a.ts', { mtimeMs: 10, size: 12 })).toBe(value);
  });

  it('mtime veya boyut değişince eski kaydı geçersiz sayar', () => {
    const cache = new TextFileCache(1024, 4);
    cache.set('/proje/a.ts', { mtimeMs: 10, size: 12 }, file('eski'));
    expect(cache.get('/proje/a.ts', { mtimeMs: 11, size: 12 })).toBeNull();
    expect(cache.get('/proje/a.ts', { mtimeMs: 10, size: 12 })).toBeNull();
  });

  it('toplam boyut sınırında en eski kayıtları atar', () => {
    const cache = new TextFileCache(8, 10);
    cache.set('/a', { mtimeMs: 1, size: 4 }, file('aaaa'));
    cache.set('/b', { mtimeMs: 1, size: 4 }, file('bbbb'));
    cache.set('/c', { mtimeMs: 1, size: 4 }, file('cccc'));
    expect(cache.get('/a', { mtimeMs: 1, size: 4 })).toBeNull();
    expect(cache.get('/c', { mtimeMs: 1, size: 4 })).not.toBeNull();
  });

  it('invalidate tek kaydı, clear tüm kayıtları temizler', () => {
    const cache = new TextFileCache(1024, 4);
    cache.set('/a', { mtimeMs: 1, size: 1 }, file('a'));
    cache.set('/b', { mtimeMs: 1, size: 1 }, file('b'));
    cache.invalidate('/a');
    expect(cache.get('/a', { mtimeMs: 1, size: 1 })).toBeNull();
    expect(cache.get('/b', { mtimeMs: 1, size: 1 })).not.toBeNull();
    cache.clear();
    expect(cache.get('/b', { mtimeMs: 1, size: 1 })).toBeNull();
  });
});
