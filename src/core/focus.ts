import type { FocusZone } from './types';

type FocusZoneListener = (zone: FocusZone) => void;

const listeners = new Set<FocusZoneListener>();

let currentZone: FocusZone = 'editor';

export function getFocusZone(): FocusZone {
  return currentZone;
}

export function setFocusZone(zone: FocusZone): void {
  if (currentZone === zone) return;
  currentZone = zone;
  listeners.forEach((listener) => listener(zone));
}

export function onFocusZoneChange(listener: FocusZoneListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}