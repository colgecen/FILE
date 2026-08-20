export type RecentFile = {
  readonly path: string;
  readonly name: string;
};

const STORAGE_KEY = 'file.recent';
const MAX_ENTRIES = 10;

function isRecentFile(value: unknown): value is RecentFile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RecentFile>;
  return typeof candidate.path === 'string' && typeof candidate.name === 'string';
}

export class RecentFilesModel {
  private entries: readonly RecentFile[] = [];
  private storage: Storage | null = null;
  private readonly listeners = new Set<() => void>();

  attach(storage: Storage): void {
    this.storage = storage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.entries = parsed.filter(isRecentFile).slice(0, MAX_ENTRIES);
      }
    } catch {
      // Bozuk depo içeriği yok sayılır
    }
  }

  add(path: string): void {
    const next = this.entries.filter((entry) => entry.path !== path);
    const name = path.slice(path.lastIndexOf('/') + 1) || path;
    this.entries = [{ path, name }, ...next].slice(0, MAX_ENTRIES);
    this.persist();
    this.emit();
  }

  list(): readonly RecentFile[] {
    return this.entries;
  }

  replace(entries: readonly RecentFile[]): void {
    this.entries = entries.slice(0, MAX_ENTRIES);
    this.persist();
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.entries = [];
    this.emit();
  }

  private persist(): void {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.entries));
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const recentFiles = new RecentFilesModel();