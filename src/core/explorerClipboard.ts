import { useSyncExternalStore } from 'react';

export type ExplorerClipboardEntry = {
  readonly path: string;
  readonly name: string;
  readonly cut: boolean;
};

export class ExplorerClipboardModel {
  private entry: ExplorerClipboardEntry | null = null;
  private readonly listeners = new Set<() => void>();

  get(): ExplorerClipboardEntry | null {
    return this.entry;
  }

  set(entry: ExplorerClipboardEntry | null): void {
    this.entry = entry;
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

export const explorerClipboard = new ExplorerClipboardModel();

const subscribeClipboard = (listener: () => void): (() => void) =>
  explorerClipboard.subscribe(listener);

export function useExplorerClipboard(): ExplorerClipboardEntry | null {
  return useSyncExternalStore(
    subscribeClipboard,
    () => explorerClipboard.get(),
    () => explorerClipboard.get(),
  );
}
