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

const DIGIT_CODE = /^Digit(\d)$/;

export function keyChordsFromEvent(event: KeyboardEvent): string[] {
  const base = keyChordFromEvent(event);
  if (base === null) return [];
  const chords = [base];
  const match = DIGIT_CODE.exec(event.code ?? '');
  const digit = match?.[1];
  if (digit !== undefined && event.key !== digit) {
    const parts = base.split('+');
    parts.pop();
    parts.push(digit);
    const alt = parts.join('+');
    if (alt !== base) chords.push(alt);
  }
  return chords;
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
    const chords = keyChordsFromEvent(event);
    const chord = chords[0] ?? '';
    if (chords.length === 0) return false;
    const zone = getFocusZone();
    if (this.pendingPrefix !== null) {
      const first = this.pendingPrefix;
      this.clearPending();
      if (chord !== 'Escape') {
        for (const candidate of chords) {
          const binding = this.keymap.resolve([first, candidate], zone);
          if (binding === undefined) continue;
          event.preventDefault();
          void this.registry.run(binding.commandId);
          return true;
        }
        return false;
      }
    }
    for (const candidate of chords) {
      const binding = this.keymap.resolve([candidate], zone);
      if (binding === undefined) continue;
      event.preventDefault();
      void this.registry.run(binding.commandId);
      return true;
    }
    if (chords.some((candidate) => this.keymap.hasPrefix(candidate, zone))) {
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