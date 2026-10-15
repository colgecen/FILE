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
  const raw = event.key === ' ' ? 'Space' : event.key;
  const primary = raw.length === 1 && !NAMED_KEYS.has(raw) ? raw.toLowerCase() : raw;
  chord.push(primary);
  return chord.join('+');
}

export class KeyboardController {
  private readonly keymap: Keymap;
  private readonly registry: CommandRegistry;
  private readonly detachers = new WeakMap<EventTarget, () => void>();
  private pendingPrefix: string | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(keymap: Keymap, registry: CommandRegistry) {
    this.keymap = keymap;
    this.registry = registry;
  }

  handle(event: KeyboardEvent): boolean {
    const chord = keyChordFromEvent(event);
    if (chord === null) return false;
    const zone = getFocusZone();
    if (this.pendingPrefix !== null) {
      const first = this.pendingPrefix;
      this.clearPending();
      if (chord !== 'Escape') {
        const binding = this.keymap.resolve([first, chord], zone);
        if (binding === undefined) return false;
        event.preventDefault();
        void this.registry.run(binding.commandId);
        return true;
      }
    }
    const binding = this.keymap.resolve([chord], zone);
    if (binding !== undefined) {
      event.preventDefault();
      void this.registry.run(binding.commandId);
      return true;
    }
    if (this.keymap.hasPrefix(chord, zone)) {
      event.preventDefault();
      this.pendingPrefix = chord;
      this.pendingTimer = setTimeout(() => {
        this.pendingPrefix = null;
        this.pendingTimer = undefined;
      }, 1500);
      return true;
    }
    return false;
  }

  private clearPending(): void {
    this.pendingPrefix = null;
    if (this.pendingTimer !== undefined) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = undefined;
    }
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