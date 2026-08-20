export type HistoryEntry = {
  readonly path: string;
  readonly content: string;
  readonly at: number;
};

const MAX_ENTRIES = 30;
const DEBOUNCE_MS = 600;

export class HistoryModel {
  private entriesByPath = new Map<string, readonly HistoryEntry[]>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly listeners = new Set<() => void>();

  capture(path: string, content: string): void {
    const existing = this.timers.get(path);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.timers.delete(path);
      this.push(path, content);
    }, DEBOUNCE_MS);
    this.timers.set(path, timer);
  }

  private push(path: string, content: string): void {
    const current = this.entriesByPath.get(path) ?? [];
    const last = current[current.length - 1];
    if (last !== undefined && last.content === content) return;
    const entry: HistoryEntry = { path, content, at: Date.now() };
    const next = [...current, entry].slice(-MAX_ENTRIES);
    this.entriesByPath.set(path, next);
    this.emit();
  }

  list(path: string): readonly HistoryEntry[] {
    return this.entriesByPath.get(path) ?? [];
  }

  clear(path: string): void {
    const timer = this.timers.get(path);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(path);
    }
    this.entriesByPath.delete(path);
    this.emit();
  }

  reset(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.entriesByPath.clear();
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

export const historyModel = new HistoryModel();

export function timestampLabel(at: number): string {
  const date = new Date(at);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}