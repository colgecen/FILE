export type ClipboardEntry = {
  readonly text: string;
  readonly at: number;
};

const MAX_ENTRIES = 20;

class ClipboardHistoryModel {
  private entries: ClipboardEntry[] = [];

  push(text: string): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    if (this.entries[0]?.text === trimmed) return;
    this.entries = [{ text: trimmed, at: Date.now() }, ...this.entries].slice(0, MAX_ENTRIES);
  }

  list(): readonly ClipboardEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }
}

export const clipboardHistory = new ClipboardHistoryModel();
