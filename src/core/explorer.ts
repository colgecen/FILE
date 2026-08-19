import { useEffect, useState } from 'react';
import type { FileNode } from './types';

export type ExplorerState = {
  readonly isOpen: boolean;
  readonly files: readonly FileNode[];
  readonly expanded: ReadonlySet<string>;
  readonly selectedPath: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rootPath: string | null;
};

export type ExplorerRow = {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'directory';
  readonly depth: number;
  readonly expanded: boolean;
};

function flatten(node: FileNode, depth: number, expanded: ReadonlySet<string>): ExplorerRow[] {
  const row: ExplorerRow = {
    path: node.path,
    name: node.name,
    kind: node.kind,
    depth,
    expanded: expanded.has(node.path),
  };
  if (node.kind === 'file' || !row.expanded) return [row];
  return [row, ...node.children.flatMap((child) => flatten(child, depth + 1, expanded))];
}

const DEFAULT_STATE: ExplorerState = {
  isOpen: false,
  files: [],
  expanded: new Set(),
  selectedPath: null,
  loading: false,
  error: null,
  rootPath: null,
};

export class ExplorerModel {
  private state: ExplorerState = DEFAULT_STATE;
  private readonly listeners = new Set<() => void>();

  getState(): ExplorerState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  open(): void {
    if (this.state.isOpen) return;
    this.state = { ...this.state, isOpen: true };
    this.emit();
  }

  close(): void {
    if (!this.state.isOpen) return;
    this.state = { ...this.state, isOpen: false };
    this.emit();
  }

  toggle(): void {
    this.state = { ...this.state, isOpen: !this.state.isOpen };
    this.emit();
  }

  settle(files: readonly FileNode[], rootPath: string): void {
    const expanded = new Set<string>();
    const collect = (nodes: readonly FileNode[]): void => {
      for (const node of nodes) {
        if (node.kind === 'directory') {
          expanded.add(node.path);
          collect(node.children);
        }
      }
    };
    collect(files);
    this.state = {
      ...this.state,
      files,
      rootPath,
      expanded,
      selectedPath: files[0]?.path ?? null,
      error: null,
    };
    this.emit();
  }

  setError(message: string): void {
    this.state = { ...this.state, error: message, loading: false };
    this.emit();
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.emit();
  }

  rows(): readonly ExplorerRow[] {
    if (this.state.files.length === 0) return [];
    return this.state.files.flatMap((node) => flatten(node, 0, this.state.expanded));
  }

  toggleExpanded(path: string): void {
    const expanded = new Set(this.state.expanded);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    this.state = { ...this.state, expanded };
    this.emit();
  }

  select(path: string): void {
    this.state = { ...this.state, selectedPath: path };
    this.emit();
  }

  selectedRow(): ExplorerRow | undefined {
    const rows = this.rows();
    return rows.find((row) => row.path === this.state.selectedPath) ?? rows[0];
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const explorerModel = new ExplorerModel();

export function useExplorerState(): ExplorerState {
  const [state, setState] = useState<ExplorerState>(() => explorerModel.getState());
  useEffect(() => explorerModel.subscribe(() => setState(explorerModel.getState())), []);
  return state;
}