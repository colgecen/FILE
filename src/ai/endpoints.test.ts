import { afterEach, describe, expect, it } from 'vitest';
import { loadCustomUrl, resolveEndpoint, saveCustomUrl } from './endpoints';

describe('resolveEndpoint', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('bilinen sağlayıcının varsayılanını döner', () => {
    const endpoint = resolveEndpoint('ollama');
    expect(endpoint).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      keyEnv: null,
      keyRequired: false,
    });
  });

  it('bulut sağlayıcı anahtar ister', () => {
    const endpoint = resolveEndpoint('openai');
    expect(endpoint).toEqual({
      baseUrl: 'https://api.openai.com/v1',
      keyEnv: 'OPENAI_API_KEY',
      keyRequired: true,
    });
  });

  it('özel endpoint girilmeden hata verir', () => {
    expect(resolveEndpoint('custom')).toEqual({ error: 'Özel endpoint girilmedi' });
    saveCustomUrl('http://ev:8080/v1');
    expect(loadCustomUrl()).toBe('http://ev:8080/v1');
    expect(resolveEndpoint('custom')).toEqual({ baseUrl: 'http://ev:8080/v1', keyEnv: null, keyRequired: false });
  });

  it('yerleşik ve bilinmeyen reddedilir', () => {
    expect(resolveEndpoint('builtin')).toEqual({ error: 'Yerleşik model uzak endpoint kullanmaz' });
    expect(resolveEndpoint('yok' as never)).toEqual({ error: 'Bilinmeyen sağlayıcı' });
  });
});
