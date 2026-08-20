import { useEffect, useState } from 'react';
import type { Bookmark } from './bookmarks';
import { fuzzyScore } from './fuzzy';
import { openFilesModel, type OpenFileRef } from './openFiles';
import type { CommandDef } from './types';

export type PaletteItem = {
  readonly commandId: string;
  readonly title: string;
  readonly category: string;
  readonly keys?: string;
  readonly filePath?: string;
  readonly bookmark?: Bookmark;
};

export type PaletteState = {
  readonly query: string;
  readonly items: readonly PaletteItem[];
  readonly activeIndex: number;
};

export class PaletteModel {
  private state: PaletteState = { query: '', items: [], activeIndex: 0 };
  private readonly listeners = new Set<() => void>();

  getState(): PaletteState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(commands: readonly CommandDef[]): void {
    this.state = { query: '', items: this.buildItems(commands, ''), activeIndex: 0 };
    this.emit();
  }

  showBookmarks(bookmarks: readonly PaletteItem[]): void {
    this.state = { query: '', items: bookmarks, activeIndex: 0 };
    this.emit();
  }

  activeBookmark(): Bookmark | undefined {
    return this.state.items[this.state.activeIndex]?.bookmark;
  }

  setQuery(query: string, commands: readonly CommandDef[]): void {
    this.state = { query, items: this.buildItems(commands, query), activeIndex: 0 };
    this.emit();
  }

  move(delta: number): void {
    const count = this.state.items.length;
    if (count === 0) return;
    const next = (((this.state.activeIndex + delta) % count) + count) % count;
    this.state = { ...this.state, activeIndex: next };
    this.emit();
  }

  activeItem(): PaletteItem | undefined {
    return this.state.items[this.state.activeIndex];
  }

  private buildItems(commands: readonly CommandDef[], query: string): readonly PaletteItem[] {
    const candidate = (command: CommandDef): PaletteItem => ({
      commandId: command.id,
      title: command.title,
      category: command.category,
    });
    if (query.trim().length === 0) {
      return commands.slice(0, 12).map(candidate);
    }
    type ScoredEntry =
      | { kind: 'command'; command: CommandDef; score: number }
      | { kind: 'file'; file: OpenFileRef; score: number };
    const entries: ScoredEntry[] = [];
    for (const command of commands) {
      let bestScore = -1;
      for (const text of [command.title, ...(command.aliases ?? [])]) {
        const match = fuzzyScore(query, text);
        if (match !== null && match.score > bestScore) bestScore = match.score;
      }
      if (bestScore >= 0) entries.push({ kind: 'command', command, score: bestScore });
    }
    for (const file of openFilesModel.list()) {
      const match = fuzzyScore(query, file.name);
      if (match !== null) entries.push({ kind: 'file', file, score: match.score });
    }
    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) =>
        entry.kind === 'command'
          ? candidate(entry.command)
          : {
              commandId: 'file.open',
              title: entry.file.name,
              category: 'file',
              filePath: entry.file.path,
            },
      );
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const paletteModel = new PaletteModel();

export function usePaletteState(): PaletteState {
  const [state, setState] = useState<PaletteState>(() => paletteModel.getState());
  useEffect(() => paletteModel.subscribe(() => setState(paletteModel.getState())), []);
  return state;
}