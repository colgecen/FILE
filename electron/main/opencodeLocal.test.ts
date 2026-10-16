// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  opencodeCacheDirs,
  opencodeDataDirs,
  parseAuth,
  parseCatalog,
  readLocalApiKey,
  readLocalModels,
} from './opencodeLocal';

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'opencode-local-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('parseCatalog', () => {
  it('sağlayıcı modellerini sıralı biçimde çıkarır', () => {
    const raw = JSON.stringify({
      opencode: { models: { 'gpt-5.4': { id: 'gpt-5.4' }, 'big-pickle': { id: 'big-pickle' } } },
    });
    expect(parseCatalog(raw, 'opencode')).toEqual(['big-pickle', 'gpt-5.4']);
  });

  it('sağlayıcı yoksa null döner', () => {
    expect(parseCatalog(JSON.stringify({ anthropic: { models: {} } }), 'opencode')).toBeNull();
  });

  it('bozuk JSON null döner', () => {
    expect(parseCatalog('{', 'opencode')).toBeNull();
  });
});

describe('readLocalModels', () => {
  it('ilk geçerli models.json dosyasını kullanır', async () => {
    const missing = await tempDir();
    const found = await tempDir();
    await writeFile(
      join(found, 'models.json'),
      JSON.stringify({ opencode: { models: { 'cat-jam-free': {}, 'big-pickle': {} } } }),
      'utf-8',
    );
    const result = await readLocalModels('opencode', [missing, found]);
    expect(result.ok).toBe(true);
    expect(result.models).toEqual(['big-pickle', 'cat-jam-free']);
  });

  it('dosya yoksa hata döner', async () => {
    const empty = await tempDir();
    const result = await readLocalModels('opencode', [empty]);
    expect(result.ok).toBe(false);
    expect(result.models).toEqual([]);
  });
});

describe('parseAuth', () => {
  it('api tipindeki anahtarı çıkarır', () => {
    const raw = JSON.stringify({ opencode: { type: 'api', key: 'zen-123' } });
    expect(parseAuth(raw, 'opencode')).toBe('zen-123');
  });

  it('oauth erişim jetonuna düşer', () => {
    const raw = JSON.stringify({ opencode: { type: 'oauth', access: 'acc-1', refresh: 'r' } });
    expect(parseAuth(raw, 'opencode')).toBe('acc-1');
  });

  it('boş ya da eksik kayıtta null döner', () => {
    expect(parseAuth(JSON.stringify({ google: { type: 'api', key: 'x' } }), 'opencode')).toBeNull();
    expect(parseAuth(JSON.stringify({ opencode: { key: '' } }), 'opencode')).toBeNull();
    expect(parseAuth('{', 'opencode')).toBeNull();
  });
});

describe('readLocalApiKey', () => {
  it('auth.json içinden anahtarı okur', async () => {
    const dir = await tempDir();
    await mkdir(join(dir, 'nested'), { recursive: true });
    await writeFile(
      join(dir, 'auth.json'),
      JSON.stringify({ opencode: { type: 'api', key: 'gizli-anahtar' } }),
      'utf-8',
    );
    await expect(readLocalApiKey('opencode', [join(dir, 'nested'), dir])).resolves.toBe(
      'gizli-anahtar',
    );
  });

  it('kayıt yoksa null döner', async () => {
    const dir = await tempDir();
    await expect(readLocalApiKey('opencode', [dir])).resolves.toBeNull();
  });
});

describe('opencodeCacheDirs', () => {
  it('linux dizinlerini xdg ve flatpak ile listeler', () => {
    const dirs = opencodeCacheDirs({ XDG_CACHE_HOME: '/xdg/cache' }, 'linux', '/home/u');
    expect(dirs).toContain('/xdg/cache/opencode');
    expect(dirs).toContain('/home/u/.cache/opencode');
    expect(dirs).toContain('/home/u/.var/app/ai.opencode.opencode/cache/opencode');
  });

  it('macOS ve Windows yollarını platforma göre ekler', () => {
    expect(opencodeCacheDirs({}, 'darwin', '/Users/u')).toContain(
      '/Users/u/Library/Caches/opencode',
    );
    expect(
      opencodeCacheDirs({ LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' }, 'win32', 'C:\\Users\\u'),
    ).toContain(join('C:\\Users\\u\\AppData\\Local', 'opencode', 'cache'));
  });
});

describe('opencodeDataDirs', () => {
  it('linux veri dizinlerini xdg ve flatpak ile listeler', () => {
    const dirs = opencodeDataDirs({ XDG_DATA_HOME: '/xdg/data' }, 'linux', '/home/u');
    expect(dirs).toContain('/xdg/data/opencode');
    expect(dirs).toContain('/home/u/.local/share/opencode');
    expect(dirs).toContain('/home/u/.var/app/ai.opencode.opencode/data/opencode');
  });
});
