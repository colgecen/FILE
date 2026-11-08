import { app, ipcMain, type BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

type Pending = {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

let getWindow: () => BrowserWindow | null = () => null;
let proc: ChildProcess | null = null;
let modelDir: string | null = null;
const pending = new Map<string, Pending>();

function resolveBinary(): string | null {
  const candidates = [
    process.env['FILE_AI_HELPER'],
    join(process.resourcesPath ?? '', 'ai-helper'),
    join(process.resourcesPath ?? '', 'ai-helper.exe'),
    join(__dirname, 'ai-helper'),
    join(__dirname, 'ai-helper.exe'),
    join(__dirname, '../../native/ai-helper/target/release/ai-helper'),
    join(__dirname, '../../native/ai-helper/target/release/ai-helper.exe'),
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

function sendRequest(payload: Record<string, unknown>): void {
  const child = proc;
  if (child === null || child.stdin === null || child.stdin.destroyed) return;
  try {
    child.stdin.write(JSON.stringify(payload) + '\n');
  } catch {
    // süreç kapandıysa sessiz geç; exit handler yeniden başlatır
  }
}

function ensureProc(): ChildProcess | null {
  if (proc !== null && !proc.killed && proc.exitCode === null) return proc;
  const binary = resolveBinary();
  if (binary === null) return null;
  const child = spawn(binary, ['--serve'], { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout?.setEncoding('utf8');
  let buffer = '';
  child.stdout?.on('data', (chunk: string) => {
    buffer += chunk;
    for (;;) {
      const index = buffer.indexOf('\n');
      if (index < 0) break;
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line.length === 0) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      handleEvent(event);
    }
  });
  child.stderr?.on('data', (chunk: Buffer | string) => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString();
    if (text.trim().length > 0) console.error('[ai-helper]', text.trim());
  });
  child.on('exit', (code) => {
    if (proc === child) proc = null;
    for (const [id, pendingEntry] of pending) {
      pending.delete(id);
      clearTimeout(pendingEntry.timer);
      pendingEntry.reject(new Error(`Yardımcı süreç kapandı (${code ?? '?'})`));
    }
    const win = getWindow();
    if (win !== null && !win.isDestroyed()) {
      win.webContents.send('ai:local:event', {
        kind: 'error',
        message: `Yardımcı süreç kapandı (${code ?? '?'})`,
      });
    }
  });
  proc = child;
  if (modelDir !== null) {
    sendRequest({ id: 'init-dir', op: 'set-model-dir', dir: modelDir });
  }
  return child;
}

function handleEvent(event: Record<string, unknown>): void {
  const kind = typeof event.kind === 'string' ? event.kind : '';
  const id = typeof event.id === 'string' ? event.id : '';

  // Renderer'a ilet (sidecar olayları AIWorkerEvent ile birebir).
  const win = getWindow();
  if (win !== null && !win.isDestroyed()) {
    win.webContents.send('ai:local:event', event);
  }

  // Bekleyen istekleri çöz.
  if (id.length > 0 && pending.has(id)) {
    const entry = pending.get(id)!;
    if (kind === 'ready' || kind === 'error' || (kind === 'status' && (event.state === 'ready' || event.state === 'error' || event.state === 'idle' || event.state === 'ok'))) {
      pending.delete(id);
      clearTimeout(entry.timer);
      if (kind === 'error') {
        entry.reject(new Error(typeof event.message === 'string' ? event.message : 'Hata'));
      } else {
        entry.resolve(event);
      }
    }
  }
}

function awaitEvent(id: string, timeoutMs: number): Promise<Record<string, unknown>> {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Yardımcı süreç zaman aşımına uğradı'));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
  });
}

export function registerAiLocalHandlers(getWin: () => BrowserWindow | null): void {
  getWindow = getWin;

  ipcMain.handle('ai:local:set-model-dir', async (_event, dir: string): Promise<void> => {
    modelDir = String(dir);
    const child = ensureProc();
    if (child !== null) sendRequest({ id: 'set-model-dir', op: 'set-model-dir', dir: modelDir });
  });

  ipcMain.handle('ai:local:status', async (): Promise<Record<string, unknown>> => {
    const child = ensureProc();
    if (child === null) return { ok: false, error: 'Yardımcı süreç bulunamadı' };
    const id = `status-${Date.now()}`;
    sendRequest({ id, op: 'status' });
    try {
      const event = await awaitEvent(id, 5000);
      return { ok: true, ...event };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ai:local:load', async (_event, args: { modelId: string; threads?: number; ctx?: number }): Promise<Record<string, unknown>> => {
    const child = ensureProc();
    if (child === null) return { ok: false, error: 'Yardımcı süreç bulunamadı (binary eksik mi?)' };
    const id = `load-${Date.now()}`;
    if (modelDir === null) {
      // Güvenlik: model dizini henüz set edilmemişse userData'dan türet.
      modelDir = join(app.getPath('userData'), 'models');
      sendRequest({ id: 'set-model-dir', op: 'set-model-dir', dir: modelDir });
    }
    sendRequest({ id, op: 'load', model: args.modelId, threads: args.threads, ctx: args.ctx, download: true });
    try {
      const event = await awaitEvent(id, 300_000);
      if (event.kind === 'error') {
        return { ok: false, error: typeof event.message === 'string' ? event.message : 'Hata' };
      }
      return { ok: true, model: event.model, modelPath: event.modelPath, threads: event.threads, ctx: event.ctx };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ai:local:generate', async (_event, args: { requestId: string; prompt: string; maxTokens: number; temperature?: number }): Promise<{ started: boolean; error?: string }> => {
    const child = ensureProc();
    if (child === null) return { started: false, error: 'Yardımcı süreç bulunamadı' };
    sendRequest({ id: args.requestId, op: 'generate', prompt: args.prompt, max_tokens: args.maxTokens, temperature: args.temperature ?? 0.7 });
    return { started: true };
  });

  ipcMain.handle('ai:local:cancel', async (_event, requestId: string): Promise<void> => {
    if (proc !== null) sendRequest({ id: requestId, op: 'cancel' });
  });

  ipcMain.handle('ai:local:unload', async (): Promise<void> => {
    if (proc !== null) sendRequest({ id: `unload-${Date.now()}`, op: 'unload' });
  });

  ipcMain.handle('ai:local:bench', async (_event, args: { modelId: string; tokens?: number }): Promise<{ ok: boolean; result?: string; error?: string }> => {
    const binary = resolveBinary();
    if (binary === null) return { ok: false, error: 'Binary bulunamadı' };
    const dir = modelDir ?? join(app.getPath('userData'), 'models');
    const tokens = args.tokens ?? 128;
    return new Promise<{ ok: boolean; result?: string; error?: string }>((resolve) => {
      const child = spawn(binary, ['bench', '--model', args.modelId, '--model-dir', dir, '--tokens', String(tokens)], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (c: Buffer) => { stdout += c.toString(); });
      child.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); });
      child.on('exit', (code) => {
        if (code === 0) resolve({ ok: true, result: stdout.trim() });
        else resolve({ ok: false, error: stderr.trim() || `çıkış ${code}` });
      });
      child.on('error', (error) => resolve({ ok: false, error: error.message }));
    });
  });

  // Uygulama kapanırken süreci öldür.
  app.on('before-quit', () => {
    if (proc !== null && !proc.killed) {
      try { proc.kill('SIGTERM'); } catch { /* yoksay */ }
      proc = null;
    }
  });
}
