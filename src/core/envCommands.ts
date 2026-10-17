import { reportError } from './appErrors';
import { browserUrlPromptModel } from './browserUrlPrompt';
import type { CommandRegistry } from './commands';
import { environmentsModel, type Environment, type EnvironmentTabs } from './environments';
import { explorerModel } from './explorer';
import { focusManager } from './focus';
import { openFilesModel } from './openFiles';
import { tabsModel } from './tabs';
import type { CommandResult } from './types';
import { syncChatWithActiveEnv } from '../ai/envBinding';

export function snapshotTabs(): EnvironmentTabs {
  const state = tabsModel.getState();
  return { files: state.tabs.map((tab) => tab.file), activeId: state.activeId };
}

export function applyTabs(snapshot: EnvironmentTabs): void {
  tabsModel.reset();
  for (const file of snapshot.files) tabsModel.open(file);
  if (snapshot.activeId !== null) tabsModel.activate(snapshot.activeId);
  openFilesModel.set(snapshot.files.map((file) => ({ name: file.name, path: file.path })));
}

export async function switchToEnvironment(id: string): Promise<CommandResult> {
  const target = environmentsModel.getState().environments.find((env) => env.id === id);
  if (target === undefined) return { ok: false, error: 'Ortam bulunamadı' };
  const current = environmentsModel.active();
  if (current !== null && current.id === id) {
    environmentsModel.storeTabs(id, snapshotTabs());
    return { ok: true };
  }
  if (current !== null) {
    environmentsModel.storeTabs(current.id, snapshotTabs());
  }
  applyTabs(target.tabs);
  environmentsModel.setActive(id);
  const loaded = await explorerModel.loadRoot(target.rootPath, window.api.readDir);
  if (!loaded) {
    const message = 'Ortam kökü okunamadı';
    reportError(message);
    return { ok: false, error: message };
  }
  syncChatWithActiveEnv();
  return { ok: true };
}

export function adoptFolderAsEnvironment(
  rootPath: string,
  name: string,
  mode: 'switch' | 'ensure' = 'switch',
): void {
  const current = environmentsModel.active();
  if (current !== null && current.rootPath === rootPath) {
    environmentsModel.storeTabs(current.id, snapshotTabs());
    return;
  }
  if (current !== null) {
    environmentsModel.storeTabs(current.id, snapshotTabs());
  }
  const existing = environmentsModel
    .getState()
    .environments.find((env) => env.rootPath === rootPath);
  if (existing !== undefined) {
    if (mode === 'switch') applyTabs(existing.tabs);
    environmentsModel.setActive(existing.id);
    syncChatWithActiveEnv();
    return;
  }
  environmentsModel.add(rootPath, name);
  if (mode === 'switch') {
    tabsModel.reset();
    openFilesModel.set([]);
  }
  syncChatWithActiveEnv();
}

export async function addEnvironmentViaDialog(): Promise<CommandResult> {
  const picked = await window.api.openFolder();
  if (picked === null) return { ok: true };
  const existing = environmentsModel
    .getState()
    .environments.find((env) => env.rootPath === picked.path);
  if (existing !== undefined) return switchToEnvironment(existing.id);  const current = environmentsModel.active();
  if (current !== null) environmentsModel.storeTabs(current.id, snapshotTabs());
  const loaded = await explorerModel.loadRoot(picked.path, window.api.readDir);
  if (!loaded) {
    const message = 'Klasör okunamadı';
    reportError(message);
    return { ok: false, error: message };
  }
  environmentsModel.add(picked.path, picked.name);
  tabsModel.reset();
  openFilesModel.set([]);
  explorerModel.open();
  focusManager.set('explorer');
  syncChatWithActiveEnv();
  return { ok: true };
}

export async function removeEnvironment(id?: string): Promise<CommandResult> {
  const state = environmentsModel.getState();
  const targetId = id ?? state.activeId;
  if (targetId === null) return { ok: false, error: 'Kapatılacak ortam yok' };
  const wasActive = state.activeId === targetId;
  const current = environmentsModel.active();
  if (wasActive && current !== null) environmentsModel.storeTabs(current.id, snapshotTabs());
  environmentsModel.remove(targetId);
  const next = environmentsModel.active();
  if (next === null) {
    tabsModel.reset();
    openFilesModel.set([]);
    explorerModel.settle([], null);
    return { ok: true };
  }
  if (!wasActive) return { ok: true };
  applyTabs(next.tabs);
  const loaded = await explorerModel.loadRoot(next.rootPath, window.api.readDir);
  if (!loaded) {
    const message = 'Ortam kökü okunamadı';
    reportError(message);
    return { ok: false, error: message };
  }
  syncChatWithActiveEnv();
  return { ok: true };
}

export function cycleEnvironment(delta: 1 | -1): Promise<CommandResult> {
  const { environments, activeId } = environmentsModel.getState();
  if (environments.length === 0) return Promise.resolve({ ok: false, error: 'Ortam yok' });
  const index = environments.findIndex((env) => env.id === activeId);
  const base = index < 0 ? 0 : index;
  const next =
    environments[(((base + delta) % environments.length) + environments.length) % environments.length]!;
  return switchToEnvironment(next.id);
}

export function normalizeBrowserUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export type BrowserKind = 'zen' | 'google-chrome' | 'chromium' | 'firefox' | 'default';

export const BROWSER_LABELS: Record<BrowserKind, string> = {
  zen: 'Zen',
  'google-chrome': 'Chrome',
  chromium: 'Chromium',
  firefox: 'Firefox',
  default: 'Sistem',
};

const BROWSER_BIN: Record<BrowserKind, string | undefined> = {
  zen: 'zen',
  'google-chrome': 'google-chrome',
  chromium: 'chromium',
  firefox: 'firefox',
  default: undefined,
};

async function launchInBrowser(
  env: Environment,
  kind: BrowserKind,
  raw: string,
): Promise<CommandResult> {
  const label = BROWSER_LABELS[kind];
  const trimmed = raw.trim();
  const url = trimmed.length === 0 ? '' : normalizeBrowserUrl(trimmed);
  if (trimmed.length > 0 && url === null) return { ok: false, error: 'Geçersiz adres' };
  const result = await window.api.openInBrowser(url ?? '', BROWSER_BIN[kind]);
  if (result === 'invalid' || result === 'none') {
    return { ok: false, error: `${label} başlatılamadı (kurulu değil)` };
  }
  if (url !== null && url !== env.browserUrl) environmentsModel.setBrowserUrl(env.id, url);
  return { ok: true };
}

export async function openBrowserEnvironment(kind: BrowserKind, url?: string): Promise<CommandResult> {
  const state = environmentsModel.getState();
  const label = BROWSER_LABELS[kind];
  let env = state.environments.find((entry) => entry.id === `browser:${kind}`);
  if (env === undefined) {
    env = {
      id: `browser:${kind}`,
      name: label,
      rootPath: `browser:${kind}`,
      tabs: { files: [], activeId: null },
      browserUrl: null,
    };
    environmentsModel.addExternal(env);
  }
  const current = env;
  if (url !== undefined) return launchInBrowser(current, kind, url);
  const stored = normalizeBrowserUrl(current.browserUrl ?? '');
  return launchInBrowser(current, kind, stored ?? '');
}

export async function openBrowserEnvironmentWithUrl(kind: BrowserKind): Promise<CommandResult> {
  const state = environmentsModel.getState();
  const label = BROWSER_LABELS[kind];
  let env = state.environments.find((entry) => entry.id === `browser:${kind}`);
  if (env === undefined) {
    env = {
      id: `browser:${kind}`,
      name: label,
      rootPath: `browser:${kind}`,
      tabs: { files: [], activeId: null },
      browserUrl: null,
    };
    environmentsModel.addExternal(env);
  }
  const current = env;
  browserUrlPromptModel.open({
    label: `${label} ile aç`,
    value: current.browserUrl ?? 'https://',
    onSubmit: (raw) => {
      if (normalizeBrowserUrl(raw) === null) {
        reportError('Geçersiz adres');
        return;
      }
      browserUrlPromptModel.close();
      void launchInBrowser(current, kind, raw).then((result) => {
        if (!result.ok && result.error !== undefined) reportError(result.error);
      });
    },
  });
  return { ok: true };
}

export function registerEnvCommands(registry: CommandRegistry): void {
  registry.register({
    id: 'env.add',
    title: 'Ortam Ekle',
    category: 'view',
    run: () => addEnvironmentViaDialog(),
  });
  registry.register({
    id: 'env.next',
    title: 'Sonraki Ortam',
    category: 'view',
    run: () => cycleEnvironment(1),
  });
  registry.register({
    id: 'env.prev',
    title: 'Önceki Ortam',
    category: 'view',
    run: () => cycleEnvironment(-1),
  });
  for (const kind of ['zen', 'google-chrome', 'chromium', 'firefox', 'default'] as const) {
    registry.register({
      id: `env.browser.${kind}`,
      title: `${BROWSER_LABELS[kind]} Tarayıcısını Aç`,
      category: 'view',
      run: () => openBrowserEnvironment(kind),
    });
  }
  registry.register({
    id: 'env.remove',
    title: 'Ortamı Kapat',
    category: 'view',
    run: () => removeEnvironment(),
  });
}
