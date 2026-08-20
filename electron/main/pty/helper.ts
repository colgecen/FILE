import { spawn as ptySpawn, type IPty } from '@homebridge/node-pty-prebuilt-multiarch';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export type PtyHelperMessage =
  | { readonly type: 'spawn'; readonly id: string; readonly cols: number; readonly rows: number; readonly cwd?: string }
  | { readonly type: 'write'; readonly id: string; readonly data: string }
  | { readonly type: 'resize'; readonly id: string; readonly cols: number; readonly rows: number }
  | { readonly type: 'kill'; readonly id: string };

export type PtyHelperEvent =
  | { readonly type: 'ready' }
  | { readonly type: 'data'; readonly id: string; readonly data: string }
  | { readonly type: 'exit'; readonly id: string; readonly exitCode: number }
  | { readonly type: 'error'; readonly id: string; readonly message: string };

const shellFor = (): string => process.env['PTY_SHELL'] ?? process.env['SHELL'] ?? '/bin/sh';

export function runPtyHelper(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): void {
  const sessions = new Map<string, IPty>();

  const send = (event: PtyHelperEvent): void => {
    output.write(`${JSON.stringify(event)}\n`);
  };

  const spawnSession = (msg: Extract<PtyHelperMessage, { type: 'spawn' }>): void => {
    if (sessions.has(msg.id)) return;
    let pty: IPty;
    try {
      pty = ptySpawn(shellFor(), [], {
        name: 'xterm-256color',
        cols: msg.cols,
        rows: msg.rows,
        env: { ...process.env, TERM: 'xterm-256color' },
        ...(msg.cwd === undefined ? {} : { cwd: msg.cwd }),
      });
    } catch (error) {
      send({ type: 'error', id: msg.id, message: error instanceof Error ? error.message : 'Spawn hatası' });
      return;
    }
    sessions.set(msg.id, pty);
    pty.onData((data) => send({ type: 'data', id: msg.id, data }));
    pty.onExit(({ exitCode }) => {
      sessions.delete(msg.id);
      send({ type: 'exit', id: msg.id, exitCode });
    });
  };

  const onMessage = (line: string): void => {
    let msg: PtyHelperMessage;
    try {
      msg = JSON.parse(line) as PtyHelperMessage;
    } catch {
      return;
    }
    const pty = sessions.get(msg.id);
    switch (msg.type) {
      case 'spawn':
        spawnSession(msg);
        break;
      case 'write':
        pty?.write(msg.data);
        break;
      case 'resize':
        pty?.resize(msg.cols, msg.rows);
        break;
      case 'kill':
        pty?.kill();
        sessions.delete(msg.id);
        break;
    }
  };

  send({ type: 'ready' });
  const reader = createInterface({ input, crlfDelay: Infinity });
  reader.on('line', onMessage);
  reader.on('close', () => {
    for (const pty of sessions.values()) {
      try {
        pty.kill();
      } catch {
        // süreç zaten sonlanmış olabilir
      }
    }
  });
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  runPtyHelper(process.stdin, process.stdout);
}