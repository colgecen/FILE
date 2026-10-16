import { execFile, spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AiModelsResult } from '../shared/api-types';

// Yerel opencode CLI'sini konuşturur: model listesi auth-farkındadır,
// sohbet istekleri gerçek OpenCode istemcisinden çıkar (ücretsiz tier kuralına uygun).

export type CliRunCallbacks = {
  readonly onSession: (sessionId: string) => void;
  readonly onToken: (text: string) => void;
  readonly onDone: (text: string) => void;
  readonly onError: (message: string) => void;
};

export type CliChatArgs = {
  readonly requestId: string;
  readonly model: string;
  readonly prompt: string;
  readonly sessionId: string | null;
};

export type CliChild = {
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  readonly on: (event: 'close', listener: (code: number | null) => void) => unknown;
  readonly kill: (signal?: NodeJS.Signals) => unknown;
};

export type SpawnLike = (
  command: string,
  args: readonly string[],
  options: { readonly cwd: string },
) => CliChild;

export type RunEvent =
  | { readonly kind: 'session'; readonly sessionId: string }
  | { readonly kind: 'text'; readonly partId: string; readonly text: string }
  | { readonly kind: 'other' }
  | { readonly kind: 'invalid' };

export function parseRunEvent(line: string): RunEvent {
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch {
    return { kind: 'invalid' };
  }
  if (typeof json !== 'object' || json === null) return { kind: 'invalid' };
  const record = json as {
    type?: unknown;
    sessionID?: unknown;
    part?: { id?: unknown; type?: unknown; text?: unknown } | null;
  };
  const sessionId = typeof record.sessionID === 'string' ? record.sessionID : '';
  if (record.type === 'text') {
    const part = record.part;
    if (typeof part?.text === 'string') {
      const partId = typeof part.id === 'string' ? part.id : '';
      return { kind: 'text', partId, text: part.text };
    }
  }
  if (sessionId.length > 0) return { kind: 'session', sessionId };
  return { kind: 'other' };
}

export function extractOpencodeModels(output: string): readonly string[] {
  const ids = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('opencode/'))
    .map((line) => line.slice('opencode/'.length))
    .filter((id) => id.length > 0);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function cliErrorLine(stderr: string): string {
  const clean = stderr.replace(ANSI_PATTERN, '');
  const lines = clean
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? '';
}

function whichOpencode(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('which', ['opencode'], { timeout: 3000 }, (error, stdout) => {
      if (error !== null) {
        resolve(null);
        return;
      }
      const path = stdout.trim().split('\n')[0] ?? '';
      resolve(path.length > 0 ? path : null);
    });
  });
}

let cachedBin: string | null | undefined;

export async function findOpencodeBinary(): Promise<string | null> {
  if (cachedBin !== undefined) return cachedBin;
  const candidates: string[] = [];
  const envBin = process.env['OPENCODE_BIN'];
  if (envBin !== undefined && envBin.length > 0) candidates.push(envBin);
  const fromPath = await whichOpencode();
  if (fromPath !== null) candidates.push(fromPath);
  candidates.push(join(homedir(), '.opencode', 'bin', 'opencode'));
  candidates.push('/usr/local/bin/opencode', '/usr/bin/opencode');
  for (const candidate of candidates) {
    try {
      await access(candidate);
      cachedBin = candidate;
      return candidate;
    } catch {
      // sıradaki aday denenir
    }
  }
  cachedBin = null;
  return null;
}

export function resetOpencodeBinaryCache(): void {
  cachedBin = undefined;
}

const MODELS_TTL_MS = 60_000;
let modelsCache: { at: number; result: AiModelsResult } | null = null;

export async function listOpencodeModels(): Promise<AiModelsResult> {
  if (modelsCache !== null && Date.now() - modelsCache.at < MODELS_TTL_MS) {
    return modelsCache.result;
  }
  const bin = await findOpencodeBinary();
  if (bin === null) return { ok: false, models: [], error: 'opencode CLI bulunamadı' };
  const result = await new Promise<AiModelsResult>((resolve) => {
    execFile(
      bin,
      ['models'],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
      (error, stdout) => {
        if (error !== null) {
          resolve({ ok: false, models: [], error: 'opencode model listesi alınamadı' });
          return;
        }
        const models = extractOpencodeModels(stdout);
        if (models.length === 0) {
          resolve({ ok: false, models: [], error: 'opencode modeli bulunamadı' });
          return;
        }
        resolve({ ok: true, models });
      },
    );
  });
  if (result.ok) modelsCache = { at: Date.now(), result };
  return result;
}

export function startOpencodeCliChat(
  args: CliChatArgs,
  callbacks: CliRunCallbacks,
  options?: {
    readonly bin?: string | null;
    readonly spawnFn?: SpawnLike;
    readonly cwd?: string;
  },
): () => void {
  const bin = options?.bin;
  if (bin === null || bin === undefined) {
    callbacks.onError('opencode CLI bulunamadı — yerel opencode kurulumu gerekli');
    return () => undefined;
  }
  const spawnFn = options?.spawnFn ?? (spawn as unknown as SpawnLike);
  const cliArgs = ['run', '--format', 'json', '-m', `opencode/${args.model}`];
  if (args.sessionId !== null) cliArgs.push('-s', args.sessionId);
  cliArgs.push(args.prompt);
  let child: CliChild;
  try {
    child = spawnFn(bin, cliArgs, { cwd: options?.cwd ?? homedir() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    callbacks.onError(message.slice(0, 300));
    return () => undefined;
  }

  const textByPart = new Map<string, string>();
  const order: string[] = [];
  let sessionId = args.sessionId;
  let settled = false;
  let stderrTail = '';
  let buffer = '';

  const currentText = (): string => order.map((id) => textByPart.get(id) ?? '').join('');

  const settle = (run: () => void): void => {
    if (settled) return;
    settled = true;
    run();
  };

  const flushLine = (line: string): void => {
    if (settled) return;
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    const event = parseRunEvent(trimmed);
    if (event.kind === 'session') {
      if (sessionId !== event.sessionId) {
        sessionId = event.sessionId;
        callbacks.onSession(event.sessionId);
      }
      return;
    }
    if (event.kind === 'text') {
      if (!textByPart.has(event.partId)) order.push(event.partId);
      textByPart.set(event.partId, event.text);
      callbacks.onToken(currentText());
    }
  };

  child.stdout?.on('data', (chunk: Buffer | string) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) flushLine(line);
  });
  child.stderr?.on('data', (chunk: Buffer | string) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });
  child.on('close', (code) => {
    if (buffer.length > 0) flushLine(buffer);
    if (code === 0) {
      settle(() => callbacks.onDone(currentText()));
      return;
    }
    const detail = cliErrorLine(stderrTail);
    settle(() =>
      callbacks.onError(
        detail.length > 0 ? detail.slice(0, 300) : `opencode çıkış kodu ${code ?? '?'}`,
      ),
    );
  });

  return () => {
    if (settled) return;
    settled = true;
    try {
      child.kill('SIGTERM');
    } catch {
      // süreç zaten bitmiş olabilir
    }
  };
}
