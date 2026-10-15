import { describe, expect, it, vi } from 'vitest';
import { scanCloudModels } from './cloudScan';

function fakeApi(overrides: Record<string, unknown> = {}): Parameters<typeof scanCloudModels>[0] {
  return {
    aiModels: vi.fn(async () => ({ ok: true, models: [] })),
    aiKeyHas: vi.fn(async () => ({ present: false })),
    aiEnvScan: vi.fn(async () => []),
    ...overrides,
  } as unknown as Parameters<typeof scanCloudModels>[0];
}

describe('scanCloudModels', () => {
  it('anahtarsız sağlayıcıyı atlar', async () => {
    const api = fakeApi();
    const result = await scanCloudModels(api, null);
    expect(result.models).toEqual([]);
    expect(api.aiModels).not.toHaveBeenCalled();
    const openai = result.probed.find((probe) => probe.provider === 'openai');
    expect(openai?.error).toBe('Anahtar yok');
  });

  it('kasadaki anahtarla bulut modelleri listeler', async () => {
    const api = fakeApi({
      aiKeyHas: vi.fn(async (provider: string) => ({ present: provider === 'groq' })),
      aiModels: vi.fn(async (args: { baseUrl: string }) =>
        args.baseUrl.includes('groq')
          ? { ok: true, models: ['llama-3.3-70b-versatile'] }
          : { ok: false, models: [], error: 'yok' },
      ),
    });
    const result = await scanCloudModels(api, null);
    expect(result.models).toEqual([
      {
        id: 'llama-3.3-70b-versatile',
        name: 'llama-3.3-70b-versatile',
        provider: 'groq',
        source: 'cloud',
      },
    ]);
  });

  it('env değişkeni de anahtar sayılır', async () => {
    const api = fakeApi({
      aiEnvScan: vi.fn(async () => [{ provider: 'deepseek', envVar: 'DEEPSEEK_API_KEY', present: true }]),
      aiModels: vi.fn(async () => ({ ok: true, models: ['deepseek-chat'] })),
    });
    const result = await scanCloudModels(api, null);
    expect(result.models.map((model) => model.id)).toContain('deepseek-chat');
  });

  it('özel endpoint adres girilmeden taranmaz', async () => {
    const api = fakeApi({
      aiKeyHas: vi.fn(async () => ({ present: true })),
      aiModels: vi.fn(async () => ({ ok: true, models: ['özel'] })),
    });
    const without = await scanCloudModels(api, null);
    expect(without.models.map((model) => model.provider)).not.toContain('custom');
    const custom = await scanCloudModels(api, 'http://ev:8080/v1');
    expect(custom.models.map((model) => model.id)).toContain('özel');
    expect(api.aiModels).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'http://ev:8080/v1', provider: 'custom' }),
    );
  });

  it('liste hatası probu düşürür, diğerleri sürer', async () => {
    const api = fakeApi({
      aiKeyHas: vi.fn(async () => ({ present: true })),
      aiModels: vi.fn(async (args: { baseUrl: string }) =>
        args.baseUrl.includes('openai')
          ? { ok: false, models: [], error: 'kota' }
          : { ok: true, models: ['m'] },
      ),
    });
    const result = await scanCloudModels(api, null);
    const openai = result.probed.find((probe) => probe.provider === 'openai');
    expect(openai?.ok).toBe(false);
    expect(result.models.length).toBeGreaterThan(0);
  });
});
