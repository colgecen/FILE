export class ChatContextModel {
  private folders: string[] = [];
  private readonly listeners = new Set<() => void>();

  list(): readonly string[] {
    return this.folders;
  }

  addFolder(path: string): void {
    if (this.folders.includes(path)) return;
    this.folders = [...this.folders, path];
    this.emit();
  }

  clear(): void {
    if (this.folders.length === 0) return;
    this.folders = [];
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

export const chatContextModel = new ChatContextModel();
