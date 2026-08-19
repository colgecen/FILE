import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './fuzzy';

describe('fuzzyScore', () => {
  it('tam alt dize en yüksek puanı alır', () => {
    const exact = fuzzyScore('kaydet', 'Kaydet')!;
    const scattered = fuzzyScore('kdt', 'Kaydet')!;
    expect(exact.score).toBeGreaterThan(scattered.score);
  });

  it('bitişik harfler dağınık harflerden yüksek puan alır', () => {
    const consecutive = fuzzyScore('kd', 'Kaydet')!;
    const distant = fuzzyScore('kt', 'Kaydet')!;
    expect(consecutive.score).toBeGreaterThan(distant.score);
  });

  it('eşleşmeyen sorgu null döner', () => {
    expect(fuzzyScore('xyz', 'Kaydet')).toBeNull();
  });

  it('büyük/küçük harf duyarsızdır', () => {
    expect(fuzzyScore('KAYDET', 'kaydet')!.score).toBeGreaterThan(0);
    expect(fuzzyScore('kay', 'KAYDET')!.score).toBeGreaterThan(0);
  });

  it('boş sorgu sıfır puanla eşleşir', () => {
    expect(fuzzyScore('', 'herhangi')!.score).toBe(0);
  });

  it('baştan eşleşme bonusu alır', () => {
    const head = fuzzyScore('k', 'Kaydet')!;
    const tail = fuzzyScore('t', 'Kaydet')!;
    expect(head.score).toBeGreaterThan(tail.score);
  });
});