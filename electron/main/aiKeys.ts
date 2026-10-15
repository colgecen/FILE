import { app, ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AiEnvEntry, AiKeyDeleteArgs, AiKeyHasResult, AiKeySetArgs } from '../shared/api-types';

// API anahtarları OS anahtarlığıyla şifreli saklanır (safeStorage).
// Anahtar değeri ASLA renderer'a veya loglara inmez; sadece var/yok bilgisi taşınır.

const STORE_FILE = 'ai-keys.json';

export type KeyCrypto = {
  readonly isAvailable: () => boolean;
  readonly encrypt: (plain: string) => Buffer;
  readonly decrypt: (encrypted: Buffer) => string;
};

export type KeyFileStore = {
  readonly read: () => Promise<Record<string, string>>;
  readonly write: (entries: Record<string, string>) => Promise<void>;
};

export function createKeyVault(crypto: KeyCrypto, files: KeyFileStore): {
  readonly has: (provider: string) => Promise<AiKeyHasResult>;
  readonly set: (provider: string, key: string) => Promise<{ ok: boolean; error?: string }>;
  readonly remove: (provider: string) => Promise<{ ok: boolean }>;
  readonly resolve: (provider: string) => Promise<string | null>;
} {
  const has = async (provider: string): Promise<AiKeyHasResult> => {
    if (!crypto.isAvailable()) return { present: false };
    const entries = await files.read().catch((): Record<string, string> => ({}));
    return { present: (entries[provider] ?? '').length > 0 };
  };

  const set = async (provider: string, key: string): Promise<{ ok: boolean; error?: string }> => {
    if (provider.trim().length === 0) return { ok: false, error: 'Sağlayıcı boş' };
    if (key.trim().length === 0) return { ok: false, error: 'Anahtar boş' };
    if (!crypto.isAvailable()) {
      return { ok: false, error: 'OS anahtarlığı yok — ortam değişkeni kullanın' };
    }
    const entries = await files.read().catch((): Record<string, string> => ({}));
    entries[provider] = crypto.encrypt(key).toString('base64');
    await files.write(entries);
    return { ok: true };
  };

  const remove = async (provider: string): Promise<{ ok: boolean }> => {
    const entries = await files.read().catch((): Record<string, string> => ({}));
    delete entries[provider];
    await files.write(entries).catch(() => undefined);
    return { ok: true };
  };

  const resolve = async (provider: string): Promise<string | null> => {
    if (!crypto.isAvailable()) return null;
    const entries = await files.read().catch((): Record<string, string> => ({}));
    const stored = entries[provider];
    if (stored === undefined || stored.length === 0) return null;
    try {
      return crypto.decrypt(Buffer.from(stored, 'base64'));
    } catch {
      return null;
    }
  };

  return { has, set, remove, resolve };
}

/** Ortam değişkeni taraması — yalnızca var/yok bilgisi döner, değer asla. */
export function scanEnv(
  candidates: readonly { readonly provider: string; readonly envVar: string | null }[],
  env: NodeJS.ProcessEnv = process.env,
): readonly AiEnvEntry[] {
  return candidates
    .filter((entry) => entry.envVar !== null)
    .map((entry) => ({
      provider: entry.provider,
      envVar: entry.envVar as string,
      present: (env[entry.envVar as string] ?? '').length > 0,
    }));
}

function userDataStore(): KeyFileStore {  const path = join(app.getPath('userData'), STORE_FILE);
  return {
    read: async () => {
      try {
        const raw = await readFile(path, 'utf-8');
        return JSON.parse(raw) as Record<string, string>;
      } catch {
        return {};
      }
    },
    write: async (entries) => {
      await writeFile(path, JSON.stringify(entries), 'utf-8');
    },
  };
}

let vaultInstance: ReturnType<typeof createKeyVault> | null = null;

function vault(): ReturnType<typeof createKeyVault> {
  if (vaultInstance === null) {
    const crypto: KeyCrypto = {
      isAvailable: () => safeStorage.isEncryptionAvailable(),
      encrypt: (plain) => safeStorage.encryptString(plain),
      decrypt: (encrypted) => safeStorage.decryptString(encrypted),
    };
    vaultInstance = createKeyVault(crypto, userDataStore());
  }
  return vaultInstance;
}

/**
 * Efektif anahtar çözümleme (öncelik: açık override → kasa → ortam değişkeni).
 * Değer yalnızca main içinde kalır, IPC ile asla taşınmaz.
 */
export async function resolveApiKey(
  provider: string,
  keyEnv: string | null,
  override: string | null,
): Promise<string | null> {
  if (override !== null && override.length > 0) return override;
  const stored = await vault().resolve(provider);
  if (stored !== null) return stored;
  if (keyEnv !== null) {
    const fromEnv = process.env[keyEnv] ?? '';
    if (fromEnv.length > 0) return fromEnv;
  }
  return null;
}

export function registerAiKeyHandlers(): void {
  ipcMain.handle('ai:key:has', async (_event: IpcMainInvokeEvent, provider: string) =>
    vault().has(provider),
  );
  ipcMain.handle('ai:key:set', async (_event: IpcMainInvokeEvent, args: AiKeySetArgs) =>
    vault().set(args.provider, args.key),
  );
  ipcMain.handle('ai:key:delete', async (_event: IpcMainInvokeEvent, args: AiKeyDeleteArgs) =>
    vault().remove(args.provider),
  );
  ipcMain.handle(
    'ai:env:scan',
    async (
      _event: IpcMainInvokeEvent,
      candidates: readonly { readonly provider: string; readonly envVar: string | null }[],
    ) => scanEnv(candidates),
  );
}
