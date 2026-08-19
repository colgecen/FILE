import type { FocusZone, KeyBinding } from './types';

type KeymapListeners = {
  onConflict: (binding: KeyBinding, existing: KeyBinding) => void;
};

type KeymapNormalizers = {
  normalize?: (raw: string) => string;
};

export class Keymap {
  private readonly bindings = new Map<string, KeyBinding>();
  private readonly zoneBindings = new Map<FocusZone, Map<string, KeyBinding>>();
  private readonly listeners: KeymapListeners;
  private readonly normalize: (raw: string) => string;

  constructor(listeners?: Partial<KeymapListeners>, options?: KeymapNormalizers) {
    this.listeners = {
      onConflict: () => undefined,
      ...listeners,
    };
    this.normalize = options?.normalize ?? ((raw: string) => raw.toLowerCase().trim());
  }

  bind(binding: KeyBinding, zone?: FocusZone): void {
    const key = this.normalize(binding.keys.join('+'));
    const target = zone === undefined ? this.bindings : (this.zoneBindings.get(zone) ?? new Map());

    const existing = target.get(key);
    if (existing && existing.id !== binding.id) {
      this.listeners.onConflict(binding, existing);
    }
    target.set(key, binding);

    if (zone !== undefined) {
      this.zoneBindings.set(zone, target);
    }
  }

  resolve(keys: readonly string[], zone?: FocusZone): KeyBinding | undefined {
    const key = this.normalize(keys.join('+'));
    const zoned = zone === undefined ? undefined : this.zoneBindings.get(zone)?.get(key);
    return zoned ?? this.bindings.get(key);
  }

  listByZone(zone: FocusZone): readonly KeyBinding[] {
    return [...(this.zoneBindings.get(zone)?.values() ?? [])];
  }

  listAll(): readonly KeyBinding[] {
    return [...this.bindings.values()];
  }
}