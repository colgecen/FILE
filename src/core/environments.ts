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

  /** Klasör kökü olmayan (tarayıcı vb.) hazır ortamı ekler ve aktif yapar. */
  addExternal(env: Environment): string {
    if (this.state.environments.some((entry) => entry.id === env.id)) {
      this.state = { ...this.state, activeId: env.id };
      this.emit();
      return env.id;
    }
    this.state = { environments: [...this.state.environments, env], activeId: env.id };
    this.emit();
    return env.id;
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

let browserTabSeq = 0;

/**
 * Uygulama içi tarayıcı için yeni bir sekme ortamı (browser:<n>) oluşturur.
 * URL verilirse o sayfadan, yoksa boş sekmeden başlar.
 */
export function createBrowserTab(url: string | null = null): string {
  const max = environmentsModel.getState().environments.reduce((acc, env) => {
    const match = /^browser:(\d+)$/.exec(env.id);
    if (match === null) return acc;
    return Math.max(acc, Number(match[1]));
  }, browserTabSeq);
  browserTabSeq = max + 1;
  const id = `browser:${browserTabSeq}`;
  const trimmed = url === null ? '' : url.trim();
  let name = `Sekme ${browserTabSeq}`;
  if (trimmed.length > 0) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname.length > 0) name = parsed.hostname;
    } catch {
      // geçersiz URL — varsayılan sekme adıyla devam et
    }
  }
  environmentsModel.addExternal({
    id,
    name,
    rootPath: id,
    tabs: EMPTY_TABS,
    browserUrl: trimmed.length > 0 ? trimmed : null,
  });
  return id;
}

export function useEnvironmentsState(): EnvironmentsState {
  const [state, setState] = useState<EnvironmentsState>(() => environmentsModel.getState());
  useEffect(() => environmentsModel.subscribe(() => setState(environmentsModel.getState())), []);
  return state;
}
