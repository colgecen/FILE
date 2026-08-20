import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL } from './models';
import { loadActiveModel, saveActiveModel } from './modelStore';

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