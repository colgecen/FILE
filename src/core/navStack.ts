import type { TargetPosition } from './bookmarkNav';

export class NavStackModel {
  private back: readonly TargetPosition[] = [];
  private forward: readonly TargetPosition[] = [];
  private readonly listeners = new Set<() => void>();

  recordBack(target: TargetPosition): void {
    this.back = [...this.back, target].slice(-50);
    this.forward = [];
    this.emit();
  }

  stepBack(): TargetPosition | null {
    const index = this.back.length - 1;
    if (index < 0) return null;
    const next = this.back[index] ?? null;
    this.back = this.back.slice(0, -1);
    if (next !== null) {
      this.forward = [next, ...this.forward].slice(0, 50);
    }
    this.emit();
    return next;
  }

  stepForward(): TargetPosition | null {
    if (this.forward.length === 0) return null;
    const next = this.forward[0] ?? null;
    this.forward = this.forward.slice(1);
    if (next !== null) {
      this.back = [...this.back, next].slice(-50);
    }
    this.emit();
    return next;
  }

  reset(): void {
    this.back = [];
    this.forward = [];
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

export const navStackModel = new NavStackModel();