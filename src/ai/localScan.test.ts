import { describe, expect, it, vi } from 'vitest';
import { scanLocalModels } from './localScan';

function fakeApi(overrides: Record<string, unknown> = {}): Parameters<typeof scanLocalModels>[0] {
  return {
    aiPing: vi.fn(async () => ({ ok: true, status: 200 })),
    aiModels: vi.fn(async () => ({ ok: true, models: [] })),
    aiOllamaTags: vi.fn(async () => ({ ok: true, models: [] })),
    ...overrides,
  } as unknown as Parameters<typeof scanLocalModels>[0];
}

describe('scanLocalModels', () => {
  it('üç probu birleştirir', async () => {
    const api = fakeApi({
      aiOllamaTags: vi.fn(async () => ({ ok: true, models: ['llama3:latest'] })),
      aiModels: vi.fn(async (baseUrl: string) =>
        baseUrl.includes('1234') ? { ok: true, models: ['yerel-mistral'] } : { ok: true, models: [] },
      ),
    });
    const result = await scanLocalModels(api);
    expect(result.probed).toHaveLength(3);
    expect(result.probed.every((probe) => probe.ok)).toBe(true);
    expect(result.models.map((model) => model.id)).toEqual(['llama3:latest', 'yerel-mistral']);
  });

  it('çöken prob diğerlerini engellemez', async () => {
    const api = fakeApi({
      aiPing: vi.fn(async (url: string) => {
        if (url.includes('11434')) throw new Error('kapalı');
        return { ok: true, status: 200 };
      }),
      aiModels: vi.fn(async () => ({ ok: true, models: ['m1'] })),
    });
    const result = await scanLocalModels(api);
    const ollama = result.probed.find((probe) => probe.provider === 'ollama');
    expect(ollama?.ok).toBe(false);
    expect(result.models.map((model) => model.id)).toContain('m1');
  });

  it('kaynak etiketleri doğrudur', async () => {
    const api = fakeApi({
      aiOllamaTags: vi.fn(async () => ({ ok: true, models: ['llama3'] })),
      aiModels: vi.fn(async () => ({ ok: true, models: ['lm'] })),
    });
    const result = await scanLocalModels(api);
    const byId = new Map(result.models.map((model) => [model.id, model]));
    expect(byId.get('llama3')?.source).toBe('ollama');
    expect(byId.get('llama3')?.provider).toBe('ollama');
    expect(byId.get('lm')?.source).toBe('local-openai');
  });

  it('özel taban adresleri kullanılır', async () => {
    const seen: string[] = [];
    const api = fakeApi({
      aiPing: vi.fn(async (url: string) => {
        seen.push(url);
        return { ok: true, status: 200 };
      }),
    });
    await scanLocalModels(api, { ollama: 'http://192.168.1.9:11434' });
    expect(seen).toContain('http://192.168.1.9:11434');
  });
});
