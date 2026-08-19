import { describe, expect, it } from 'vitest';
import { CommandRegistry } from '../core/commands';
import { registerMenuCommands } from '../core/menuCommands';
import { menuTree } from './menuTree';
import { collectMenuCommandIds, menuCommandsMatch } from './menuValidation';

describe('menuTree', () => {
  it('dokuz üst başlık içerir', () => {
    expect(menuTree).toHaveLength(9);
    expect(menuTree.map((top) => top.label)).toEqual([
      'Dosya',
      'Düzenle',
      'Seçim',
      'Görünüm',
      'Git',
      'Çalıştır',
      'Terminal',
      'Yardım',
      'Yapay Zekâ',
    ]);
  });

  it('tüm öğeler komut idsiyle bağlıdır', () => {
    const registry = new CommandRegistry();
    registerMenuCommands(registry);
    expect(menuCommandsMatch(registry)).toBe(true);
  });

  it('komut idleri benzersizdir', () => {
    const ids = collectMenuCommandIds();
    expect(new Set(ids).size).toBe(ids.length);
  });
});