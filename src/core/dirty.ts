type DirtyListener = (paths: ReadonlySet<string>) => void;

export class DirtyTracker {
  private readonly dirtyPaths = new Set<string>();
  private readonly listeners = new Set<DirtyListener>();

  markDirty(path: string): void {
    if (this.dirtyPaths.has(path)) return;
    this.dirtyPaths.add(path);
    this.emit();
  }

  clearDirty(path: string): void {
    if (!this.dirtyPaths.delete(path)) return;
    this.emit();
  }

  isDirty(path: string): boolean {
    return this.dirtyPaths.has(path);
  }

  hasAny(): boolean {
    return this.dirtyPaths.size > 0;
  }

  snapshot(): ReadonlySet<string> {
    return new Set(this.dirtyPaths);
  }

  subscribe(listener: DirtyListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const dirtyTracker = new DirtyTracker();