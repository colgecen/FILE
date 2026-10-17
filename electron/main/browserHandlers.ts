import { spawn, execFile } from 'node:child_process';
import { shell } from 'electron';
import { ipcMain } from 'electron';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type Candidate = {
  readonly label: string;
  readonly cmd: string;
  readonly prefix: readonly string[];
  readonly flatpakApp?: string;
};

const CANDIDATES: readonly Candidate[] = [
  { label: 'zen', cmd: 'zen', prefix: [] },
  { label: 'zen', cmd: 'zen-browser', prefix: [] },
  { label: 'zen', cmd: 'flatpak', prefix: ['run', 'app.zen_browser.zen'], flatpakApp: 'app.zen_browser.zen' },
  { label: 'google-chrome', cmd: 'google-chrome', prefix: [] },
  { label: 'google-chrome', cmd: 'google-chrome-stable', prefix: [] },
  { label: 'google-chrome', cmd: 'flatpak', prefix: ['run', 'app.google.Chrome'], flatpakApp: 'app.google.Chrome' },
  { label: 'chromium', cmd: 'chromium', prefix: [] },
  { label: 'chromium', cmd: 'chromium-browser', prefix: [] },
  { label: 'chromium', cmd: 'flatpak', prefix: ['run', 'org.chromium.Chromium'], flatpakApp: 'org.chromium.Chromium' },
  { label: 'firefox', cmd: 'firefox', prefix: [] },
  { label: 'firefox', cmd: 'flatpak', prefix: ['run', 'org.mozilla.firefox'], flatpakApp: 'org.mozilla.firefox' },
];

let flatpakApps: Promise<ReadonlySet<string>> | null = null;

function listFlatpakApps(): Promise<ReadonlySet<string>> {
  if (flatpakApps === null) {
    flatpakApps = execFileAsync('flatpak', ['list', '--app', '--columns=application'])
      .then(({ stdout }) => new Set(stdout.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)))
      .catch((): ReadonlySet<string> => new Set<string>());
  }
  return flatpakApps;
}

async function flatpakHas(appId: string): Promise<boolean> {
  return (await listFlatpakApps()).has(appId);
}

function trySpawn(candidate: Candidate, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(candidate.cmd, [...candidate.prefix, url], { stdio: 'ignore', detached: true });
    child.on('spawn', () => {
      child.unref();
      resolve(true);
    });
    child.on('error', () => resolve(false));
  });
}

async function tryCandidate(candidate: Candidate, url: string): Promise<boolean> {
  if (candidate.flatpakApp !== undefined && !(await flatpakHas(candidate.flatpakApp))) return false;
  return trySpawn(candidate, url);
}

export async function launchBrowser(url: string, name?: string): Promise<string> {
  const list =
    typeof name === 'string' && name.length > 0
      ? CANDIDATES.filter((candidate) => candidate.label === name)
      : CANDIDATES;
  for (const candidate of list) {
    if (await tryCandidate(candidate, url)) return candidate.label;
  }
  if (typeof name === 'string' && name.length > 0) return 'none';
  try {
    await shell.openExternal(url);
    return 'default';
  } catch {
    return 'none';
  }
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function registerBrowserHandlers(): void {
  ipcMain.handle('app:open-browser', async (_event, url: string, browser?: string): Promise<string> => {
    const raw = String(url ?? '').trim();
    if (raw.length === 0) return launchBrowser('', browser);
    const target = normalizeUrl(raw);
    if (target === null) return 'invalid';
    return launchBrowser(target, browser);
  });
}
