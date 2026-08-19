import { useEffect, useState } from 'react';
import type { OpenFile } from './types';

export type Tab = {
  readonly id: string;
  readonly file: OpenFile;
};

export type TabsState = {
  readonly tabs: readonly Tab[];
  readonly activeId: string | null;
};

export class TabsModel {
  private state: TabsState = { tabs: [], activeId: null };
  private readonly listeners = new Set<() => void>();

  getState(): TabsState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  open(file: OpenFile): void {
    const existing = this.state.tabs.find((tab) => tab.id === file.path);
    if (existing !== undefined) {
      this.state = { ...this.state, activeId: existing.id };
      this.emit();
      return;
    }
    const tab: Tab = { id: file.path, file };
    this.state = { tabs: [...this.state.tabs, tab], activeId: tab.id };
    this.emit();
  }

  reset(): void {
    this.state = { tabs: [], activeId: null };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const tabsModel = new TabsModel();

export function useTabsState(): TabsState {
  const [state, setState] = useState<TabsState>(() => tabsModel.getState());
  useEffect(() => tabsModel.subscribe(() => setState(tabsModel.getState())), []);
  return state;
}