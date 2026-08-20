import { useEffect, useState } from 'react';
import type { PaneLayout, SplitDirection } from './types';

export type PanesState = {
  readonly layout: PaneLayout;
  readonly activePaneId: string;
};

let nextPaneId = 1;

export function newPaneId(): string {
  const id = `pane-${nextPaneId}`;
  nextPaneId += 1;
  return id;
}

function leafIds(layout: PaneLayout): string[] {
  if (layout.children === undefined) return [layout.id];
  return layout.children.flatMap((child) => leafIds(child));
}

function splitAt(node: PaneLayout, targetId: string, direction: SplitDirection): PaneLayout {
  if (node.id === targetId) {
    if (node.children !== undefined) return node;
    const previous: PaneLayout = { id: node.id, direction: node.direction, root: false };
    const created: PaneLayout = { id: newPaneId(), direction: node.direction, root: false };
    return { id: node.id, direction, root: node.root, children: [previous, created] };
  }
  if (node.children === undefined) return node;
  return { ...node, children: node.children.map((child) => splitAt(child, targetId, direction)) };
}

function withoutLeaf(node: PaneLayout, targetId: string): PaneLayout | null {
  if (node.children === undefined) {
    return node.id === targetId ? null : node;
  }
  const children = node.children
    .map((child) => withoutLeaf(child, targetId))
    .filter((child): child is PaneLayout => child !== null);
  if (children.length === 0) return null;
  if (children.length === 1) {
    const lone: PaneLayout = children[0] ?? { id: node.id, direction: node.direction, root: node.root };
    if (lone.children !== undefined) {
      return { id: lone.id, direction: lone.direction, root: node.root, children: lone.children };
    }
    return { id: lone.id, direction: node.direction, root: node.root };
  }
  return { id: node.id, direction: node.direction, root: node.root, children };
}

export class PanesModel {
  private layout: PaneLayout;
  private activePaneId: string;
  private readonly listeners = new Set<() => void>();

  constructor() {
    const id = newPaneId();
    this.layout = { id, direction: 'vertical', root: true };
    this.activePaneId = id;
  }

  getState(): PanesState {
    return { layout: this.layout, activePaneId: this.activePaneId };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  split(direction: SplitDirection): void {
    this.layout = splitAt(this.layout, this.activePaneId, direction);
    const leaves = leafIds(this.layout);
    const index = leaves.indexOf(this.activePaneId);
    this.activePaneId = leaves[index + 1] ?? leaves[leaves.length - 1] ?? this.activePaneId;
    this.emit();
  }

  setActive(paneId: string): void {
    const exists = leafIds(this.layout).includes(paneId);
    if (!exists || this.activePaneId === paneId) return;
    this.activePaneId = paneId;
    this.emit();
  }

  next(): void {
    const leaves = leafIds(this.layout);
    const index = leaves.indexOf(this.activePaneId);
    const nextIndex = (index + 1) % leaves.length;
    this.setActive(leaves[nextIndex] ?? leaves[0] ?? this.activePaneId);
  }

  close(paneId: string): void {
    const leaves = leafIds(this.layout);
    if (leaves.length <= 1) return;
    const nextLayout = withoutLeaf(this.layout, paneId);
    if (nextLayout === null) return;
    this.layout = nextLayout;
    if (this.activePaneId === paneId) {
      this.setActive(leafIds(this.layout)[0] ?? this.activePaneId);
    } else {
      this.emit();
    }
  }

  reset(): void {
    const id = newPaneId();
    this.layout = { id, direction: 'vertical', root: true };
    this.activePaneId = id;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const panesModel = new PanesModel();

export function usePanes(): PanesState {
  const [state, setState] = useState<PanesState>(() => panesModel.getState());
  useEffect(() => panesModel.subscribe(() => setState(panesModel.getState())), []);
  return state;
}