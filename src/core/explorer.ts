import { useEffect, useState } from 'react';
import type { DirEntry, FileNode } from './types';
import { buildTree, replaceChildren } from './explorerTree';

export type ReadDir = (path: string) => Promise<DirEntry[]>;

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

  settle(files: readonly FileNode[], rootPath: string | null): void {
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
      loading: false,
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

  async loadRoot(path: string, readDir: ReadDir): Promise<boolean> {
    this.state = { ...this.state, loading: true, error: null };
    this.emit();
    try {
      const entries = await readDir(path);
      const root = buildTree(path, entries);
      this.settle([root], path);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setError(message);
      return false;
    }
  }

  async pickAndLoad(
    openFolder: () => Promise<{ readonly path: string; readonly name: string } | null>,
    readDir: ReadDir,
  ): Promise<boolean> {
    const picked = await openFolder();
    if (picked === null) return false;
    return this.loadRoot(picked.path, readDir);
  }

  async expandDirectory(path: string, readDir: ReadDir): Promise<boolean> {
    const files = this.state.files;
    if (files.length === 0) return false;
    try {
      const entries = await readDir(path);
      this.state = {
        ...this.state,
        files: replaceChildren(files, path, entries),
        expanded: new Set(this.state.expanded).add(path),
        error: null,
      };
      this.emit();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setError(message);
      return false;
    }
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

  async toggleFolder(path: string, readDir?: ReadDir): Promise<void> {
    const row = this.rows().find((candidate) => candidate.path === path);
    if (row === undefined || row.kind !== 'directory') return;
    if (row.expanded) {
      this.toggleExpanded(path);
      return;
    }
    if (readDir !== undefined) {
      await this.expandDirectory(path, readDir);
      return;
    }
    this.toggleExpanded(path);
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