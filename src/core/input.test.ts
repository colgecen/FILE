import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from './commands';
import { Keymap } from './keymap';
import type { KeyBinding } from './types';
import { KeyboardController, keyChordFromEvent } from './input';

const binding = (id: string, commandId: string, keys: string[]): KeyBinding => ({
  id,
  commandId,
  keys,
  label: id,
});

const press = (init: KeyboardEventInit): KeyboardEvent => new KeyboardEvent('keydown', init);

describe('keyChordFromEvent', () => {
  it('ctrl+i kombinasyonunu kanonik biçime çevirir', () => {
    expect(keyChordFromEvent(press({ key: 'i', ctrlKey: true }))).toBe('Control+i');
  });

  it('shift+f3 kombinasyonunu kanonik biçime çevirir', () => {
    expect(keyChordFromEvent(press({ key: 'F3', shiftKey: true }))).toBe('Shift+F3');
  });

  it('yalnızca değiştirici tuşu yok sayar', () => {
    expect(keyChordFromEvent(press({ key: 'Shift' }))).toBeNull();
    expect(keyChordFromEvent(press({ key: 'Control' }))).toBeNull();
  });

  it('boşluk tuşunu adlandırılmış tuş olarak korur', () => {
    expect(keyChordFromEvent(press({ key: ' ' }))).toBe('Space');
  });
});

describe('KeyboardController', () => {
  it('çözülen bağlamayı çalıştırır ve varsayılan davranışı engeller', async () => {
    const run = vi.fn();
    const registry = new CommandRegistry();
    registry.register({
      id: 'menubar.toggle',
      title: 'Menü',
      category: 'view',
      run: () => {
        run();
        return { ok: true };
      },
    });
    const keymap = new Keymap();
    keymap.bind(binding('a', 'menubar.toggle', ['F1']));
    const controller = new KeyboardController(keymap, registry);

    const event = press({ key: 'F1' });
    const prevented = { value: false };
    event.preventDefault = () => {
      prevented.value = true;
    };

    const handled = controller.handle(event);
    expect(handled).toBe(true);
    expect(prevented.value).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('eşleşmeyen tuşta dokunmaz', () => {
    const run = vi.fn();
    const registry = new CommandRegistry({
      onCommandNotFound: () => undefined,
    });
    const keymap = new Keymap();
    const controller = new KeyboardController(keymap, registry);

    const event = press({ key: 'q' });
    expect(controller.handle(event)).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});