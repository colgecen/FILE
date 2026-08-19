import { useEffect, useState } from 'react';

export type ExplorerState = {
  readonly isOpen: boolean;
};

export class ExplorerModel {
  private state: ExplorerState = { isOpen: false };
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
    this.state = { isOpen: true };
    this.emit();
  }

  close(): void {
    if (!this.state.isOpen) return;
    this.state = { isOpen: false };
    this.emit();
  }

  toggle(): void {
    this.state = { isOpen: !this.state.isOpen };
    this.emit();
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