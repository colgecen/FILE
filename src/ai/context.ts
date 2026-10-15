import { environmentsModel } from '../core/environments';
import { explorerModel } from '../core/explorer';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { modeRules, type PlanMode } from './modes';

export const MAX_CONTEXT_CHARS = 6000;
export const MAX_LISTED_FILES = 20;

export type ContextFile = {
  readonly path: string;
  readonly name: string;
  readonly language: string;
  readonly excerpt: string;
};

export type ProjectContext = {
  readonly rootPath: string | null;
  readonly projectName: string;
  readonly activeFile: ContextFile | null;
  readonly openFiles: readonly { readonly path: string; readonly name: string }[];
};

export type ContextInput = {
  readonly env: { readonly rootPath: string; readonly name: string } | null;
  readonly explorerRoot: string | null;
  readonly tabs: readonly { readonly id: string; readonly file: OpenFile }[];
  readonly activeId: string | null;
};

export function excerptOf(content: string, limit: number = MAX_CONTEXT_CHARS): string {
  if (content.length <= limit) return content;
  return `${content.slice(0, limit)}\n… [kırpıldı: ${content.length} karakter]`;
}

function baseNameOf(path: string): string {
  const parts = path.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}

export function collectProjectContext(input: ContextInput): ProjectContext {
  const rootPath = input.env?.rootPath ?? input.explorerRoot;
  const activeTab = input.tabs.find((tab) => tab.id === input.activeId) ?? null;
  const activeFile: ContextFile | null =
    activeTab === null
      ? null
      : {
          path: activeTab.file.path,
          name: activeTab.file.name,
          language: activeTab.file.language,
          excerpt: excerptOf(activeTab.file.content),
        };
  return {
    rootPath: rootPath ?? null,
    projectName: input.env?.name ?? (rootPath ? baseNameOf(rootPath) : 'proje'),
    activeFile,
    openFiles: input.tabs
      .slice(0, MAX_LISTED_FILES)
      .map((tab) => ({ path: tab.file.path, name: tab.file.name })),
  };
}

export function collectLiveProjectContext(): ProjectContext {
  const env = environmentsModel.active();
  return collectProjectContext({
    env: env === null ? null : { rootPath: env.rootPath, name: env.name },
    explorerRoot: explorerModel.getState().rootPath,
    tabs: tabsModel.getState().tabs,
    activeId: tabsModel.getState().activeId,
  });
}

/** Uzak modele giden sistem iletisi: kip kuralları + proje bağlamı. */
export function renderContextBlock(ctx: ProjectContext, mode: PlanMode): string {
  const lines = [modeRules(mode), ''];
  lines.push(`Proje: ${ctx.projectName}${ctx.rootPath ? ` (${ctx.rootPath})` : ' (kök yok)'}`);
  if (ctx.openFiles.length > 0) {
    lines.push(`Açık dosyalar: ${ctx.openFiles.map((file) => file.name).join(', ')}`);
  }
  if (ctx.activeFile !== null) {
    lines.push(`--- aktif dosya: ${ctx.activeFile.path} (${ctx.activeFile.language}) ---`);
    lines.push(ctx.activeFile.excerpt);
  } else {
    lines.push('Aktif dosya yok.');
  }
  return lines.join('\n');
}
