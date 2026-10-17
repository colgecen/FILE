import { execFile, spawn, type ChildProcess, type ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { join } from 'node:path';
import { app, ipcMain, type BrowserWindow } from 'electron';
import type { EmbeddedLayout } from '../shared/api-types';

const ZEN_FLATPAK = 'app.zen_browser.zen';

type XWindowInfo = {
  readonly id: number;
  readonly parent: number;
  readonly class: readonly string[] | null;
  readonly name: string | null;
  readonly width: number;
  readonly height: number;
  readonly mapped: boolean;
};

type HelperResult = {
  readonly ok: boolean;
  readonly id?: number;
  readonly windows?: readonly XWindowInfo[];
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly cx?: number;
  readonly cy?: number;
  readonly cw?: number;
  readonly ch?: number;
  readonly mapped?: boolean;
  readonly parent?: number;
  readonly error?: string;
};

let zenProc: ChildProcess | null = null;
let zenXid: number | null = null;
let lastRect: EmbeddedLayout | null = null;
let hidden = false;
let getWindow: () => BrowserWindow | null = () => null;
let queue: Promise<unknown> = Promise.resolve();

let daemon: ChildProcessByStdio<Writable, Readable, null> | null = null;
let daemonBuffer = '';
let requestSeq = 0;
const pending = new Map<number, { resolve: (r: HelperResult) => void; timer: NodeJS.Timeout }>();

function stamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function helperPath(): string {
  return join(app.getAppPath(), 'scripts', 'xembed.py');
}

function settle(id: number, result: HelperResult): void {
  const entry = pending.get(id);
  if (entry === undefined) return;
  pending.delete(id);
  clearTimeout(entry.timer);
  entry.resolve(result);
}

function drainPendingWithError(message: string): void {
  for (const [id, entry] of pending) {
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.resolve({ ok: false, error: message });
  }
}

function ensureDaemon(): ChildProcessByStdio<Writable, Readable, null> | null {
  if (daemon !== null && daemon.exitCode === null && !daemon.killed) return daemon;
  try {
    const proc = spawn('python3', [helperPath(), '--serve'], { stdio: ['pipe', 'pipe', 'ignore'] });
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk: string) => {
      daemonBuffer += chunk;
      for (;;) {
        const index = daemonBuffer.indexOf('\n');
        if (index < 0) break;
        const line = daemonBuffer.slice(0, index).trim();
        daemonBuffer = daemonBuffer.slice(index + 1);
        if (line.length === 0) continue;
        try {
          const parsed = JSON.parse(line) as HelperResult;
          if (typeof parsed.id === 'number') settle(parsed.id, parsed);
        } catch {
          // satır atlanır
        }
      }
    });
    proc.on('exit', () => {
      if (daemon === proc) daemon = null;
      drainPendingWithError('xembed kapandı');
    });
    proc.on('error', () => {
      if (daemon === proc) daemon = null;
    });
    daemon = proc;
    return proc;
  } catch {
    return null;
  }
}

function oneShot(args: readonly string[]): Promise<HelperResult> {
  return new Promise((resolve) => {
    execFile('python3', [helperPath(), ...args], { timeout: 15000 }, (error, stdout) => {
      if (error !== null) {
        resolve({ ok: false, error: error.message });
        return;
      }
      try {
        resolve(JSON.parse(stdout) as HelperResult);
      } catch {
        resolve({ ok: false, error: 'helper JSON hatası' });
      }
    });
  });
}

function runHelper(args: readonly string[]): Promise<HelperResult> {
  const logCmd = args[0];
  const t0 = Date.now();
  const proc = ensureDaemon();
  if (proc === null || proc.stdin === null) return oneShot(args);
  const id = ++requestSeq;
  return new Promise<HelperResult>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: 'zaman aşımı' });
    }, 8000);
    pending.set(id, { resolve, timer });
    try {
      proc.stdin.write(JSON.stringify({ id, cmd: args[0], a: args.slice(1) }) + '\n');
    } catch {
      pending.delete(id);
      clearTimeout(timer);
      resolve({ ok: false, error: 'xembed yazılamadı' });
    }
    console.log(`[xembed ${stamp()}] -> ${logCmd} #${id}`);
  }).then((result) => {
    console.log(`[xembed ${stamp()}] <- ${logCmd} #${id} ${result.ok ? 'ok' : result.error} (${Date.now() - t0}ms)`);
    return result;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isZenWindow(w: XWindowInfo): boolean {
  const cls = (w.class ?? []).join(' ').toLowerCase();
  const name = (w.name ?? '').toLowerCase();
  return cls.includes('zen') || cls.includes('navigator') || name.includes('zen');
}

async function findZenWindow(): Promise<number | null> {
  const result = await runHelper(['list']);
  if (!result.ok || result.windows === undefined) return null;
  const zen = result.windows
    .filter((w) => isZenWindow(w) && w.width > 80 && w.height > 80)
    .sort((a, b) => b.width * b.height - a.width * a.height);
  return zen.length > 0 ? (zen[0] as XWindowInfo).id : null;
}

async function windowAlive(id: number): Promise<boolean> {
  return (await runHelper(['get', String(id)])).ok;
}

function zenInstanceRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('flatpak', ['ps', '--columns=application'], { timeout: 5000 }, (error, stdout) => {
      resolve(error === null && stdout.includes(ZEN_FLATPAK));
    });
  });
}

function overrideZenOnce(): void {
  // Tüm Zen örnekleri X11'e düşsün ki gömülebilsin; CSD/appearance'a dokunulmaz
  // (GTK_CSD yalnızca bizim başlattığımız örneğe CLI'dan verilir).
  execFile('flatpak', ['override', '--user', '--nosocket=wayland', '--socket=x11', '--env=MOZ_ENABLE_WAYLAND=0', ZEN_FLATPAK], () => undefined);
}

function spawnEmbeddedZen(): void {
  // Kullanıcının normal Zen kurulumuna DOKUNMA: env/socket yalnızca bu örneğe verilir.
  const child = spawn(
    'flatpak',
    ['run', '--env=MOZ_ENABLE_WAYLAND=0', '--env=GTK_CSD=0', '--socket=x11', ZEN_FLATPAK],
    { stdio: 'ignore', detached: true },
  );
  child.on('error', () => {
    zenProc = null;
  });
  child.unref();
  zenProc = child;
  // Yeni pencere üstte açılmasın: ana pencereyi öne al, zen bulunca içine gömülür.
  const win = getWindow();
  if (win !== null && !win.isDestroyed()) {
    win.focus();
  }
}

async function ensureZenWindow(): Promise<number | null> {
  const found = await findZenWindow();
  if (found !== null) return found;
  if (zenProc === null && (await zenInstanceRunning())) {
    // Harici (muhtemelen Wayland) örnek çalışıyor: öldürme, penceresini bekle.
    return waitForZenWindow(6000);
  }
  spawnEmbeddedZen();
  return waitForZenWindow(40000);
}

async function waitForZenWindow(timeoutMs: number): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const id = await findZenWindow();
    if (id !== null) return id;
    await sleep(300);
  }
  return null;
}

function hostXid(): number | null {
  const win = getWindow();
  if (win === null || win.isDestroyed()) return null;
  return win.getNativeWindowHandle().readUInt32LE(0);
}

function matchesRect(result: HelperResult, rect: EmbeddedLayout): boolean {
  if (result.ok !== true || result.mapped !== true) return false;
  // Helper içerik kutusunu (CSD payları düşülmüş) dönerse onu, yoksa pencere boyutunu kullan.
  const w = typeof result.cw === 'number' ? result.cw : result.width;
  const h = typeof result.ch === 'number' ? result.ch : result.height;
  if (typeof w !== 'number' || typeof h !== 'number') return false;
  return Math.abs(w - rect.width) <= 2 && Math.abs(h - rect.height) <= 2;
}

async function syncGeom(rect: EmbeddedLayout, reparent: boolean): Promise<boolean> {
  // Firefox yeniden boyutlandırmayı asenkron/kademeli uygular; tekrar tekrar
  // configure göndermek yerine bir kez gönder ve yerleşmesini bekle (takılma olmaz).
  for (let round = 0; round < 3; round += 1) {
    if (zenXid === null) return false;
    const parent = hostXid();
    if (parent === null) return false;
    const args =
      reparent && round === 0
        ? ['embed', String(zenXid), String(parent), String(rect.x), String(rect.y), String(rect.width), String(rect.height)]
        : ['move', String(zenXid), String(rect.x), String(rect.y), String(rect.width), String(rect.height)];
    const applied = await runHelper(args);
    if (!applied.ok) {
      zenXid = null;
      return false;
    }
    for (let poll = 0; poll < 6; poll += 1) {
      const check = await runHelper(['get', String(zenXid)]);
      if (!check.ok) {
        zenXid = null;
        return false;
      }
      if (matchesRect(check, rect)) return true;
      await sleep(150);
    }
  }
  return true;
}

async function embedZen(rect: EmbeddedLayout): Promise<boolean> {
  const parent = hostXid();
  if (parent === null) return false;
  lastRect = rect;
  hidden = false;
  if (zenXid !== null && !(await windowAlive(zenXid))) {
    zenXid = null;
  }
  if (zenXid === null) {
    zenXid = await ensureZenWindow();
  }
  if (zenXid === null) return false;
  const current = await runHelper(['get', String(zenXid)]);
  const alreadyChild = current.ok && current.parent === parent;
  // Zaten child'sa reparent gereksiz (gereksiz repaint/takılma); sadece konumla.
  return syncGeom(rect, !alreadyChild);
}

async function layoutZen(rect: EmbeddedLayout): Promise<boolean> {
  lastRect = rect;
  if (zenXid === null || hidden) return true;
  return syncGeom(rect, false);
}

async function hideZen(): Promise<boolean> {
  if (zenXid === null || lastRect === null) return false;
  hidden = true;
  // Unmap YAPMA: Firefox çizimini durduruyor ve dönüşte siyah ekran veriyor.
  // Bunun yerine pencereyi parent içinde ekran dışına kaydır (kliplenir).
  return (await runHelper([
    'move',
    String(zenXid),
    String(-lastRect.width),
    String(-lastRect.height),
    String(lastRect.width),
    String(lastRect.height),
  ])).ok;
}

async function showZen(): Promise<boolean> {
  if (zenXid === null || lastRect === null) return false;
  hidden = false;
  return syncGeom(lastRect, false);
}

async function closeZen(): Promise<boolean> {
  let ok = true;
  if (zenXid !== null) {
    ok = (await runHelper(['unparent', String(zenXid)])).ok;
  }
  if (zenProc !== null) {
    zenProc.kill('SIGTERM');
    zenProc = null;
  }
  zenXid = null;
  lastRect = null;
  hidden = false;
  return ok;
}

function normalizeLayout(next: unknown): EmbeddedLayout | null {
  if (typeof next !== 'object' || next === null) return null;
  const raw = next as Partial<EmbeddedLayout>;
  if (
    typeof raw.x !== 'number' ||
    typeof raw.y !== 'number' ||
    typeof raw.width !== 'number' ||
    typeof raw.height !== 'number'
  ) {
    return null;
  }
  return {
    x: Math.round(raw.x),
    y: Math.round(raw.y),
    width: Math.round(raw.width),
    height: Math.round(raw.height),
  };
}

let strayTimer: NodeJS.Timeout | null = null;

function startStrayWatcher(): void {
  if (strayTimer !== null) return;
  strayTimer = setInterval(() => {
    void (async () => {
      if (zenXid !== null) {
        if (await windowAlive(zenXid)) return;
        zenXid = null;
      }
      const id = await findZenWindow();
      if (id === null) return;
      const host = hostXid();
      if (host === null) return;
      const g = await runHelper(['get', String(id)]);
      if (g.ok && g.parent === host) {
        zenXid = id;
        return;
      }
      zenXid = id;
      if (lastRect !== null && !hidden) {
        // Zen ortamı şu an görünür: pencereyi doğrudan içeri al.
        await syncGeom(lastRect, true);
        return;
      }
      // Görünür değil: renderer zen ortamını açsın, embedZen pencereyi devralır.
      const win = getWindow();
      if (win !== null && !win.isDestroyed()) {
        win.webContents.send('zen:external');
      }
    })();
  }, 1500);
}

export function registerZenEmbed(getWin: () => BrowserWindow | null): void {
  getWindow = getWin;
  overrideZenOnce();
  startStrayWatcher();

  app.on('before-quit', () => {
    if (strayTimer !== null) {
      clearInterval(strayTimer);
      strayTimer = null;
    }
    void closeZen();
    if (daemon !== null) {
      daemon.kill();
      daemon = null;
    }
  });

  const ipcLog = (name: string): void => {
    console.log(`[zen-ipc ${stamp()}] ${name}`);
  };

  ipcMain.handle('zen:embed', (_event, layout: unknown): Promise<boolean> => {
    const rect = normalizeLayout(layout);
    if (rect === null) return Promise.resolve(false);
    ipcLog(`embed ${rect.x},${rect.y} ${rect.width}x${rect.height}`);
    return enqueue(() => embedZen(rect));
  });

  ipcMain.handle('zen:layout', (_event, layout: unknown): Promise<boolean> => {
    const rect = normalizeLayout(layout);
    if (rect === null) return Promise.resolve(false);
    ipcLog(`layout ${rect.x},${rect.y} ${rect.width}x${rect.height}`);
    return enqueue(() => layoutZen(rect));
  });

  ipcMain.handle('zen:show', () => {
    ipcLog('show');
    return enqueue(() => showZen());
  });
  ipcMain.handle('zen:hide', () => {
    ipcLog('hide');
    return enqueue(() => hideZen());
  });
  ipcMain.handle('zen:close', () => {
    ipcLog('close');
    return enqueue(() => closeZen());
  });
}
