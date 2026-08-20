import type { Api, OpenFileResult } from '../../electron/shared/api-types';
import { openFilesModel } from './openFiles';
import { recentFiles } from './recentFiles';
import { tabsModel } from './tabs';
import type { CommandDef, CommandResult } from './types';

const RECENT_LIMIT = 5;

export async function runOpenFile(api: Pick<Api, 'openFile'>): Promise<CommandResult> {
  const result = await api.openFile();
  if (result === null) return { ok: true };
  adoptFile(result);
  return { ok: true };
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
}

export function registerFileCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'file.open.file',
    category: 'file',
    title: 'Dosya Aç',
    run: () => runOpenFile(window.api),
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