import { spawn } from 'node:child_process';
import { shell } from 'electron';
import { ipcMain } from 'electron';

const BROWSERS = ['zen', 'zen-browser', 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'firefox'];

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

export async function launchBrowser(url: string): Promise<string> {
  for (const browser of BROWSERS) {
    const ok = await new Promise<boolean>((resolve) => {
      const child = spawn(browser, [url], { stdio: 'ignore', detached: true });
      child.on('spawn', () => {
        child.unref();
        resolve(true);
      });
      child.on('error', () => resolve(false));
    });
    if (ok) return browser;
  }
  try {
    await shell.openExternal(url);
    return 'default';
  } catch {
    return 'none';
  }
}

export function registerBrowserHandlers(): void {
  ipcMain.handle('app:open-browser', async (_event, url: string): Promise<string> => {
    const target = normalizeUrl(String(url ?? ''));
    if (target === null) return 'invalid';
    return launchBrowser(target);
  });
}
