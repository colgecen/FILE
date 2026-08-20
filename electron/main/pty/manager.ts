import type { ChildProcess } from 'node:child_process';

export type PtySpawnOptions = {
  readonly cols: number;
  readonly rows: number;
  readonly cwd?: string;
};

export type PtyManagerEvents = {
  readonly onData: (id: string, data: string) => void;
  readonly onExit: (id: string, exitCode: number) => void;
};

export type PtySpawnFn = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly env: NodeJS.ProcessEnv;
    readonly stdio: readonly ['pipe', 'pipe', 'pipe'];
  },
) => ChildProcess;

export class PtyManager {
  private readonly sessions = new Map<string, PtySpawnOptions>();
  private child: ChildProcess | null = null;
  private pendingBuffer = '';
  private started = false;

  onData: ((id: string, data: string) => void) | null = null;
  onExit: ((id: string, exitCode: number) => void) | null = null;

  constructor(
    private readonly spawnFn: PtySpawnFn,
    private readonly helperPath: string,
    private readonly enableStrictStart = false,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    const nodeBin = process.env['PTY_NODE_BIN'] ?? 'node';
    const child = this.spawnFn(nodeBin, [this.helperPath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    child.stderr?.on('data', () => {
      // helper hataları sesli kapatılır; oturumlar kendi error olayını taşır
    });
    child.stdin?.on('error', () => {
      // helper öldüyse yazma hataları yoksayılır
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      this.pendingBuffer += chunk.toString('utf8');
      const events = this.pendingBuffer.split('\n');
      this.pendingBuffer = events.pop() ?? '';
      for (const line of events) {
        if (line.trim().length === 0) continue;
        this.handleEvent(line);
      }
    });
    child.on('exit', () => {
      this.child = null;
      this.started = false;
    });
  }

  spawnSession(options: PtySpawnOptions): string {
    const id = `pty-${Math.random().toString(36).slice(2, 10)}`;
    this.sessions.set(id, options);
    this.send({ type: 'spawn', id, cols: options.cols, rows: options.rows, cwd: options.cwd });
    return id;
  }

  write(id: string, data: string): void {
    if (!this.sessions.has(id)) return;
    this.send({ type: 'write', id, data });
  }

  resize(id: string, cols: number, rows: number): void {
    if (!this.sessions.has(id)) return;
    this.send({ type: 'resize', id, cols, rows });
  }

  kill(id: string): void {
    if (!this.sessions.has(id)) return;
    this.sessions.delete(id);
    this.send({ type: 'kill', id });
  }

  killAll(): void {
    for (const id of [...this.sessions.keys()]) {
      this.send({ type: 'kill', id });
    }
    this.sessions.clear();
  }

  dispose(): void {
    this.killAll();
    this.child?.stdin?.end();
    this.child = null;
    this.started = false;
  }

  private send(message: object): void {
    if (this.child === null) {
      if (this.enableStrictStart) {
        throw new Error('PTY helper süreci başlatılmadı');
      }
      return;
    }
    this.child.stdin?.write(`${JSON.stringify(message)}\n`);
  }

  private handleEvent(line: string): void {
    let event: {
      readonly type: string;
      readonly id?: string;
      readonly data?: string;
      readonly exitCode?: number;
    };
    try {
      event = JSON.parse(line) as typeof event;
    } catch {
      return;
    }
if (event.type === 'data' && event.id !== undefined && event.data !== undefined) {
      this.onData?.(event.id, event.data);
    } else if (event.type === 'exit' && event.id !== undefined && event.exitCode !== undefined) {
      this.sessions.delete(event.id);
      this.onExit?.(event.id, event.exitCode);
    }
  }
}

export function createPtyManager(spawnFn: PtySpawnFn, helperPath: string): PtyManager {
  return new PtyManager(spawnFn, helperPath);
}