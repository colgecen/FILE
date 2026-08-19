import { useEffect, useState } from 'react';
import type { CommandResult } from './types';
import type { CommandRegistry } from './commands';
import { dirtyTracker } from './dirty';

type ExitStateListener = (pending: boolean) => void;

export class ExitController {
  private pending = false;
  private readonly listeners = new Set<ExitStateListener>();

  request(): void {
    if (this.pending) return;
    if (!dirtyTracker.hasAny()) {
      void window.api.appExit();
      return;
    }
    this.pending = true;
    this.emit();
  }

  confirm(): void {
    this.pending = false;
    this.emit();
    void window.api.appExit();
  }

  cancel(): void {
    if (!this.pending) return;
    this.pending = false;
    this.emit();
  }

  isPending(): boolean {
    return this.pending;
  }

  subscribe(listener: ExitStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.pending));
  }
}

export const exitController = new ExitController();

export function useExitPending(): boolean {
  const [pending, setPending] = useState<boolean>(exitController.isPending());
  useEffect(() => exitController.subscribe(setPending), []);
  return pending;
}

export function registerExitCommands(registry: CommandRegistry): void {
  registry.register({
    id: 'file.exit',
    title: 'Çıkış',
    category: 'file',
    run: (): CommandResult => {
      exitController.request();
      return { ok: true };
    },
  });
}