import { describe, expect, it, vi } from 'vitest';
import { reportError } from './appErrors';
import { ErrorStore } from './errorStore';

describe('ErrorStore', () => {
  it('raporlanan hataları tek kanaldan toplar', () => {
    const store = new ErrorStore();
    const spy = vi.fn();
    store.subscribe(spy);
    reportError('İlk hata');
    expect(store.getRecords()).toHaveLength(1);
    expect(store.getRecords()[0]?.message).toBe('İlk hata');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('son beş kaydı tutar', () => {
    const store = new ErrorStore();
    for (let i = 0; i < 7; i++) {
      reportError(`Hata ${i}`);
    }
    expect(store.getRecords()).toHaveLength(5);
    expect(store.getRecords()[0]?.message).toBe('Hata 6');
  });

  it('temizleme aboneleri bilgilendirir', () => {
    const store = new ErrorStore();
    const spy = vi.fn();
    store.subscribe(spy);
    reportError('Geçici');
    store.clear();
    expect(store.getRecords()).toHaveLength(0);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});