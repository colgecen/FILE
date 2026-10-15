// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createKeyVault, scanEnv, type KeyCrypto, type KeyFileStore } from './aiKeys';

function fakeCrypto(): KeyCrypto {
  return {
    isAvailable: () => true,
    encrypt: (plain) => Buffer.from(`enc:${plain}`),
    decrypt: (encrypted) => {
      const text = encrypted.toString('utf-8');
      if (!text.startsWith('enc:')) throw new Error('bozuk');
      return text.slice('enc:'.length);
    },
  };
}

function memoryStore(initial: Record<string, string> = {}): KeyFileStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    read: async () => ({ ...data }),
    write: async (entries) => {
      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, entries);
    },
  };
}

describe('key kasası', () => {
  it('anahtar saklar, varlığını bildirir, çözer', async () => {
    const vault = createKeyVault(fakeCrypto(), memoryStore());
    expect(await vault.has('openai')).toEqual({ present: false });
    await expect(vault.set('openai', 'gizli-123')).resolves.toEqual({ ok: true });
    expect(await vault.has('openai')).toEqual({ present: true });
    await expect(vault.resolve('openai')).resolves.toBe('gizli-123');
  });

  it('boş anahtarı reddeder', async () => {
    const vault = createKeyVault(fakeCrypto(), memoryStore());
    await expect(vault.set('openai', '   ')).resolves.toEqual({ ok: false, error: 'Anahtar boş' });
    expect(await vault.has('openai')).toEqual({ present: false });
  });

  it('siler ve yok sayar', async () => {
    const store = memoryStore();
    const vault = createKeyVault(fakeCrypto(), store);
    await vault.set('groq', 'x');
    await expect(vault.remove('groq')).resolves.toEqual({ ok: true });
    expect(await vault.has('groq')).toEqual({ present: false });
    expect(store.data['groq']).toBeUndefined();
  });

  it('bozuk girdide null çözer', async () => {
    const vault = createKeyVault(fakeCrypto(), memoryStore({ openai: '!!!bozuk-base64!!!' }));
    await expect(vault.resolve('openai')).resolves.toBeNull();
  });

  it('şifreleme yoksa saklamayı reddeder', async () => {
    const crypto: KeyCrypto = { ...fakeCrypto(), isAvailable: () => false };
    const vault = createKeyVault(crypto, memoryStore());
    const result = await vault.set('openai', 'x');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('anahtarlığı');
  });

  it('ham anahtar dosyada düz metin durmaz', async () => {
    const store = memoryStore();
    const vault = createKeyVault(fakeCrypto(), store);
    await vault.set('deepseek', 'süper-gizli');
    const raw = JSON.stringify(store.data);
    expect(raw).not.toContain('süper-gizli');
  });
});

describe('scanEnv', () => {
  it('yalnızca var/yok bilgisi döner, değer asla', () => {
    const entries = scanEnv(
      [
        { provider: 'openai', envVar: 'OPENAI_API_KEY' },
        { provider: 'ollama', envVar: null },
        { provider: 'groq', envVar: 'GROQ_API_KEY' },
      ],
      { OPENAI_API_KEY: 'asla-görünmemeli' } as NodeJS.ProcessEnv,
    );
    expect(entries).toEqual([
      { provider: 'openai', envVar: 'OPENAI_API_KEY', present: true },
      { provider: 'groq', envVar: 'GROQ_API_KEY', present: false },
    ]);
    expect(JSON.stringify(entries)).not.toContain('asla-görünmemeli');
  });

  it('boş değişkeni yok sayar', () => {
    const entries = scanEnv([{ provider: 'openai', envVar: 'OPENAI_API_KEY' }], {
      OPENAI_API_KEY: '',
    } as NodeJS.ProcessEnv);
    expect(entries[0]?.present).toBe(false);
  });
});
