import { reportError } from './appErrors';
import type { CommandRegistry } from './commands';
import { environmentsModel, type EnvironmentTabs } from './environments';
import { explorerModel } from './explorer';
import { focusManager } from './focus';
import { openFilesModel } from './openFiles';
import { tabsModel } from './tabs';
import type { CommandResult } from './types';

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
  if (current !== null && current.id !== id) {
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
  return { ok: true };
}

export function adoptFolderAsEnvironment(rootPath: string, name: string): void {
  const current = environmentsModel.active();
  if (current !== null && current.rootPath !== rootPath) {
    environmentsModel.storeTabs(current.id, snapshotTabs());
  }
  const existing = environmentsModel
    .getState()
    .environments.find((env) => env.rootPath === rootPath);
  if (existing !== undefined) {
    applyTabs(existing.tabs);
    environmentsModel.setActive(existing.id);
    return;
  }
  environmentsModel.add(rootPath, name);
  tabsModel.reset();
  openFilesModel.set([]);
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
  if (wasActive) return switchToEnvironment(next.id);
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
  registry.register({
    id: 'env.remove',
    title: 'Ortamı Kapat',
    category: 'view',
    run: () => removeEnvironment(),
  });
}
