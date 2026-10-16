import { afterEach, describe, expect, it, vi } from 'vitest';
import { modelCatalog, refreshCatalogIfStale } from './catalog';
import { DEFAULT_MODEL } from './models';

function fakeRefreshApi(): Parameters<typeof refreshCatalogIfStale>[0] & {
  readonly aiOpencodeModels: ReturnType<typeof vi.fn>;
} {
  return {
    aiPing: vi.fn(async () => ({ ok: false, error: 'yok' })),
    aiModels: vi.fn(async () => ({ ok: false, models: [], error: 'yok' })),
    aiOllamaTags: vi.fn(async () => ({ ok: false, models: [], error: 'yok' })),
    aiKeyHas: vi.fn(async () => ({ present: false })),
    aiEnvScan: vi.fn(async () => []),
    aiOpencodeModels: vi.fn(async () => ({ ok: false, models: [], error: 'yok' })),
  } as unknown as Parameters<typeof refreshCatalogIfStale>[0] & {
    readonly aiOpencodeModels: ReturnType<typeof vi.fn>;
  };
}

describe('ModelCatalog', () => {
  afterEach(() => {
    modelCatalog.reset();
    localStorage.clear();
  });

  it('yerleşik modellerle başlar', () => {
    const ids = modelCatalog.all().map((entry) => entry.id);
    expect(ids).toContain('Qwen/Qwen2.5-0.5B-Instruct');
    expect(ids).toContain('Qwen/Qwen2.5-1.5B-Instruct');
    expect(modelCatalog.all().every((entry) => entry.provider === 'builtin')).toBe(true);
  });

  it('taramayı birleştirir, tekrar eklemez', () => {
    modelCatalog.setScanned([
      { id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' },
      { id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' },
    ]);
    const matches = modelCatalog.all().filter((entry) => entry.id === 'llama3');
    expect(matches).toHaveLength(1);
    expect(modelCatalog.all().map((entry) => entry.id)).toContain(DEFAULT_MODEL);
  });

  it('yeni tarama öncekinin üstüne yazar, biriktirmez', () => {
    modelCatalog.setScanned([
      { id: 'eski', name: 'eski', provider: 'ollama', source: 'ollama' },
    ]);
    modelCatalog.setScanned([
      { id: 'yeni', name: 'yeni', provider: 'ollama', source: 'ollama' },
    ]);
    const ids = modelCatalog.all().map((entry) => entry.id);
    expect(ids).toContain('yeni');
    expect(ids).not.toContain('eski');
  });

  it('find ve findById ile bulur', () => {
    modelCatalog.setScanned([
      { id: 'mistral', name: 'mistral', provider: 'ollama', source: 'ollama' },
    ]);
    expect(modelCatalog.find('ollama', 'mistral')?.name).toBe('mistral');
    expect(modelCatalog.find('lmstudio', 'mistral')).toBeUndefined();
    expect(modelCatalog.findById('mistral')?.provider).toBe('ollama');
    expect(modelCatalog.findById('yok')).toBeUndefined();
  });

  it('reset yerleşiklere döndürür', () => {
    modelCatalog.setScanned([
      { id: 'x', name: 'x', provider: 'ollama', source: 'ollama' },
    ]);
    modelCatalog.reset();
    expect(modelCatalog.all().every((entry) => entry.provider === 'builtin')).toBe(true);
  });
});

describe('refreshCatalogIfStale', () => {
  afterEach(() => {
    modelCatalog.reset();
    localStorage.clear();
  });

  it('bayat katalogu yeniler, taze katalogda tekrar taramaz', async () => {
    const api = fakeRefreshApi();
    await expect(refreshCatalogIfStale(api)).resolves.toBe(true);
    expect(api.aiOpencodeModels).toHaveBeenCalledTimes(1);

    await expect(refreshCatalogIfStale(api)).resolves.toBe(false);
    expect(api.aiOpencodeModels).toHaveBeenCalledTimes(1);
  });

  it('yaş sınırı geçilince yeniden tarar', async () => {
    const api = fakeRefreshApi();
    await expect(refreshCatalogIfStale(api)).resolves.toBe(true);
    await expect(refreshCatalogIfStale(api, -1)).resolves.toBe(true);
    expect(api.aiOpencodeModels).toHaveBeenCalledTimes(2);
  });
});
