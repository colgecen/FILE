import { useEffect, useState } from 'react';

export type ViewModeState = {
  readonly fullscreen: boolean;
  readonly wordWrap: 'on' | 'off';
};

export class ViewModeModel {
  private state: ViewModeState = { fullscreen: false, wordWrap: 'on' };
  private readonly listeners = new Set<() => void>();

  getState(): ViewModeState {
    return this.state;
  }

  setFullscreen(enabled: boolean): void {
    if (enabled === this.state.fullscreen) return;
    this.state = { ...this.state, fullscreen: enabled };
    this.emit();
  }

  setWordWrap(enabled: 'on' | 'off'): void {
    if (this.state.wordWrap === enabled) return;
    this.state = { ...this.state, wordWrap: enabled };
    this.emit();
  }

  toggleWordWrap(): void {
    this.state = {
      ...this.state,
      wordWrap: this.state.wordWrap === 'on' ? 'off' : 'on',
    };
    this.emit();
  }

  reset(): void {
    this.state = { fullscreen: false, wordWrap: 'on' };
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const viewModeModel = new ViewModeModel();

export function useViewMode(): ViewModeState {
  const [state, setState] = useState<ViewModeState>(() => viewModeModel.getState());
  useEffect(() => viewModeModel.subscribe(() => setState(viewModeModel.getState())), []);
  return state;
}
