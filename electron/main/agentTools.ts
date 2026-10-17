import { ipcMain } from 'electron';
import { spawn } from 'node:child_process';

export type AgentExecArgs = {
  readonly cmd: string;
  readonly cwd: string | null;
  readonly timeoutMs: number | null;
};

export type AgentExecResult = {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
  readonly error?: string;
};

export type WebFetchResult = {
  readonly ok: boolean;
  readonly text: string;
  readonly error?: string;
};

const EXEC_CAP = 12000;
const FETCH_CAP = 12000;
const FETCH_TIMEOUT_MS = 15000;

function clip(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return `${text.slice(0, cap)}\n… [kırpıldı: ${text.length} karakter]`;
}

function execShell(cmd: string, cwd: string | null, timeoutMs: number): Promise<AgentExecResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'cmd' : '/bin/bash';
    const shellArgs = process.platform === 'win32' ? ['/c', cmd] : ['-lc', cmd];
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(shell, shellArgs, { cwd: cwd ?? process.env['HOME'] ?? process.cwd() });
    } catch (error) {
      resolve({ ok: false, stdout: '', stderr: '', code: null, error: error instanceof Error ? error.message : String(error) });
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result: AgentExecResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({
        ok: false,
        stdout: clip(stdout, EXEC_CAP),
        stderr: clip(stderr, EXEC_CAP),
        code: null,
        error: `Zaman aşımı (${Math.round(timeoutMs / 1000)}sn) — süreç durduruldu`,
      });
    }, timeoutMs);
    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < EXEC_CAP * 2) stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < EXEC_CAP * 2) stderr += chunk.toString();
    });
    child.on('error', (error: Error) => {
      finish({ ok: false, stdout: clip(stdout, EXEC_CAP), stderr: clip(stderr, EXEC_CAP), code: null, error: error.message });
    });
    child.on('close', (code) => {
      finish({ ok: code === 0, stdout: clip(stdout, EXEC_CAP), stderr: clip(stderr, EXEC_CAP), code });
    });
  });
}

export function registerAgentToolHandlers(): void {
  ipcMain.handle('agent:exec', async (_event, args: AgentExecArgs): Promise<AgentExecResult> => {
    const cmd = typeof args?.cmd === 'string' ? args.cmd.trim() : '';
    if (cmd.length === 0) return { ok: false, stdout: '', stderr: '', code: null, error: 'Boş komut' };
    const timeoutMs = Math.min(Math.max(args.timeoutMs ?? 45000, 5000), 180000);
    const cwd = typeof args.cwd === 'string' && args.cwd.length > 0 ? args.cwd : null;
    return await execShell(cmd, cwd, timeoutMs);
  });

  ipcMain.handle('web:fetch', async (_event, url: string): Promise<WebFetchResult> => {
    if (typeof url !== 'string') return { ok: false, text: '', error: 'Geçersiz adres' };
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, text: '', error: 'Geçersiz URL' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, text: '', error: 'Yalnızca http/https desteklenir' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'FILE-App/1.0' },
        redirect: 'follow',
      });
      const body = await response.text();
      if (!response.ok) {
        return { ok: false, text: clip(body, 2000), error: `HTTP ${response.status}` };
      }
      return { ok: true, text: clip(body, FETCH_CAP) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, text: '', error: message.slice(0, 200) };
    } finally {
      clearTimeout(timer);
    }
  });
}
