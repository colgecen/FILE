import { describe, expect, it, vi } from 'vitest';
import { DirtyTracker } from './dirty';

describe('DirtyTracker', () => {
  it('kirli yolu işaretler ve aboneleri bilgilendirir', () => {
    const tracker = new DirtyTracker();
    const spy = vi.fn();
    tracker.subscribe(spy);
    tracker.markDirty('/a.ts');
    expect(tracker.isDirty('/a.ts')).toBe(true);
    expect(tracker.hasAny()).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('temizlenen yolu listeden çıkarır', () => {
    const tracker = new DirtyTracker();
    tracker.markDirty('/a.ts');
    tracker.clearDirty('/a.ts');
    expect(tracker.isDirty('/a.ts')).toBe(false);
    expect(tracker.hasAny()).toBe(false);
  });

  it('ayrık yollarda isteğe bağlı temizlik yapar', () => {
    const tracker = new DirtyTracker();
    tracker.markDirty('/a.ts');
    tracker.markDirty('/b.ts');
    tracker.clearDirty('/a.ts');
    expect(tracker.isDirty('/b.ts')).toBe(true);
  });

  it('snapshot değişmez kopya döndürür', () => {
    const tracker = new DirtyTracker();
    tracker.markDirty('/a.ts');
    const snapshot = tracker.snapshot();
    const copy = new Set(snapshot);
    copy.add('/x.ts');
    expect(tracker.isDirty('/x.ts')).toBe(false);
    expect(snapshot.has('/x.ts')).toBe(false);
  });
});