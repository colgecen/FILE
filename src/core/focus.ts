import { useEffect, useState } from 'react';
import type { CommandRegistry } from './commands';
import type { FocusZone } from './types';

type FocusZoneListener = (zone: FocusZone) => void;

export class FocusManager {
  private current: FocusZone = 'editor';
  private readonly previousStack: FocusZone[] = [];
  private readonly listeners = new Set<FocusZoneListener>();

  get(): FocusZone {
    return this.current;
  }

  set(zone: FocusZone): void {
    if (this.current === zone) return;
    this.previousStack.push(this.current);
    this.current = zone;
    this.emit(this.current);
  }

  returnToPrevious(): FocusZone {
    const previous = this.previousStack.pop() ?? 'editor';
    if (previous === this.current) return this.current;
    this.current = previous;
    this.emit(this.current);
    return this.current;
  }

  subscribe(listener: FocusZoneListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(zone: FocusZone): void {
    this.listeners.forEach((listener) => listener(zone));
  }
}

export const focusManager = new FocusManager();

export function getFocusZone(): FocusZone {
  return focusManager.get();
}

export function setFocusZone(zone: FocusZone): void {
  focusManager.set(zone);
}

export function onFocusZoneChange(listener: FocusZoneListener): () => void {
  return focusManager.subscribe(listener);
}

export function useFocusZone(): FocusZone {
  const [zone, setZone] = useState<FocusZone>(() => focusManager.get());
  useEffect(() => focusManager.subscribe(setZone), []);
  return zone;
}

export function registerFocusCommands(registry: CommandRegistry): void {
  const focusOf = (id: string, title: string, zone: FocusZone): void => {
    registry.register({
      id,
      title,
      category: 'view',
      run: () => {
        focusManager.set(zone);
        return { ok: true };
      },
    });
  };
  focusOf('focus.editor', 'Editöre geç', 'editor');
  focusOf('focus.menubar', 'Menü çubuğuna geç', 'menubar');
  focusOf('focus.palette', 'Komut paletine geç', 'palette');
  focusOf('focus.explorer', 'Gezgine geç', 'explorer');

  registry.register({
    id: 'focus.return',
    title: 'Önceki bölgeye dön',
    category: 'view',
    run: () => {
      focusManager.returnToPrevious();
      return { ok: true };
    },
  });
}