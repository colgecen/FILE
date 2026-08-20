import { describe, expect, it } from 'vitest';
import { registerDefaultBindings } from './defaultBindings';
import { Keymap } from './keymap';

function createKeymap(): Keymap {
  const keymap = new Keymap();
  registerDefaultBindings(keymap);
  return keymap;
}

describe('registerDefaultBindings çoklu imleç', () => {
  it('imleç yukarı/aşağı editor bölgesinde bağlıdır', () => {
    const keymap = createKeymap();
    expect(keymap.resolve(['Control+Alt+ArrowUp'], 'editor')?.commandId).toBe('cursor.up');
    expect(keymap.resolve(['Control+Alt+ArrowDown'], 'editor')?.commandId).toBe('cursor.down');
  });

  it('her yerde imleç editor bölgesinde bağlıdır', () => {
    const keymap = createKeymap();
    expect(keymap.resolve(['Control+Shift+l'], 'editor')?.commandId).toBe('cursor.all');
  });

  it('editor bağlamaları genel bağlamayı yok saymaz', () => {
    const keymap = createKeymap();
    expect(keymap.resolve(['Control+Alt+ArrowUp'])?.commandId).toBeUndefined();
    expect(keymap.resolve(['Control+Shift+l'])?.commandId).toBeUndefined();
  });
});