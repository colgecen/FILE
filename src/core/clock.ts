import { useEffect, useState } from 'react';

export class ClockModel {
  private visible = true;
  private readonly listeners = new Set<() => void>();

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.emit();
  }

  setVisible(value: boolean): void {
    if (value === this.visible) return;
    this.visible = value;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const clockModel = new ClockModel();

export function useClockVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() => clockModel.isVisible());
  useEffect(() => clockModel.subscribe(() => setVisible(clockModel.isVisible())), []);
  return visible;
}
