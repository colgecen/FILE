import { useEffect, useState } from 'react';

export class SaveSignal {
  private readonly listeners = new Set<() => void>();

  emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const saveSignal = new SaveSignal();

const FLASH_MS = 600;

export function useSaveFlash(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer = 0;
    return saveSignal.subscribe(() => {
      setActive(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActive(false), FLASH_MS);
    });
  }, []);

  return active;
}