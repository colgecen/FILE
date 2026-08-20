import { describe, expect, it } from 'vitest';
import { phaseLabel, progressPercent, statusLabel, tokenSpeedText } from './format';

describe('statusLabel', () => {
  it('sözlü etiket döndürür', () => {
    expect(statusLabel('idle')).toBe('Boşta');
    expect(statusLabel('loading')).toBe('Yükleniyor');
    expect(statusLabel('computing')).toBe('Hesaplanıyor');
    expect(statusLabel('error')).toBe('Hata');
  });
});

describe('phaseLabel', () => {
  it('aşama etiketlerini eşler', () => {
    expect(phaseLabel('downloading')).toBe('İndiriliyor');
    expect(phaseLabel('loading-model')).toBe('Model yükleniyor');
    expect(phaseLabel('generating')).toBe('Üretiliyor');
    expect(phaseLabel('idle')).toBe('Hazır');
  });
});

describe('progressPercent', () => {
  it('yüzdeyi hesaplar ve üstten sınırlar', () => {
    expect(progressPercent(10, 100)).toBe(10);
    expect(progressPercent(150, 100)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe('tokenSpeedText', () => {
  it('hızı biçimlendirir', () => {
    expect(tokenSpeedText(12.345)).toBe('12.3 tok/s');
    expect(tokenSpeedText(4)).toBe('4.0 tok/s');
  });
});