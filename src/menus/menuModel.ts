import { useEffect, useState } from 'react';
import { menuTree, type MenuItem } from './menuTree';

export type MenuActivateResult = {
  readonly type: 'command' | 'submenu' | 'toggle' | 'none';
  readonly commandId?: string;
};

export type MenuModelState = {
  readonly activeTop: number;
  readonly openTop: number | null;
  readonly path: readonly number[];
  readonly activeItem: number | null;
  readonly feedback: string | null;
};

const TOP_COUNT = menuTree.length;

function selectableCount(items: readonly MenuItem[]): number {
  return items.reduce((sum, item) => (item.kind === 'separator' ? sum : sum + 1), 0);
}

function firstSelectable(items: readonly MenuItem[]): number {
  return items.findIndex((item) => item.kind !== 'separator');
}

function selectableIndexOf(items: readonly MenuItem[], realIndex: number): number {
  let position = -1;
  for (let i = 0; i <= realIndex; i++) {
    if (items[i] !== undefined && items[i]!.kind !== 'separator') position++;
  }
  return position;
}

export function selectableIndexOfItems(items: readonly MenuItem[], realIndex: number): number {
  return selectableIndexOf(items, realIndex);
}

export class MenuModel {
  private state: MenuModelState = {
    activeTop: 0,
    openTop: null,
    path: [],
    activeItem: null,
    feedback: null,
  };
  private readonly listeners = new Set<() => void>();

  getState(): MenuModelState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  topCount(): number {
    return TOP_COUNT;
  }

  topLabel(index: number): string {
    return menuTree[index]?.label ?? '';
  }

  openAt(topIndex: number): void {
    const clamped = ((topIndex % TOP_COUNT) + TOP_COUNT) % TOP_COUNT;
    const items = menuTree[clamped]?.items ?? [];
    this.set({
      activeTop: clamped,
      openTop: clamped,
      path: [],
      activeItem: firstSelectable(items) >= 0 ? firstSelectable(items) : 0,
      feedback: null,
    });
  }

  close(): void {
    this.set({ openTop: null, path: [], activeItem: null, feedback: null });
  }

  moveTop(delta: number): void {
    if (this.state.openTop !== null) return;
    const next = (((this.state.activeTop + delta) % TOP_COUNT) + TOP_COUNT) % TOP_COUNT;
    this.set({ activeTop: next });
  }

  moveItem(delta: number): void {
    const items = this.itemsAtLevel();
    const count = selectableCount(items);
    if (this.state.openTop === null || count === 0) return;
    const current = this.state.activeItem ?? 0;
    const next = (((current + delta) % count) + count) % count;
    this.set({ activeItem: next });
  }

  setActiveItem(selectableIndex: number): void {
    const items = this.itemsAtLevel();
    const count = selectableCount(items);
    if (this.state.openTop === null || count === 0 || selectableIndex < 0 || selectableIndex >= count) {
      return;
    }
    this.set({ activeItem: selectableIndex });
  }

  activate(): MenuActivateResult {
    if (this.state.openTop === null) {
      this.openAt(this.state.activeTop);
      return { type: 'toggle' };
    }
    const items = this.itemsAtLevel();
    const item = this.itemAtActive(items);
    if (item === undefined || item.kind === 'separator') return { type: 'none' };
    if (item.kind === 'submenu' && item.children !== undefined) {
      const children = item.children;
      const first = firstSelectable(children);
      this.set({
        path: [...this.state.path, this.realIndexOf(items, this.state.activeItem ?? 0)],
        activeItem: first >= 0 ? first : 0,
      });
      return { type: 'submenu' };
    }
    if (item.commandId !== undefined) {
      return { type: 'command', commandId: item.commandId };
    }
    return { type: 'none' };
  }

  moveRight(): MenuActivateResult {
    return this.activate();
  }

  moveLeft(): void {
    if (this.state.path.length > 0) {
      const parentItems = this.itemsAtPath(this.state.path.slice(0, -1));
      const parentReal = this.state.path[this.state.path.length - 1] ?? 0;
      this.set({
        path: this.state.path.slice(0, -1),
        activeItem: Math.max(0, selectableIndexOf(parentItems, parentReal)),
      });
      return;
    }
    if (this.state.openTop !== null) {
      this.close();
    }
  }

  closeStep(): 'closed-submenu' | 'closed-menu' | null {
    if (this.state.path.length > 0) {
      const parentItems = this.itemsAtPath(this.state.path.slice(0, -1));
      const parentReal = this.state.path[this.state.path.length - 1] ?? 0;
      this.set({
        path: this.state.path.slice(0, -1),
        activeItem: Math.max(0, selectableIndexOf(parentItems, parentReal)),
      });
      return 'closed-submenu';
    }
    if (this.state.openTop !== null) {
      this.close();
      return 'closed-menu';
    }
    return null;
  }

  setFeedback(text: string | null): void {
    if (this.state.feedback === text) return;
    this.set({ feedback: text });
  }

  itemLabel(): string | null {
    const items = this.itemsAtLevel();
    const item = this.itemAtActive(items);
    return item === undefined ? null : item.label;
  }

  currentItems(): readonly MenuItem[] {
    return this.itemsAtLevel();
  }

  currentPathLabel(): string {
    return this.state.path.length === 0
      ? menuTree[this.state.openTop ?? 0]?.label ?? ''
      : this.itemLabel() ?? '';
  }

  private itemsAtLevel(): readonly MenuItem[] {
    return this.itemsAtPath(this.state.path);
  }

  private itemsAtPath(path: readonly number[]): readonly MenuItem[] {
    if (this.state.openTop === null) return [];
    let level: readonly MenuItem[] = menuTree[this.state.openTop]?.items ?? [];
    for (const idx of path) {
      const item = level[idx];
      if (item?.kind !== 'submenu' || item.children === undefined) {
        return [];
      }
      level = item.children;
    }
    return level;
  }

  private itemAtActive(items: readonly MenuItem[]): MenuItem | undefined {
    const real = this.realIndexOf(items, this.state.activeItem ?? 0);
    return real === -1 ? undefined : items[real];
  }

  private realIndexOf(items: readonly MenuItem[], selectable: number): number {
    let seen = -1;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === undefined) continue;
      if (item.kind !== 'separator') seen++;
      if (seen === selectable) return i;
    }
    return -1;
  }

  private set(patch: Partial<MenuModelState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}

export const menuModel = new MenuModel();

export function useMenuModelState(): MenuModelState {
  const [state, setState] = useState<MenuModelState>(() => menuModel.getState());
  useEffect(() => menuModel.subscribe(() => setState(menuModel.getState())), []);
  return state;
}