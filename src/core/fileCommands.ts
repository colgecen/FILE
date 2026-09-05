import type { Api, OpenFileResult } from '../../electron/shared/api-types';
import { reportError } from './appErrors';
import { dirtyTracker } from './dirty';
import { focusManager } from './focus';
import { openFilesModel } from './openFiles';
import { recentFiles } from './recentFiles';
import { saveSignal } from './saveSignal';
import { tabsModel } from './tabs';
import type { CommandDef, CommandResult } from './types';

const RECENT_LIMIT = 5;

export async function runOpenFile(api: Pick<Api, 'openFile'>): Promise<CommandResult> {
  const result = await api.openFile();
  if (result === null) return { ok: true };
  adoptFile(result);
  return { ok: true };
}

export async function runSave(
  api: Pick<Api, 'writeFile'>,
  path: string,
  content: string,
): Promise<CommandResult> {
  const result = await api.writeFile(path, content);
  if (!result.ok) {
    reportError(result.error ?? 'Dosya kaydedilemedi');
    return { ok: false, error: result.error ?? 'Dosya kaydedilemedi' };
  }
  dirtyTracker.clearDirty(path);
  saveSignal.emit();
  return { ok: true };
}

export async function runSaveActive(api: Pick<Api, 'writeFile'>): Promise<CommandResult> {
  const tab = activeTab();
  if (tab === null) return { ok: true };
  return runSave(api, tab.file.path, tab.file.content);
}

export async function runSaveAs(
  api: Pick<Api, 'writeFile' | 'saveFileAs'>,
): Promise<CommandResult> {
  const tab = activeTab();
  if (tab === null) return { ok: true };
  const target = await api.saveFileAs(tab.file.path);
  if (target === null) return { ok: true };
  const result = await runSave(api, target, tab.file.content);
  if (!result.ok) return result;
  tabsModel.close(tab.id);
  adoptFile({ ...tab.file, path: target, name: target.slice(target.lastIndexOf('/') + 1) || target });
  dirtyTracker.clearDirty(tab.file.path);
  dirtyTracker.clearDirty(target);
  return { ok: true };
}

export async function runSaveAll(api: Pick<Api, 'writeFile'>): Promise<CommandResult> {
  const dirtyTabs = tabsModel
    .getState()
    .tabs.filter((tab) => dirtyTracker.isDirty(tab.id));
  const results = await Promise.all(
    dirtyTabs.map((tab) => runSave(api, tab.file.path, tab.file.content)),
  );
  const failed = results.find((result) => !result.ok);
  return failed ?? { ok: true };
}

function activeTab(): ReturnType<typeof tabsModel.getState>['tabs'][number] | null {
  const state = tabsModel.getState();
  if (state.activeId === null) return null;
  return state.tabs.find((tab) => tab.id === state.activeId) ?? null;
}

export async function runOpenRecent(
  api: Pick<Api, 'readFile'>,
  index: number,
): Promise<CommandResult> {
  const entry = recentFiles.list()[index];
  if (entry === undefined) {
    return { ok: false, error: 'Son kullanılan dosya bulunamadı' };
  }
  const file = await api.readFile(entry.path);
  if (file === null) {
    recentFiles.replace(recentFiles.list().filter((item) => item.path !== entry.path));
    return { ok: false, error: 'Dosya okunamadı' };
  }
  adoptFile(file);
  return { ok: true };
}

export function createNewFile(): CommandResult {
  const stamp = Date.now();
  const path = `untitled-${stamp}.ts`;
  const name = path;
  const file: OpenFileResult = { path, name, content: '', language: 'plaintext' };
  tabsModel.open(file);
  dirtyTracker.markDirty(path);
  focusManager.set('editor');
  return { ok: true };
}

export function adoptFile(file: OpenFileResult): void {
  const exists = openFilesModel
    .list()
    .some((entry) => entry.path === file.path);
  if (!exists) {
    openFilesModel.set([
      ...openFilesModel.list(),
      { name: file.name, path: file.path },
    ]);
  }
  recentFiles.add(file.path);
  tabsModel.open(file);
  focusManager.set('editor');
}

export function registerFileCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'file.new.file',
    category: 'file',
    title: 'Yeni Dosya',
    run: () => createNewFile(),
  });
  register({
    id: 'file.open.file',
    category: 'file',
    title: 'Dosya Aç',
    run: () => runOpenFile(window.api),
  });
  register({
    id: 'file.save',
    category: 'file',
    title: 'Kaydet',
    run: () => runSaveActive(window.api),
  });
  register({
    id: 'file.save.as',
    category: 'file',
    title: 'Farklı Kaydet',
    run: () => runSaveAs(window.api),
  });
  register({
    id: 'file.save.all',
    category: 'file',
    title: 'Tümünü Kaydet',
    run: () => runSaveAll(window.api),
  });
  for (let index = 0; index < RECENT_LIMIT; index += 1) {
    register({
      id: `file.open.recent.${index}`,
      category: 'file',
      title: `Son Kullanılan ${index + 1}`,
      run: () => runOpenRecent(window.api, index),
    });
  }
}