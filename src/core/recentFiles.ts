export type RecentFile = {
  readonly path: string;
  readonly name: string;
};

export class RecentFilesModel {
  private entries: readonly RecentFile[] = [];
  private readonly listeners = new Set<() => void>();

  add(path: string): void {
    const next = this.entries.filter((entry) => entry.path !== path);
    const name = path.slice(path.lastIndexOf('/') + 1) || path;
    this.entries = [{ path, name }, ...next].slice(0, 10);
    this.emit();
  }

  list(): readonly RecentFile[] {
    return this.entries;
  }

  replace(entries: readonly RecentFile[]): void {
    this.entries = entries;
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

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const recentFiles = new RecentFilesModel();