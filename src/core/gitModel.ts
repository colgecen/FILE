import { useEffect, useState } from 'react';
import type { Api } from '../../electron/shared/api-types';

export type GitFile = {
  readonly path: string;
  readonly status: 'M' | 'A' | 'D' | '?' | '!' | 'U';
};

export type GitLogEntry = {
  readonly hash: string;
  readonly message: string;
  readonly author: string;
  readonly date: string;
};

export type GitState = {
  readonly branch: string | null;
  readonly dirty: boolean;
  readonly files: readonly GitFile[];
  readonly staged: ReadonlySet<string>;
  readonly log: readonly GitLogEntry[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly rootPath: string | null;
};

const DEFAULT: GitState = {
  branch: null,
  dirty: false,
  files: [],
  staged: new Set<string>(),
  log: [],
  loading: false,
  error: null,
  rootPath: null,
};

export class GitModel {
  private state: GitState = DEFAULT;
  private readonly listeners = new Set<() => void>();

  getState(): GitState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setRoot(path: string | null): void {
    this.state = { ...this.state, rootPath: path };
    this.emit();
  }

  setBranch(name: string | null, dirty: boolean): void {
    this.state = { ...this.state, branch: name, dirty };
    this.emit();
  }

  setFiles(files: readonly GitFile[]): void {
    this.state = { ...this.state, files, loading: false, error: null };
    this.emit();
  }

  setLog(log: readonly GitLogEntry[]): void {
    this.state = { ...this.state, log };
    this.emit();
  }

  setStaged(path: string, staged: boolean): void {
    const set = new Set(this.state.staged);
    if (staged) set.add(path);
    else set.delete(path);
    this.state = { ...this.state, staged: set };
    this.emit();
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.emit();
  }

  setError(message: string | null): void {
    this.state = { ...this.state, error: message, loading: false };
    this.emit();
  }

  async loadStatus(api: Pick<Api, 'gitBranch' | 'gitStatus' | 'gitLog'>, cwd: string): Promise<void> {
    this.setLoading(true);
    this.setRoot(cwd);
    try {
      const branch = await api.gitBranch(cwd);
      if (branch !== null) this.setBranch(branch.name, branch.dirty);
      else this.setBranch(null, false);
      const files = await api.gitStatus(cwd);
      if (files !== null) this.setFiles(files);
      else this.setFiles([]);
      const log = await api.gitLog(cwd, 20);
      if (log !== null) this.setLog(log);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setError(msg);
    } finally {
      this.setLoading(false);
    }
  }

  reset(): void {
    this.state = DEFAULT;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const gitModel = new GitModel();

export function useGitPanelState(): GitState {
  const [state, setState] = useState<GitState>(() => gitModel.getState());
  useEffect(() => gitModel.subscribe(() => setState(gitModel.getState())), []);
  return state;
}
