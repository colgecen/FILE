import { useEffect, useState } from 'react';

export type AgentPermission = 'auto' | 'confirm';

export type AgentDecision = 'allow' | 'deny';

export type PendingTool = {
  readonly id: string;
  readonly name: string;
  readonly args: readonly string[];
  readonly preview: string;
  readonly danger: boolean;
  resolve: (decision: AgentDecision) => void;
};

type Listener = (pending: readonly PendingTool[]) => void;

class AgentModel {
  private pending: PendingTool[] = [];
  private listeners = new Set<Listener>();
  private seq = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = [...this.pending];
    for (const listener of this.listeners) listener(snapshot);
  }

  getPending(): readonly PendingTool[] {
    return this.pending;
  }

  request(tool: Omit<PendingTool, 'id' | 'resolve'>, resolve: (d: AgentDecision) => void): void {
    this.seq += 1;
    this.pending = [...this.pending, { ...tool, id: `tool-${this.seq}`, resolve }];
    this.emit();
  }

  decide(id: string, decision: AgentDecision): void {
    const target = this.pending.find((entry) => entry.id === id);
    if (target === undefined) return;
    this.pending = this.pending.filter((entry) => entry.id !== id);
    target.resolve(decision);
    this.emit();
  }

  clear(): void {
    for (const entry of this.pending) entry.resolve('deny');
    this.pending = [];
    this.emit();
  }
}

export const agentModel = new AgentModel();

export function useAgentPending(): readonly PendingTool[] {
  const [pending, setPending] = useState<readonly PendingTool[]>([]);
  useEffect(() => agentModel.subscribe(setPending), []);
  return pending;
}
