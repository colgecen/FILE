import { useEffect, useState } from 'react';
import type { OpenFile } from './types';

export type EnvironmentTabs = {
  readonly files: readonly OpenFile[];
  readonly activeId: string | null;
};

export type Environment = {
  readonly id: string;
  readonly name: string;
  readonly rootPath: string;
  readonly tabs: EnvironmentTabs;
  readonly browserUrl: string | null;
};

export type EnvironmentsState = {
  readonly environments: readonly Environment[];
  readonly activeId: string | null;
};

const EMPTY_TABS: EnvironmentTabs = { files: [], activeId: null };

export function baseNameOf(path: string): string {
  const parts = path.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}

export class EnvironmentsModel {
  private state: EnvironmentsState = { environments: [], activeId: null };
  private readonly listeners = new Set<() => void>();

  getState(): EnvironmentsState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  active(): Environment | null {
    return this.state.environments.find((env) => env.id === this.state.activeId) ?? null;
  }

  add(rootPath: string, name: string): string {
    const existing = this.state.environments.find((env) => env.rootPath === rootPath);
    if (existing !== undefined) {
      this.state = { ...this.state, activeId: existing.id };
      this.emit();
      return existing.id;
    }
    const label = name.trim().length === 0 ? baseNameOf(rootPath) : name;
    const env: Environment = { id: rootPath, name: label, rootPath, tabs: EMPTY_TABS, browserUrl: null };
    this.state = { environments: [...this.state.environments, env], activeId: env.id };
    this.emit();
    return env.id;
  }

  setBrowserUrl(id: string, url: string | null): boolean {
    if (!this.state.environments.some((env) => env.id === id)) return false;
    const environments = this.state.environments.map((env) =>
      env.id === id ? { ...env, browserUrl: url } : env,
    );
    this.state = { ...this.state, environments };
    this.emit();
    return true;
  }

  setActive(id: string): boolean {
    const exists = this.state.environments.some((env) => env.id === id);
    if (!exists || this.state.activeId === id) return exists;
    this.state = { ...this.state, activeId: id };
    this.emit();
    return true;
  }

  storeTabs(id: string, tabs: EnvironmentTabs): void {
    const environments = this.state.environments.map((env) =>
      env.id === id ? { ...env, tabs } : env,
    );
    this.state = { ...this.state, environments };
    this.emit();
  }

  remove(id: string): Environment | null {
    const removed = this.state.environments.find((env) => env.id === id) ?? null;
    if (removed === null) return null;
    const environments = this.state.environments.filter((env) => env.id !== id);
    let activeId = this.state.activeId;
    if (activeId === id) {
      activeId = environments.length === 0 ? null : environments[environments.length - 1]!.id;
    }
    this.state = { environments, activeId };
    this.emit();
    return removed;
  }

  reset(): void {
    this.state = { environments: [], activeId: null };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const environmentsModel = new EnvironmentsModel();

export function useEnvironmentsState(): EnvironmentsState {
  const [state, setState] = useState<EnvironmentsState>(() => environmentsModel.getState());
  useEffect(() => environmentsModel.subscribe(() => setState(environmentsModel.getState())), []);
  return state;
}
