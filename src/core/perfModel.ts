import { useEffect, useState } from 'react';

export type PerfState = {
  readonly telemetry: boolean;
  readonly modelLimit: number;
  readonly aiLazy: boolean;
  readonly reducedMotion: boolean;
};

const STORAGE_KEY = 'perf:state';

const DEFAULT: PerfState = {
  telemetry: true,
  modelLimit: 20,
  aiLazy: true,
  reducedMotion: false,
};

function load(): PerfState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return { ...DEFAULT, ...JSON.parse(raw) } as PerfState;
  } catch {
    // ignore
  }
  return DEFAULT;
}

export class PerfModel {
  private state: PerfState = DEFAULT;
  private readonly listeners = new Set<() => void>();

  init(): void {
    this.state = load();
    this.emit();
  }

  getState(): PerfState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  set(patch: Partial<PerfState>): void {
    this.state = { ...this.state, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const perfModel = new PerfModel();

export function usePerfState(): PerfState {
  const [state, setState] = useState<PerfState>(() => perfModel.getState());
  useEffect(() => perfModel.subscribe(() => setState(perfModel.getState())), []);
  return state;
}

export class PerfPanelModel {
  private open = false;
  private readonly listeners = new Set<() => void>();

  isOpen(): boolean {
    return this.open;
  }

  openPanel(): void {
    if (this.open) return;
    this.open = true;
    this.emit();
  }

  closePanel(): void {
    if (!this.open) return;
    this.open = false;
    this.emit();
  }

  togglePanel(): void {
    this.open = !this.open;
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

export const perfPanelModel = new PerfPanelModel();

export function usePerfPanelOpen(): boolean {
  const [open, setOpen] = useState<boolean>(() => perfPanelModel.isOpen());
  useEffect(() => perfPanelModel.subscribe(() => setOpen(perfPanelModel.isOpen())), []);
  return open;
}
