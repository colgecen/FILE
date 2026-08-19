import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from './commands';
import { FocusManager, registerFocusCommands } from './focus';

describe('FocusManager', () => {
  it('bölge değişiminde öncekini yığına koyar', () => {
    const focus = new FocusManager();
    focus.set('palette');
    focus.set('explorer');
    expect(focus.returnToPrevious()).toBe('palette');
    expect(focus.returnToPrevious()).toBe('editor');
  });

  it('aynı bölge tekrar set edilirse yığına eklemez', () => {
    const focus = new FocusManager();
    focus.set('editor');
    focus.set('palette');
    focus.set('palette');
    expect(focus.returnToPrevious()).toBe('editor');
  });

  it('aboneleri bölge değişiminde bilgilendirir', () => {
    const focus = new FocusManager();
    const spy = vi.fn();
    const unsubscribe = focus.subscribe(spy);
    focus.set('palette');
    expect(spy).toHaveBeenCalledWith('palette');
    unsubscribe();
    focus.set('editor');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('komut kaydı geçişleri yalnızca komutla yapar', async () => {
    const registry = new CommandRegistry();
    registerFocusCommands(registry);
    await registry.run('focus.palette');
    await registry.run('focus.menubar');
    expect((await registry.run('focus.return')).ok).toBe(true);
  });
});