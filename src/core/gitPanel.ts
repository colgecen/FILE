import { environmentsModel } from './environments';
import { explorerModel } from './explorer';
import { focusManager } from './focus';
import { gitModel } from './gitModel';
import type { CommandResult } from './types';
import type { Api } from '../../electron/shared/api-types';

type GitApi = Pick<Api, 'gitBranch' | 'gitStatus' | 'gitLog'>;

function activeRoot(): string | null {
  const env = environmentsModel.active();
  if (env !== null) return env.rootPath;
  return explorerModel.getState().rootPath;
}

/**
 * Seçili proje ortamı varsa git panelini açar.
 * Ortam yoksa hiçbir şey yapmaz (ok:false). `focus` verilirse odak git paneline geçer.
 */
export async function openGitPanelForActiveEnv(api: GitApi, opts: { focus: boolean }): Promise<CommandResult> {
  const root = activeRoot();
  if (root === null) return { ok: false, error: 'Açık proje ortamı yok' };
  let isRepo = false;
  try {
    isRepo = (await api.gitBranch(root)) !== null;
  } catch {
    isRepo = false;
  }
  if (!isRepo) return { ok: false, error: 'Bu proje bir git deposu değil' };
  gitModel.open();
  await gitModel.loadStatus(api, root);
  if (opts.focus) focusManager.set('git');
  return { ok: true };
}

/** Ortam bir git deposuysa paneli sessizce açar (odak değiştirmez). */
export async function syncGitPanelWithActiveEnv(api: GitApi): Promise<void> {
  await openGitPanelForActiveEnv(api, { focus: false });
}
