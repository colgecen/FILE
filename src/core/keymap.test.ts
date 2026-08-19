import { describe, expect, it, vi } from 'vitest';
import { Keymap } from './keymap';
import type { KeyBinding } from './types';

const binding = (id: string, keys: string[]): KeyBinding => ({
  id,
  commandId: id,
  keys,
  label: id,
});

describe('Keymap', () => {
  it('aynı tuş kombinasyonunu iki komuta bağlarsa çakışma bildirir', () => {
    const onConflict = vi.fn();
    const keymap = new Keymap({ onConflict });
    keymap.bind(binding('a', ['f1']));
    keymap.bind(binding('b', ['F1']));
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  it('bölgeye özel bağlamayı genel bağlamadan önce çözer', () => {
    const keymap = new Keymap();
    keymap.bind(binding('global', ['enter']));
    keymap.bind(binding('local', ['enter']), 'palette');
    expect(keymap.resolve(['Enter'], 'palette')?.id).toBe('local');
    expect(keymap.resolve(['Enter'])?.id).toBe('global');
  });
});