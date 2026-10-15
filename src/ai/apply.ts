import type { Api } from '../../electron/shared/api-types';
import { tabsModel } from '../core/tabs';

export type FileEdit = {
  readonly path: string;
  readonly content: string;
};

export type ApplyReport = {
  readonly applied: readonly string[];
  readonly rejected: readonly { readonly path: string; readonly reason: string }[];
};

type WriteApi = Pick<Api, 'writeFile'>;

export function normalizePath(path: string): string {
  const absolute = path.startsWith('/');
  const out: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else if (!absolute) out.push('..');
      continue;
    }
    out.push(part);
  }
  return `${absolute ? '/' : ''}${out.join('/')}`;
}

/** Hedef kök altında mı? (/proj-evil, /proj önek tuzağına düşmez.) */
export function isWithinRoot(root: string, target: string): boolean {
  const cleanRoot = normalizePath(root).replace(/\/+$/, '') || '/';
  const cleanTarget = normalizePath(target);
  if (cleanTarget === cleanRoot) return true;
  return cleanTarget.startsWith(`${cleanRoot}/`);
}

/** Göreli yolu köke bağlar; kök dışıysa null döner. */
export function resolveEditPath(root: string, rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (trimmed.length === 0) return null;
  const absolute = trimmed.startsWith('/') ? trimmed : `${root.replace(/\/+$/, '')}/${trimmed}`;
  const clean = normalizePath(absolute);
  return isWithinRoot(root, clean) ? clean : null;
}

const FENCE_RE = /^```([^\n]*)\n([\s\S]*?)(?:\n```|$)/gm;
const KNOWN_LANGS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html', 'md', 'py', 'rs', 'go', 'java', 'c', 'cpp',
  'sh', 'bash', 'yaml', 'yml', 'toml', 'xml', 'sql', 'text', 'diff', 'patch',
]);

/**
 * Asistan iletisindeki ```yol bloklarını çözer.
 * Bilgi satırı yol değil dil adıysa (ts, json…) blok atlanır.
 */
export function parseEditBlocks(text: string): FileEdit[] {
  const edits: FileEdit[] = [];
  for (const match of text.matchAll(FENCE_RE)) {
    const info = (match[1] ?? '').trim();
    const content = (match[2] ?? '').replace(/\n$/, '');
    if (info.length === 0) continue;
    if (!info.includes('/') && !info.includes('.')) continue;
    if (KNOWN_LANGS.has(info.toLowerCase())) continue;
    edits.push({ path: info, content });
  }
  return edits;
}

export async function applyEdits(
  api: WriteApi,
  root: string,
  edits: readonly FileEdit[],
): Promise<ApplyReport> {
  const applied: string[] = [];
  const rejected: { path: string; reason: string }[] = [];
  for (const edit of edits) {
    const resolved = resolveEditPath(root, edit.path);
    if (resolved === null) {
      rejected.push({ path: edit.path, reason: 'proje kökü dışı' });
      continue;
    }
    try {
      const result = await api.writeFile(resolved, edit.content);
      if (!result.ok) {
        rejected.push({ path: resolved, reason: result.error ?? 'yazılamadı' });
        continue;
      }
      tabsModel.updateContent(resolved, edit.content);
      applied.push(resolved);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      rejected.push({ path: resolved, reason: message.slice(0, 200) });
    }
  }
  return { applied, rejected };
}

let pending: readonly FileEdit[] | null = null;

export function stagePending(edits: readonly FileEdit[]): void {
  pending = [...edits];
}

export function takePending(): readonly FileEdit[] | null {
  const edits = pending;
  pending = null;
  return edits;
}

export function clearPending(): void {
  pending = null;
}

export function peekPending(): readonly FileEdit[] | null {
  return pending;
}
