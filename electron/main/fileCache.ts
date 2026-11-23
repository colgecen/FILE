import type { OpenFileResult } from '../shared/api-types';

type FileStat = {
  readonly mtimeMs: number;
  readonly size: number;
};

type CacheEntry = {
  readonly mtimeMs: number;
  readonly size: number;
  readonly value: OpenFileResult;
  readonly bytes: number;
};

/**
 * Small LRU cache for text file reads. Embedded in the main process so a
 * repeated open (recent file, closed tab, prefetch) does not hit the disk.
 * Entries are invalidated by mtime/size and on every successful write.
 */
export class TextFileCache {
  private readonly entries = new Map<string, CacheEntry>();
  private totalBytes = 0;

  constructor(
    private readonly maxBytes = 48 * 1024 * 1024,
    private readonly maxEntries = 64,
  ) {}

  get(path: string, stat: FileStat): OpenFileResult | null {
    const entry = this.entries.get(path);
    if (entry === undefined) return null;
    if (entry.mtimeMs !== stat.mtimeMs || entry.size !== stat.size) {
      this.delete(path);
      return null;
    }
    // Refresh insertion order for LRU eviction.
    this.entries.delete(path);
    this.entries.set(path, entry);
    return entry.value;
  }

  set(path: string, stat: FileStat, value: OpenFileResult): void {
    const bytes = value.content.length;
    if (bytes > this.maxBytes) return;
    this.delete(path);
    this.entries.set(path, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      value,
      bytes,
    });
    this.totalBytes += bytes;
    while (
      this.entries.size > this.maxEntries ||
      (this.totalBytes > this.maxBytes && this.entries.size > 1)
    ) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.delete(oldest);
    }
  }

  invalidate(path: string): void {
    this.delete(path);
  }

  clear(): void {
    this.entries.clear();
    this.totalBytes = 0;
  }

  private delete(path: string): void {
    const entry = this.entries.get(path);
    if (entry === undefined) return;
    this.entries.delete(path);
    this.totalBytes -= entry.bytes;
  }
}

export const textFileCache = new TextFileCache();
