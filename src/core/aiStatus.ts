import { useEffect, useState } from 'react';
import type { AIStatus } from './types';

export class AIStatusModel {
  private state: AIStatus = 'idle';
  private readonly listeners = new Set<() => void>();

  getState(): AIStatus {
    return this.state;
  }

  setStatus(status: AIStatus): void {
    if (status === this.state) return;
    this.state = status;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.state = 'idle';
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const aiStatusModel = new AIStatusModel();

export function useAIStatus(): AIStatus {
  const [status, setStatus] = useState<AIStatus>(() => aiStatusModel.getState());
  useEffect(() => aiStatusModel.subscribe(() => setStatus(aiStatusModel.getState())), []);
  return status;
}