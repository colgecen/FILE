import { useEffect, useState } from 'react';
import type { CommandDef } from './types';

export type PaletteItem = {
  readonly commandId: string;
  readonly title: string;
  readonly category: string;
  readonly keys?: string;
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
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return commands.slice(0, 12).map((command) => ({
        commandId: command.id,
        title: command.title,
        category: command.category,
      }));
    }
    return commands
      .filter((command) => command.title.toLowerCase().includes(normalized))
      .slice(0, 12)
      .map((command) => ({
        commandId: command.id,
        title: command.title,
        category: command.category,
      }));
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