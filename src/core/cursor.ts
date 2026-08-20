import { useEffect, useState } from 'react';

export type CursorState = {
  readonly path: string | null;
  readonly line: number;
  readonly column: number;
};

export class CursorModel {
  private state: CursorState = { path: null, line: 1, column: 1 };
  private readonly listeners = new Set<() => void>();

  getState(): CursorState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  update(path: string, line: number, column: number): void {
    this.state = { path, line, column };
    this.emit();
  }

  reset(): void {
    this.state = { path: null, line: 1, column: 1 };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const cursorModel = new CursorModel();

export function useCursorState(): CursorState {
  const [state, setState] = useState<CursorState>(() => cursorModel.getState());
  useEffect(() => cursorModel.subscribe(() => setState(cursorModel.getState())), []);
  return state;
}