import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryModel, timestampLabel } from './history';

describe('HistoryModel', () => {
  let model: HistoryModel;

  beforeEach(() => {
    model = new HistoryModel();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounce sonrası içerik kaydı ekler', () => {
    model.capture('/a.ts', 'ilk');
    expect(model.list('/a.ts')).toHaveLength(0);
    vi.advanceTimersByTime(700);
    const entries = model.list('/a.ts');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ path: '/a.ts', content: 'ilk' });
  });

  it('aynı içeriği ikinci kez kaydetmez', () => {
    model.capture('/a.ts', 'ilk');
    vi.advanceTimersByTime(700);
    model.capture('/a.ts', 'ilk');
    vi.advanceTimersByTime(700);
    expect(model.list('/a.ts')).toHaveLength(1);
  });

  it('debounce penceresi içinde son içeriği kaydeder', () => {
    model.capture('/a.ts', 'bir');
    vi.advanceTimersByTime(300);
    model.capture('/a.ts', 'iki');
    vi.advanceTimersByTime(300);
    model.capture('/a.ts', 'üç');
    vi.advanceTimersByTime(700);
    expect(model.list('/a.ts').map((entry) => entry.content)).toEqual(['üç']);
  });

  it('en fazla otuz kayıt tutar', () => {
    for (let index = 0; index < 35; index++) {
      model.capture('/a.ts', `içerik-${index}`);
      vi.advanceTimersByTime(700);
    }
    const entries = model.list('/a.ts');
    expect(entries).toHaveLength(30);
    expect(entries[0]?.content).toBe('içerik-5');
  });

  it('temizleme kayıtları siler ve beklemedeki zamanlayıcıyı iptal eder', () => {
    model.capture('/a.ts', 'geçici');
    model.clear('/a.ts');
    vi.advanceTimersByTime(700);
    expect(model.list('/a.ts')).toHaveLength(0);
  });

  it('dosya yollarını ayırt eder', () => {
    model.capture('/a.ts', 'a');
    model.capture('/b.ts', 'b');
    vi.advanceTimersByTime(700);
    expect(model.list('/a.ts').map((entry) => entry.content)).toEqual(['a']);
    expect(model.list('/b.ts').map((entry) => entry.content)).toEqual(['b']);
  });
});

describe('timestampLabel', () => {
  it('saat:dakika:saniye biçiminde etiket üretir', () => {
    const date = new Date('2026-08-20T14:07:09');
    expect(timestampLabel(date.getTime())).toBe('14:07:09');
  });
});