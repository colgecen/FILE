import { isWithinRoot, normalizePath } from './apply';
import { agentModel, type AgentDecision } from './agentModel';

export type AgentToolName = 'list_dir' | 'read_file' | 'write_file' | 'run_command' | 'web_fetch';

export type AgentToolCall = {
  readonly tool: AgentToolName;
  readonly path?: string;
  readonly content?: string;
  readonly cmd?: string;
  readonly url?: string;
  readonly timeoutMs?: number;
};

export const MAX_TOOL_RESULT_CHARS = 4000;

const TOOL_NAMES: readonly string[] = ['list_dir', 'read_file', 'write_file', 'run_command', 'web_fetch'];

const TOOL_FENCE = /```tool[^\n]*\n([\s\S]*?)```/g;

const DANGEROUS_COMMAND = [
  /(^|[\s;&|(])sudo\b/,
  /(^|[\s;&|(])su\s+/,
  /(^|[\s;&|(])rm\b/,
  /(^|[\s;&|(])(dd|mkfs(\.\w+)?|fdisk|parted|shred|wipefs)\b/,
  /(^|[\s;&|(])(shutdown|reboot|halt|poweroff|init)\b/,
  /(^|[\s;&|(])(systemctl|loginctl|service|mount|umount)\b/,
  /(^|[\s;&|(])(apt|apt-get|dnf|yum|zypper|pacman|snap|flatpak|brew)(\s|$)/,
  /(^|[\s;&|(])(crontab|systemd-run|at)\b/,
  /(^|[\s;&|(])(useradd|userdel|usermod|passwd|groupadd|groupdel)\b/,
  /(^|[\s;&|(])(docker|podman|lxc|nsenter)\b/,
  /(^|[\s;&|(])(kill|pkill|killall)\b/,
  /(^|[\s;&|(])(chmod|chown)\b.*\s\//,
  /(curl|wget)[^|;&]*\|\s*(ba|z)?sh/,
  /git\s+push\b.*(--force|-f)\b/,
  /(^|[\s;&|(])git\s+reset\s+--hard\b/,
  /(^|[\s;&|(])npm\s+publish\b/,
  /(^|[\s;&|(])git\s+clean\b.*-[a-z]*f/,
  /(^|[\s;&|(])(iptables|nft|ufw)\b/,
  />\s*\/(etc|usr|bin|sbin|boot|lib|opt|srv|root|var|home)\b/,
].map((pattern) => new RegExp(pattern.source, pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`));

export function toolNeedsApproval(call: AgentToolCall): boolean {
  if (call.tool === 'run_command') {
    const cmd = call.cmd ?? '';
    return DANGEROUS_COMMAND.some((pattern) => pattern.test(cmd));
  }
  return false;
}

export function parseToolCalls(text: string): AgentToolCall[] {
  const calls: AgentToolCall[] = [];
  for (const match of text.matchAll(TOOL_FENCE)) {
    const raw = (match[1] ?? '').trim();
    if (raw.length === 0) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;
        const record = item as Record<string, unknown>;
        const name = record['tool'];
        if (typeof name !== 'string' || !TOOL_NAMES.includes(name)) continue;
        const call: {
          tool: AgentToolName;
          path?: string;
          content?: string;
          cmd?: string;
          url?: string;
          timeoutMs?: number;
        } = { tool: name as AgentToolName };
        if (typeof record['path'] === 'string') call.path = record['path'];
        if (typeof record['content'] === 'string') call.content = record['content'];
        if (typeof record['cmd'] === 'string') call.cmd = record['cmd'];
        if (typeof record['url'] === 'string') call.url = record['url'];
        if (typeof record['timeoutMs'] === 'number') call.timeoutMs = record['timeoutMs'];
        calls.push(call);
      }
    } catch {
      // geçici JSON yok sayılır
    }
  }
  return calls;
}

export function stripToolBlocks(text: string): string {
  return text.replace(TOOL_FENCE, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function toolLabel(call: AgentToolCall): string {
  const target = call.path ?? call.cmd ?? call.url ?? '';
  const short = target.length > 90 ? `${target.slice(0, 87)}…` : target;
  return `${call.tool} ${short}`.trim();
}

function clip(text: string, cap = MAX_TOOL_RESULT_CHARS): string {
  if (text.length <= cap) return text;
  return `${text.slice(0, cap)}\n… [kırpıldı: ${text.length} karakter]`;
}

export function toolPreview(call: AgentToolCall): string {
  if (call.tool === 'write_file') {
    const body = (call.content ?? '').split('\n').slice(0, 6).join('\n');
    return `${call.path ?? ''}\n${body}`;
  }
  if (call.tool === 'run_command') return call.cmd ?? '';
  return toolLabel(call);
}

export async function requestToolApproval(call: AgentToolCall): Promise<AgentDecision> {
  return await new Promise<AgentDecision>((resolve) => {
    agentModel.request(
      {
        name: call.tool,
        args: [call.path ?? call.cmd ?? call.url ?? ''],
        preview: toolPreview(call),
        danger: call.tool === 'run_command',
      },
      resolve,
    );
  });
}

export type ToolOutcome = {
  readonly label: string;
  readonly ok: boolean;
  readonly result: string;
};

export async function executeToolCall(call: AgentToolCall, rootPath: string | null): Promise<ToolOutcome> {
  const label = toolLabel(call);
  try {
    if (call.tool === 'list_dir') {
      if (rootPath === null) return { label, ok: false, result: 'Etkin proje ortamı yok.' };
      const target = resolveToolPath(rootPath, call.path ?? '.');
      if (target === null) return { label, ok: false, result: 'Yol proje kökü dışında — reddedildi.' };
      const entries = await window.api.readDir(target);
      const lines = entries.map((entry: { name: string; kind: string }) => `${entry.kind === 'directory' ? 'd' : '-'} ${entry.name}`);
      return { label, ok: true, result: clip(lines.join('\n') || '(boş dizin)') };
    }
    if (call.tool === 'read_file') {
      if (rootPath === null) return { label, ok: false, result: 'Etkin proje ortamı yok.' };
      const target = resolveToolPath(rootPath, call.path ?? '');
      if (target === null) return { label, ok: false, result: 'Yol proje kökü dışında — reddedildi.' };
      if (target === undefined) return { label, ok: false, result: 'Geçersiz dosya yolu.' };
      const content = await window.api.readFile(target);
      if (content === null) return { label, ok: false, result: 'Dosya okunamadı veya yok.' };
      return { label, ok: true, result: clip(content) };
    }
    if (call.tool === 'write_file') {
      if (rootPath === null) return { label, ok: false, result: 'Etkin proje ortamı yok.' };
      const target = resolveToolPath(rootPath, call.path ?? '');
      if (target === null) return { label, ok: false, result: 'Yol proje kökü dışında — reddedildi.' };
      if (target === undefined || call.content === undefined) return { label, ok: false, result: 'Geçersiz yazma isteği (path/content).' };
      const written = await window.api.writeFile(target, call.content);
      return { label, ok: written, result: written ? `Yazıldı: ${target}` : 'Yazma başarısız.' };
    }
    if (call.tool === 'run_command') {
      const cmd = (call.cmd ?? '').trim();
      if (cmd.length === 0) return { label, ok: false, result: 'Komut boş.' };
      const exec = await window.api.agentExec({ cmd, cwd: rootPath, timeoutMs: call.timeoutMs ?? null });
      const parts = [
        exec.stdout.length > 0 ? exec.stdout : '',
        exec.stderr.length > 0 ? `stderr:\n${exec.stderr}` : '',
        exec.error !== undefined ? `hata: ${exec.error}` : '',
        `exit: ${exec.code ?? '?'}`,
      ].filter((part) => part.length > 0);
      return { label, ok: exec.ok, result: clip(parts.join('\n')) };
    }
    if (call.tool === 'web_fetch') {
      const url = (call.url ?? '').trim();
      if (url.length === 0) return { label, ok: false, result: 'Adres boş.' };
      const fetched = await window.api.webFetch(url);
      if (!fetched.ok) return { label, ok: false, result: `İnternet isteği başarısız: ${fetched.error ?? 'bilinmeyen'}` };
      return { label, ok: true, result: clip(fetched.text) };
    }
    return { label, ok: false, result: 'Bilinmeyen araç.' };
  } catch (error) {
    return { label, ok: false, result: `Araç hatası: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function resolveToolPath(root: string, raw: string): string | null | undefined {
  if (raw.length === 0) return undefined;
  const absolute = raw.startsWith('/') ? raw : `${root.replace(/\/+$/, '')}/${raw.replace(/^\/+/, '')}`;
  const clean = normalizePath(absolute);
  if (!isWithinRoot(root, clean)) return null;
  return clean;
}
