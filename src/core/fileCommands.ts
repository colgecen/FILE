import type { Api, OpenFileResult } from '../../electron/shared/api-types';
import { openFilesModel } from './openFiles';
import { recentFiles } from './recentFiles';
import { tabsModel } from './tabs';
import type { CommandDef, CommandResult } from './types';

export async function runOpenFile(api: Pick<Api, 'openFile'>): Promise<CommandResult> {
  const result = await api.openFile();
  if (result === null) return { ok: true };
  adoptFile(result);
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
}