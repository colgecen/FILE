import { useSyncExternalStore } from 'react';
import { environmentsModel } from './environments';
import { viewModeModel } from './viewMode';

export type TerminalTab = {
  readonly id: string;
  readonly title: string;
  readonly cwd: string | null;
};

export type TerminalWorkspace = {
  readonly tabs: readonly TerminalTab[];
  readonly activeId: string | null;
  readonly split: boolean;
  readonly splitId: string | null;
  readonly open: boolean;
  readonly fullscreen: boolean;
  readonly appFullscreenBefore: boolean;
  readonly seq: number;
};

export type TerminalState = {
  readonly workspaces: Readonly<Record<string, TerminalWorkspace>>;
};

const EMPTY: TerminalState = { workspaces: {} };

let nextTabSeq = 1;

function newTab(workspace: TerminalWorkspace, cwd: string | null): TerminalTab {
  const seq = workspace.seq + 1;
  nextTabSeq += 1;
  return {
    id: `term-${nextTabSeq}`,
    title: `Terminal ${seq}`,
    cwd,
  };
}

function withTab(workspace: TerminalWorkspace, cwd: string | null): TerminalWorkspace {
  const tab = newTab(workspace, cwd);
  return {
    ...workspace,
    tabs: [...workspace.tabs, tab],
    activeId: tab.id,
    open: true,
    seq: workspace.seq + 1,
  };
}

function emptyWorkspace(): TerminalWorkspace {
  return {
    tabs: [],
    activeId: null,
    split: false,
    splitId: null,
    open: false,
    fullscreen: false,
    appFullscreenBefore: false,
    seq: 0,
  };
}

function envContext(): { envId: string; cwd: string | null } {
  const env = environmentsModel.active();
  if (env === null) return { envId: 'default', cwd: null };
  return {
    envId: env.id,
    cwd: env.id.startsWith('browser:') ? null : env.rootPath,
  };
}

export class TerminalModel {
  private state: TerminalState = EMPTY;
  private readonly listeners = new Set<() => void>();

  getState(): TerminalState {
    return this.state;
  }

  workspace(envId: string): TerminalWorkspace | undefined {
    return this.state.workspaces[envId];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isOpen(): boolean {
    const { envId } = envContext();
    return this.state.workspaces[envId]?.open === true;
  }

  /** Aktif ortam için terminal panelini açar; hiç sekme yoksa bir tane oluşturur. */
  open(): void {
    const { envId, cwd } = envContext();
    this.openFor(envId, cwd);
  }

  close(): void {
    const { envId } = envContext();
    this.closePanel(envId);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  openFor(envId: string, cwd: string | null): void {
    this.update(envId, (workspace) => {
      if (workspace.tabs.length === 0) return withTab(workspace, cwd);
      if (workspace.open) return workspace;
      return { ...workspace, open: true };
    });
  }

  addTab(envId: string, cwd: string | null): void {
    this.update(envId, (workspace) => {
      const next = withTab(workspace, cwd);
      if (!workspace.split) return next;
      const previousActive = workspace.activeId;
      return {
        ...next,
        splitId: previousActive !== null && previousActive !== next.activeId
          ? previousActive
          : next.tabs.find((tab) => tab.id !== next.activeId)?.id ?? null,
      };
    });
  }

  setActive(envId: string, tabId: string): void {
    this.update(envId, (workspace) => {
      if (!workspace.tabs.some((tab) => tab.id === tabId)) return workspace;
      if (workspace.activeId === tabId) return workspace;
      let splitId = workspace.splitId;
      if (workspace.split && splitId === tabId) {
        splitId = workspace.tabs.find((tab) => tab.id !== tabId)?.id ?? null;
      }
      return { ...workspace, activeId: tabId, splitId };
    });
  }

  closeTab(envId: string, tabId: string): void {
    this.update(envId, (workspace) => {
      const index = workspace.tabs.findIndex((tab) => tab.id === tabId);
      if (index < 0) return workspace;
      const tabs = workspace.tabs.filter((tab) => tab.id !== tabId);
      if (tabs.length === 0) {
        return {
          ...workspace,
          tabs: [],
          activeId: null,
          split: false,
          splitId: null,
          open: false,
          fullscreen: false,
        };
      }
      let activeId = workspace.activeId;
      if (activeId === tabId) {
        activeId = tabs[index]?.id ?? tabs[index - 1]?.id ?? tabs[0]!.id;
      }
      let splitId = workspace.splitId;
      if (splitId === tabId || splitId === null) {
        splitId = tabs.find((tab) => tab.id !== activeId)?.id ?? null;
      }
      const split = workspace.split && tabs.length > 1 && splitId !== null;
      return {
        ...workspace,
        tabs,
        activeId,
        split,
        splitId: split ? splitId : null,
      };
    });
  }

  toggleSplit(envId: string, cwd: string | null): void {
    this.update(envId, (workspace) => {
      if (workspace.split) {
        return { ...workspace, split: false, splitId: null };
      }
      let next = workspace;
      if (next.tabs.length < 2) {
        const before = next.activeId;
        next = withTab(next, cwd);
        return {
          ...next,
          split: true,
          splitId: before ?? next.tabs.find((tab) => tab.id !== next.activeId)?.id ?? null,
        };
      }
      const activeId = next.activeId ?? next.tabs[0]!.id;
      const splitId = next.tabs.find((tab) => tab.id !== activeId)?.id ?? null;
      return { ...next, activeId, split: splitId !== null, splitId };
    });
  }

  closePanel(envId: string): void {
    this.update(envId, (workspace) =>
      workspace.open ? { ...workspace, open: false, fullscreen: false } : workspace,
    );
  }

  setFullscreen(envId: string, enabled: boolean, appFullscreenBefore: boolean): void {
    this.update(envId, (workspace) => ({
      ...workspace,
      fullscreen: enabled,
      appFullscreenBefore,
    }));
  }

  prune(validEnvIds: ReadonlySet<string>): void {
    const workspaces: Record<string, TerminalWorkspace> = {};
    let changed = false;
    for (const [envId, workspace] of Object.entries(this.state.workspaces)) {
      if (validEnvIds.has(envId)) workspaces[envId] = workspace;
      else changed = true;
    }
    if (!changed) return;
    this.state = { workspaces };
    this.emit();
  }

  reset(): void {
    this.state = EMPTY;
    this.emit();
  }

  private update(
    envId: string,
    mutator: (workspace: TerminalWorkspace) => TerminalWorkspace,
  ): void {
    const current = this.state.workspaces[envId] ?? emptyWorkspace();
    const next = mutator(current);
    if (next === current) return;
    this.state = {
      workspaces: { ...this.state.workspaces, [envId]: next },
    };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const terminalModel = new TerminalModel();

const subscribeTerminal = (listener: () => void): (() => void) =>
  terminalModel.subscribe(listener);
const getTerminalSnapshot = (): TerminalState => terminalModel.getState();

export function useTerminalState(): TerminalState {
  return useSyncExternalStore(subscribeTerminal, getTerminalSnapshot, getTerminalSnapshot);
}

export function activeTerminalContext(): { envId: string; cwd: string | null } {
  return envContext();
}

/** Diğer modüller için kısayollar. */
export function openActiveTerminal(): void {
  const { envId, cwd } = envContext();
  terminalModel.openFor(envId, cwd);
}

export function newActiveTerminal(): void {
  const { envId, cwd } = envContext();
  terminalModel.addTab(envId, cwd);
}

export function splitActiveTerminal(): void {
  const { envId, cwd } = envContext();
  terminalModel.toggleSplit(envId, cwd);
}

export function closeActiveTerminalPanel(): void {
  const { envId } = envContext();
  const workspace = terminalModel.workspace(envId);
  if (workspace?.fullscreen === true) {
    terminalModel.setFullscreen(envId, false, workspace.appFullscreenBefore);
    if (!workspace.appFullscreenBefore && viewModeModel.getState().fullscreen) {
      viewModeModel.setFullscreen(false);
      void window.api.setFullscreen(false);
    }
  }
  terminalModel.closePanel(envId);
}
