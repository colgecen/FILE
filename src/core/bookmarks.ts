export type Bookmark = {
  readonly path: string;
  readonly line: number;
  readonly column: number;
};

export class BookmarkModel {
  private entries: readonly Bookmark[] = [];
  private readonly listeners = new Set<() => void>();

  list(): readonly Bookmark[] {
    return this.entries;
  }

  has(path: string, line: number): boolean {
    return this.entries.some((bookmark) => bookmark.path === path && bookmark.line === line);
  }

  toggle(path: string, line: number, column: number): void {
    const exists = this.entries.some(
      (bookmark) => bookmark.path === path && bookmark.line === line,
    );
    if (exists) {
      this.entries = this.entries.filter(
        (bookmark) => !(bookmark.path === path && bookmark.line === line),
      );
    } else {
      this.entries = [...this.entries, { path, line, column }];
    }
    this.emit();
  }

  nextFrom(path: string, line: number): Bookmark | null {
    const sameFile = this.entries.filter((bookmark) => bookmark.path === path);
    sameFile.sort((a, b) => a.line - b.line);
    const after = sameFile.find((bookmark) => bookmark.line > line);
    if (after !== undefined) return after;
    if (sameFile.length > 0) return sameFile[0] ?? null;
    const sorted = [...this.entries].sort((a, b) => {
      if (a.path !== b.path) return a.path < b.path ? -1 : 1;
      return a.line - b.line;
    });
    return sorted[0] ?? null;
  }

  reset(): void {
    this.entries = [];
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

export const bookmarkModel = new BookmarkModel();