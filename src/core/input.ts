import type { CommandRegistry } from './commands';
import { getFocusZone } from './focus';
import type { Keymap } from './keymap';

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

const NAMED_KEYS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'Escape',
  'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Space',
]);

export function keyChordFromEvent(event: KeyboardEvent): string | null {
  if (event.key === 'Dead' || event.key === '') return null;
  if (MODIFIER_KEYS.has(event.key)) return null;
  const chord: string[] = [];
  if (event.ctrlKey) chord.push('Control');
  if (event.metaKey) chord.push('Meta');
  if (event.altKey) chord.push('Alt');
  if (event.shiftKey) chord.push('Shift');
  const primary =
    event.key.length === 1 && !NAMED_KEYS.has(event.key) ? event.key.toLowerCase() : event.key;
  chord.push(primary);
  return chord.join('+');
}

export class KeyboardController {
  private readonly keymap: Keymap;
  private readonly registry: CommandRegistry;
  private readonly detachers = new WeakMap<EventTarget, () => void>();

  constructor(keymap: Keymap, registry: CommandRegistry) {
    this.keymap = keymap;
    this.registry = registry;
  }

  handle(event: KeyboardEvent): boolean {
    const chord = keyChordFromEvent(event);
    if (chord === null) return false;
    const binding = this.keymap.resolve([chord], getFocusZone());
    if (!binding) return false;
    event.preventDefault();
    void this.registry.run(binding.commandId);
    return true;
  }

  attach(target: EventTarget): () => void {
    const existing = this.detachers.get(target);
    if (existing !== undefined) return existing;
    const listener = (event: Event): void => {
      if (event instanceof KeyboardEvent) {
        this.handle(event);
      }
    };
    target.addEventListener('keydown', listener);
    const detach = (): void => {
      target.removeEventListener('keydown', listener);
      this.detachers.delete(target);
    };
    this.detachers.set(target, detach);
    return detach;
  }
}