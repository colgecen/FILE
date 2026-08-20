import { useEffect, useState } from 'react';

export class TerminalModel {
  private opened = false;
  private readonly listeners = new Set<() => void>();

  isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    this.setOpen(true);
  }

  close(): void {
    this.setOpen(false);
  }

  toggle(): void {
    this.setOpen(!this.opened);
  }

  private setOpen(value: boolean): void {
    if (value === this.opened) return;
    this.opened = value;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.opened = false;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const terminalModel = new TerminalModel();

export function useTerminalOpen(): boolean {
  const [open, setOpen] = useState<boolean>(() => terminalModel.isOpen());
  useEffect(() => terminalModel.subscribe(() => setOpen(terminalModel.isOpen())), []);
  return open;
}