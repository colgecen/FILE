import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Api, OpenFileResult } from '../../electron/shared/api-types';
import { FileContentCache } from './fileCache';

const value: OpenFileResult = {
  path: '/proje/a.ts',
  name: 'a.ts',
  content: 'const a = 1;',
  language: 'typescript',
  kind: 'text',
};

function apiWith(result: OpenFileResult | null) {
  return { readFile: vi.fn().mockResolvedValue(result) } satisfies Pick<Api, 'readFile'>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FileContentCache', () => {
  it('aynı dosyayı ikinci kez API çağırmadan döndürür', async () => {
    const cache = new FileContentCache();
    const api = apiWith(value);
    expect(await cache.read(api, value.path)).toBe(value);
    expect(await cache.read(api, value.path)).toBe(value);
    expect(api.readFile).toHaveBeenCalledTimes(1);
  });

  it('eşzamanlı istekleri tek okumada birleştirir', async () => {
    const cache = new FileContentCache();
    const deferred: { resolve?: (file: OpenFileResult | null) => void } = {};
    const api = {
      readFile: vi.fn(
        () => new Promise<OpenFileResult | null>((done) => {
          deferred.resolve = done;
        }),
      ),
    } satisfies Pick<Api, 'readFile'>;
    const first = cache.read(api, value.path);
    const second = cache.read(api, value.path);
    deferred.resolve?.(value);
    await expect(first).resolves.toBe(value);
    await expect(second).resolves.toBe(value);
    expect(api.readFile).toHaveBeenCalledTimes(1);
  });

  it('kayıt geçersiz kılınınca yeniden okur', async () => {
    const cache = new FileContentCache();
    const api = apiWith(value);
    await cache.read(api, value.path);
    cache.invalidate(value.path);
    await cache.read(api, value.path);
    expect(api.readFile).toHaveBeenCalledTimes(2);
  });

  it('TTL dolunca yeniden okur', async () => {
    vi.useFakeTimers();
    const cache = new FileContentCache();
    const api = apiWith(value);
    await cache.read(api, value.path);
    vi.advanceTimersByTime(16_000);
    await cache.read(api, value.path);
    expect(api.readFile).toHaveBeenCalledTimes(2);
  });
});
