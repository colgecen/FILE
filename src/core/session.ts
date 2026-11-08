import { environmentsModel, type Environment, type EnvironmentTabs } from './environments';
import { tabsModel } from './tabs';
import { viewModeModel } from './viewMode';

const STORAGE_KEY = 'file:session:v1';

export type FileMemory = {
  line: number;
  column: number;
  viewportTop: number;
};

export type Session = {
  environments: Environment[];
  activeEnvId: string | null;
  activeFileId: string | null;
  files: Record<string, FileMemory>;
  wordWrap: 'on' | 'off';
};

let timer: number | null = null;

function snapshotEnvTabs(envId: string): EnvironmentTabs {
  const stored = environmentsModel.getState().environments.find((env) => env.id === envId);
  const state = tabsModel.getState();
  const live: EnvironmentTabs = {
    files: state.tabs.map((tab) => tab.file),
    activeId: state.activeId,
  };
  if (stored === undefined) return live;
  return stored.tabs.files.length > 0 || stored.tabs.activeId !== null ? stored.tabs : live;
}

export const session = {
  save(s: Session): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // depolama dolu/erişilemez — sessiz geç
    }
  },

  load(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const parsed = JSON.parse(raw) as Partial<Session>;
      if (!Array.isArray(parsed.environments)) return null;
      return {
        environments: parsed.environments,
        activeEnvId: parsed.activeEnvId ?? null,
        activeFileId: parsed.activeFileId ?? null,
        files: parsed.files ?? {},
        wordWrap: parsed.wordWrap === 'off' ? 'off' : 'on',
      };
    } catch {
      return null;
    }
  },

  remember(): void {
    const state = environmentsModel.getState();
    if (state.activeId !== null) {
      environmentsModel.storeTabs(state.activeId, {
        files: tabsModel.getState().tabs.map((tab) => tab.file),
        activeId: tabsModel.getState().activeId,
      });
    }
    this.schedule();
  },

  schedule(): void {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      const envState = environmentsModel.getState();
      const environments = envState.environments.map((env) =>
        env.id === envState.activeId ? { ...env, tabs: snapshotEnvTabs(env.id) } : env,
      );
      this.save({
        environments,
        activeEnvId: envState.activeId,
        activeFileId: tabsModel.getState().activeId,
        files: memories,
        wordWrap: viewModeModel.getState().wordWrap,
      });
    }, 300);
  },

  fileMemory(path: string): FileMemory | null {
    return memories[path] ?? null;
  },

  updateMemory(path: string, patch: Partial<FileMemory>): void {
    const current = memories[path] ?? { line: 1, column: 1, viewportTop: 0 };
    memories[path] = { ...current, ...patch };
    this.schedule();
  },
};

let memories: Record<string, FileMemory> = {};

export function restoreSession(): void {
  const saved = session.load();
  if (saved === null) return;
  memories = saved.files;
  for (const env of saved.environments) {
    environmentsModel.addExternal(env);
  }
  if (saved.activeEnvId !== null) {
    environmentsModel.setActive(saved.activeEnvId);
  }
  const active = environmentsModel.active();
  if (active !== null) {
    for (const file of active.tabs.files) {
      tabsModel.open(file.kind === undefined
        ? { path: file.path, name: file.name, content: '', language: file.language }
        : { path: file.path, name: file.name, content: '', language: file.language, kind: file.kind });
    }
    if (active.tabs.activeId !== null) tabsModel.activate(active.tabs.activeId);
  }
  viewModeModel.setWordWrap(saved.wordWrap);
}

export async function hydrateRestoredFiles(readFile: (path: string) => Promise<{ content: string; kind?: string } | null>): Promise<void> {
  const active = environmentsModel.active();
  if (active === null) return;
  for (const tab of tabsModel.getState().tabs) {
    if (tab.file.kind !== undefined && tab.file.kind !== 'text') continue;
    const result = await readFile(tab.file.path);
    if (result !== null) {
      tabsModel.updateContent(tab.file.path, result.content);
    }
  }
}
