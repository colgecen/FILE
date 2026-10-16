import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AiModelsResult } from '../shared/api-types';

// Yerel opencode kurulumunun model kataloğunu ve oturum bilgisini okur.
// Anahtar değeri yalnızca main içinde kalır; renderer'a asla taşınmaz.

export type LocalModelsResult = AiModelsResult;

type PathEnv = {
  readonly XDG_CACHE_HOME?: string | undefined;
  readonly XDG_DATA_HOME?: string | undefined;
  readonly LOCALAPPDATA?: string | undefined;
  readonly APPDATA?: string | undefined;
};

/** opencode model kataloğunun (models.json) aranacağı dizinler. */
export function opencodeCacheDirs(
  env: PathEnv,
  platform: NodeJS.Platform,
  home: string,
): readonly string[] {
  const dirs: string[] = [];
  const xdg = env.XDG_CACHE_HOME;
  if (xdg !== undefined && xdg.length > 0) dirs.push(join(xdg, 'opencode'));
  dirs.push(join(home, '.cache', 'opencode'));
  dirs.push(join(home, '.var', 'app', 'ai.opencode.opencode', 'cache', 'opencode'));
  if (platform === 'darwin') dirs.push(join(home, 'Library', 'Caches', 'opencode'));
  const local = env.LOCALAPPDATA;
  if (platform === 'win32' && local !== undefined && local.length > 0) {
    dirs.push(join(local, 'opencode', 'cache'));
    dirs.push(join(local, 'opencode'));
  }
  return dirs;
}

/** opencode kimlik dosyasının (auth.json) aranacağı dizinler. */
export function opencodeDataDirs(
  env: PathEnv,
  platform: NodeJS.Platform,
  home: string,
): readonly string[] {
  const dirs: string[] = [];
  const xdg = env.XDG_DATA_HOME;
  if (xdg !== undefined && xdg.length > 0) dirs.push(join(xdg, 'opencode'));
  dirs.push(join(home, '.local', 'share', 'opencode'));
  dirs.push(join(home, '.var', 'app', 'ai.opencode.opencode', 'data', 'opencode'));
  if (platform === 'darwin') dirs.push(join(home, 'Library', 'Application Support', 'opencode'));
  const roaming = env.APPDATA;
  if (platform === 'win32' && roaming !== undefined && roaming.length > 0) {
    dirs.push(join(roaming, 'opencode'));
  }
  const local = env.LOCALAPPDATA;
  if (platform === 'win32' && local !== undefined && local.length > 0) {
    dirs.push(join(local, 'opencode'));
  }
  return dirs;
}

type CatalogEntry = {
  readonly models?: Record<string, unknown>;
};

/** models.json içinden istenen sağlayıcının model kimliklerini çıkarır. */
export function parseCatalog(raw: string, provider: string): readonly string[] | null {
  try {
    const json = JSON.parse(raw) as Record<string, CatalogEntry | undefined>;
    const entry = json[provider];
    if (entry === undefined || entry === null || typeof entry !== 'object') return null;
    const models = entry.models;
    if (models === undefined || models === null || typeof models !== 'object') return null;
    return Object.keys(models).sort((a, b) => a.localeCompare(b));
  } catch {
    return null;
  }
}

async function readFirst<T>(
  dirs: readonly string[],
  file: string,
  parse: (raw: string) => T | null,
): Promise<T | null> {
  for (const dir of dirs) {
    try {
      const raw = await readFile(join(dir, file), 'utf-8');
      const parsed = parse(raw);
      if (parsed !== null) return parsed;
    } catch {
      // dosya yok ya da okunamadı — sıradaki dizini dene
    }
  }
  return null;
}

/** Yerel opencode kataloğundan sağlayıcı modellerini listeler. */
export async function readLocalModels(
  provider: string,
  dirs: readonly string[] = opencodeCacheDirs(process.env, process.platform, homedir()),
): Promise<LocalModelsResult> {
  const models = await readFirst(dirs, 'models.json', (raw) => parseCatalog(raw, provider));
  if (models === null) {
    return { ok: false, models: [], error: 'Yerel opencode kataloğu bulunamadı' };
  }
  return { ok: true, models };
}

type AuthEntry = {
  readonly type?: string;
  readonly key?: string;
  readonly access?: string;
};

/** auth.json içeriğinden sağlayıcının anahtarını çıkarır (api veya oauth erişimi). */
export function parseAuth(raw: string, provider: string): string | null {
  try {
    const json = JSON.parse(raw) as Record<string, AuthEntry | undefined>;
    const entry = json[provider];
    if (entry === undefined || entry === null || typeof entry !== 'object') return null;
    if (entry.type === 'api' && typeof entry.key === 'string' && entry.key.length > 0) {
      return entry.key;
    }
    if (typeof entry.access === 'string' && entry.access.length > 0) return entry.access;
    return null;
  } catch {
    return null;
  }
}

/** Yerel opencode auth dosyasından anahtarı okur; yoksa null. */
export async function readLocalApiKey(
  provider: string,
  dirs: readonly string[] = opencodeDataDirs(process.env, process.platform, homedir()),
): Promise<string | null> {
  return readFirst(dirs, 'auth.json', (raw) => parseAuth(raw, provider));
}

export function registerOpencodeLocalHandlers(): void {
  ipcMain.handle('ai:models:local', async (_event: IpcMainInvokeEvent, provider: string) =>
    readLocalModels(provider),
  );
}
