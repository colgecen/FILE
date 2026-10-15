import { afterEach, describe, expect, it } from 'vitest';
import { loadActiveModel, loadActiveRef, saveActiveModel, saveActiveRef } from './modelStore';
import { DEFAULT_MODEL } from './models';

describe('modelStore', () => {
  it('kaydedilen model geri yüklenir', () => {
    saveActiveModel('Qwen/Qwen2.5-1.5B-Instruct');
    expect(loadActiveModel()).toBe('Qwen/Qwen2.5-1.5B-Instruct');
  });

  it('kayıt yoksa varsayılan model gelir', () => {
    localStorage.removeItem('editor.activeModel');
    expect(loadActiveModel()).toBe(DEFAULT_MODEL);
  });

  it('geçersiz kayıt varsayılana düşer', () => {
    localStorage.setItem('editor.activeModel', 'bilinmeyen/model');
    expect(loadActiveModel()).toBe(DEFAULT_MODEL);
  });
});

describe('loadActiveRef/saveActiveRef', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('varsayılan yerleşik modeldir', () => {
    expect(loadActiveRef()).toEqual({ id: DEFAULT_MODEL, provider: 'builtin' });
  });

  it('kaydedip geri okur', () => {
    saveActiveRef({ id: 'llama3', provider: 'ollama' });
    expect(loadActiveRef()).toEqual({ id: 'llama3', provider: 'ollama' });
  });

  it('eski anahtardan taşır', () => {
    localStorage.setItem('editor.activeModel', 'Qwen/Qwen2.5-1.5B-Instruct');
    expect(loadActiveRef()).toEqual({ id: 'Qwen/Qwen2.5-1.5B-Instruct', provider: 'builtin' });
  });

  it('bozuk girdide varsayılana düşer', () => {
    localStorage.setItem('ai.activeRef', 'bozuk-json{');
    expect(loadActiveRef()).toEqual({ id: DEFAULT_MODEL, provider: 'builtin' });
    localStorage.setItem('ai.activeRef', JSON.stringify({ id: 'x', provider: 'bilinmez' }));
    expect(loadActiveRef()).toEqual({ id: DEFAULT_MODEL, provider: 'builtin' });
  });
});
