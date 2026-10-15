import { describe, expect, it } from 'vitest';
import {
  PROVIDERS,
  chatCompletionsUrl,
  displayName,
  getProvider,
  isLocalProvider,
  openAIModelsUrl,
  providerNeedsKey,
} from './providers';

describe('sağlayıcı kayıtları', () => {
  it('tüm sağlayıcılar benzersiz kimlik taşır', () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bilinen sağlayıcı varsayılanları doğrudur', () => {
    expect(getProvider('ollama')?.defaultBaseUrl).toBe('http://localhost:11434/v1');
    expect(getProvider('lmstudio')?.defaultBaseUrl).toBe('http://localhost:1234/v1');
    expect(getProvider('llamacpp')?.defaultBaseUrl).toBe('http://localhost:8080/v1');
    expect(getProvider('openai')?.defaultBaseUrl).toBe('https://api.openai.com/v1');
  });

  it('yerel/bulut ayrımı doğrudur', () => {
    expect(isLocalProvider('ollama')).toBe(true);
    expect(isLocalProvider('lmstudio')).toBe(true);
    expect(isLocalProvider('llamacpp')).toBe(true);
    expect(isLocalProvider('openai')).toBe(false);
    expect(isLocalProvider('deepseek')).toBe(false);
  });

  it('anahtar gereksinimi çevre değişkenine göre belirlenir', () => {
    expect(providerNeedsKey('openai')).toBe(true);
    expect(providerNeedsKey('groq')).toBe(true);
    expect(providerNeedsKey('ollama')).toBe(false);
    expect(providerNeedsKey('custom')).toBe(false);
  });

  it('bilinmeyen sağlayıcı tanımsız döner', () => {
    expect(getProvider('yok' as never)).toBeUndefined();
  });

  it('görünen ad modele sağlayıcıyı ekler', () => {
    expect(
      displayName({ id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' }),
    ).toBe('llama3 · Ollama');
  });
});

describe('endpoint adresleri', () => {
  it('sondaki eğik çizgileri tolere eder', () => {
    expect(chatCompletionsUrl('http://localhost:1234/v1/')).toBe(
      'http://localhost:1234/v1/chat/completions',
    );
    expect(openAIModelsUrl('http://localhost:1234/v1/')).toBe('http://localhost:1234/v1/models');
  });

  it('normal taban adrese ek yapar', () => {
    expect(chatCompletionsUrl('https://api.openai.com/v1')).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
  });
});
