import type { Api, OpenFileResult } from '../../electron/shared/api-types';

const MAX_ENTRIES = 24;
const MAX_BYTES = 24 * 1024 * 1024;
const TTL_MS = 15_000;

type CacheEntry = {
  readonly value: OpenFileResult;
  readonly at: number;
  readonly bytes: number;
};

/**
 * Renderer-side short-lived cache for opened files. The main process already
 * revalidates its disk cache by mtime; this layer avoids another IPC round trip
 * when a file is prefetched on hover and then clicked.
 */
export class FileContentCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<OpenFileResult | null>>();
  private totalBytes = 0;

  get(path: string): OpenFileResult | null {
    const entry = this.entries.get(path);
    if (entry === undefined) return null;
    if (Date.now() - entry.at > TTL_MS) {
      this.invalidate(path);
      return null;
    }
    this.entries.delete(path);
    this.entries.set(path, entry);
    return entry.value;
  }

  set(path: string, value: OpenFileResult): void {
    this.invalidate(path);
    const bytes = value.content.length;
    if (bytes > MAX_BYTES) return;
    this.entries.set(path, { value, at: Date.now(), bytes });
    this.totalBytes += bytes;
    while (
      this.entries.size > MAX_ENTRIES ||
      (this.totalBytes > MAX_BYTES && this.entries.size > 1)
    ) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.invalidate(oldest);
    }
  }

  invalidate(path: string): void {
    const entry = this.entries.get(path);
    if (entry === undefined) return;
    this.entries.delete(path);
    this.totalBytes -= entry.bytes;
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
    this.totalBytes = 0;
  }

  async read(
    api: Pick<Api, 'readFile'>,
    path: string,
  ): Promise<OpenFileResult | null> {
    const cached = this.get(path);
    if (cached !== null) return cached;
    const pending = this.inFlight.get(path);
    if (pending !== undefined) return pending;
    const request = api
      .readFile(path)
      .then((result) => {
        if (result !== null) this.set(path, result);
        return result;
      })
      .finally(() => {
        this.inFlight.delete(path);
      });
    this.inFlight.set(path, request);
    return request;
  }

  prefetch(api: Pick<Api, 'readFile'>, path: string): void {
    if (this.entries.has(path) || this.inFlight.has(path)) return;
    void this.read(api, path).catch(() => null);
  }
}

export const fileContentCache = new FileContentCache();
