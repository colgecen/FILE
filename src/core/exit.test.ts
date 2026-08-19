import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dirtyTracker } from './dirty';
import { ExitController } from './exit';

describe('ExitController', () => {
  const appExit = vi.fn();

  beforeEach(() => {
    appExit.mockClear();
    vi.mocked(window.api.appExit).mockImplementation(appExit);
  });

  it('kirli dosya yoksa doğrudan çıkışı tetikler', () => {
    const exit = new ExitController();
    exit.request();
    expect(appExit).toHaveBeenCalledTimes(1);
    expect(exit.isPending()).toBe(false);
  });

  it('kirli dosya varsa onay bekler; onayda çıkışı tetikler', () => {
    const exit = new ExitController();
    dirtyTracker.markDirty('/a.ts');
    exit.request();
    expect(appExit).not.toHaveBeenCalled();
    expect(exit.isPending()).toBe(true);
    exit.confirm();
    expect(appExit).toHaveBeenCalledTimes(1);
    expect(exit.isPending()).toBe(false);
    dirtyTracker.clearDirty('/a.ts');
  });

  it('iptal edilirse çıkış yapılmaz', () => {
    const exit = new ExitController();
    dirtyTracker.markDirty('/a.ts');
    exit.request();
    exit.cancel();
    expect(appExit).not.toHaveBeenCalled();
    expect(exit.isPending()).toBe(false);
    dirtyTracker.clearDirty('/a.ts');
  });

  it('durum değişimlerinde aboneleri bilgilendirir', () => {
    const exit = new ExitController();
    const spy = vi.fn();
    exit.subscribe(spy);
    dirtyTracker.markDirty('/a.ts');
    exit.request();
    expect(spy).toHaveBeenLastCalledWith(true);
    exit.cancel();
    expect(spy).toHaveBeenLastCalledWith(false);
    dirtyTracker.clearDirty('/a.ts');
  });
});