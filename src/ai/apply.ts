import type { Api } from '../../electron/shared/api-types';
import { tabsModel } from '../core/tabs';

export type FileEdit = {
  readonly path: string;
  readonly content: string;
};

export type ApplyFileChange = {
  readonly path: string;
  readonly preview: string;
};

export type ApplyReport = {
  readonly applied: readonly string[];
  readonly rejected: readonly { readonly path: string; readonly reason: string }[];
  readonly changes: readonly ApplyFileChange[];
};

type WriteApi = Pick<Api, 'writeFile' | 'readFile'>;

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


function formatDiff(path: string, before: string, after: string): string {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > 250000) {
    return `${path}: +${Math.max(0, b.length - a.length)} -${Math.max(0, a.length - b.length)}`;
  }
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i]![j]! = a[i - 1] === b[j - 1] ? (dp[i - 1]![j - 1]! + 1) : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const stack: { readonly kind: 'same' | 'add' | 'remove'; readonly line: string }[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ kind: 'same', line: a[i - 1]! });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || (dp[i]![j - 1] ?? 0) >= (dp[i - 1]?.[j] ?? 0))) {
      stack.push({ kind: 'add', line: b[j - 1]! });
      j -= 1;
    } else {
      stack.push({ kind: 'remove', line: a[i - 1]! });
      i -= 1;
    }
  }
  stack.reverse();
  let added = 0;
  let removed = 0;
  for (const op of stack) {
    if (op.kind === 'add') added += 1;
    if (op.kind === 'remove') removed += 1;
  }
  const shown: string[] = [];
  let lastShown = -100;
  for (let index = 0; index < stack.length; index += 1) {
    const op = stack[index];
    if (op === undefined) continue;
    if (op.kind !== 'same') {
      const start = Math.max(0, index - 1);
      for (let fill = Math.max(lastShown + 1, start); fill < index; fill += 1) {
        const fillOp = stack[fill];
        if (fillOp !== undefined) shown.push(` ${fillOp.line}`);
      }
      shown.push(op.kind === 'add' ? `+ ${op.line}` : `- ${op.line}`);
      lastShown = index;
      continue;
    }
    if (lastShown >= index - 1) {
      shown.push(` ${op.line}`);
      lastShown = index;
    }
  }
  const capped = shown.length > 50 ? [...shown.slice(0, 50), '...'] : shown;
  return `${path}: +${added} -${removed}\n${capped.join('\n')}`;
}


export async function applyEdits(
  api: WriteApi,
  root: string,
  edits: readonly FileEdit[],
): Promise<ApplyReport> {
  const applied: string[] = [];
  const rejected: { path: string; reason: string }[] = [];
  const changes: ApplyFileChange[] = [];
  for (const edit of edits) {
    const resolved = resolveEditPath(root, edit.path);
    if (resolved === null) {
      rejected.push({ path: edit.path, reason: 'proje kökü dışı' });
      continue;
    }
    try {
      const oldText = (await api.readFile?.(resolved))?.content ?? '';
      const result = await api.writeFile(resolved, edit.content);
      if (!result.ok) {
        rejected.push({ path: resolved, reason: result.error ?? 'yazılamadı' });
        continue;
      }
      tabsModel.updateContent(resolved, edit.content);
      applied.push(resolved);
      changes.push({ path: resolved, preview: formatDiff(resolved, oldText, edit.content) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      rejected.push({ path: resolved, reason: message.slice(0, 200) });
    }
  }
  return { applied, rejected, changes };
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
