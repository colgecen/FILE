import { afterEach, describe, expect, it } from 'vitest';
import { sanitizeTitle, sessionStore } from './sessions';

describe('SessionStore', () => {
  afterEach(() => {
    sessionStore.reset();
  });

  it('ilk ensure yeni sekme açar', () => {
    const id = sessionStore.ensure(false);
    expect(id).not.toBeNull();
    expect(sessionStore.active()?.title).toBe('Yeni sohbet');
  });

  it('meşgulken ensure açmaz', () => {
    expect(sessionStore.ensure(true)).toBeNull();
    expect(sessionStore.getSnapshot().sessions).toHaveLength(0);
  });

  it('geçişte aktif değişir, meşgulken engellenir', () => {
    const first = sessionStore.create();
    const second = sessionStore.create();
    expect(sessionStore.active()?.id).toBe(second);
    expect(sessionStore.switch(first, false)).toBe(true);
    expect(sessionStore.active()?.id).toBe(first);
    expect(sessionStore.switch(second, true)).toBe(false);
    expect(sessionStore.active()?.id).toBe(first);
  });

  it('bilinmeyen sekmeye geçilmez', () => {
    sessionStore.create();
    expect(sessionStore.switch('yok', false)).toBe(false);
  });

  it('kapatma son sekmeyi aktif yapar, meşgulken engellenir', () => {
    const first = sessionStore.create();
    const second = sessionStore.create();
    expect(sessionStore.close(first, true)).toBe(false);
    expect(sessionStore.close(first, false)).toBe(true);
    expect(sessionStore.active()?.id).toBe(second);
    expect(sessionStore.close(second, false)).toBe(true);
    expect(sessionStore.active()).toBeNull();
  });

  it('mesajlar saklanır, başlık ilk iletiden gelir', () => {
    const id = sessionStore.create();
    sessionStore.saveMessages(id, [{ role: 'user', content: 'merhaba dünya, bu uzun bir ilk iletidir evet' }]);
    sessionStore.retitleFrom(id, 'merhaba dünya, bu uzun bir ilk iletidir evet');
    const active = sessionStore.active();
    expect(active?.messages).toHaveLength(1);
    expect(active?.title).toBe('merhaba dünya, bu uzun bir ilk i…');
  });

  it('özel başlık ilk iletiyle ezilmez', () => {
    const id = sessionStore.create();
    sessionStore.saveMessages(id, [{ role: 'user', content: 'a' }]);
    sessionStore.retitleFrom(id, 'ilk');
    sessionStore.retitleFrom(id, 'ikinci');
    expect(sessionStore.active()?.title).not.toBe('ikinci');
  });

  it('AI başlığı sekme adına temizlenir', () => {
    expect(sanitizeTitle('"Dosya düzenleme hatası."')).toBe('Dosya düzenleme hatası');
    expect(sanitizeTitle('```kod```\n  React hatası  ')).toBe('React hatası');
    expect(sanitizeTitle('a'.repeat(40))).toBe(`${'a'.repeat(32)}…`);
    expect(sanitizeTitle('   ')).toBe('');
  });

  it('setTitle AI başlığını uygular, boş ve bilinmeyeni yok sayar', () => {
    const id = sessionStore.create();
    sessionStore.retitleFrom(id, 'ilk istek');
    expect(sessionStore.setTitle(id, 'Sekme Hatası')).toBe(true);
    expect(sessionStore.active()?.title).toBe('Sekme Hatası');
    expect(sessionStore.setTitle(id, '  ')).toBe(false);
    expect(sessionStore.setTitle('yok', 'başlık')).toBe(false);
    expect(sessionStore.active()?.title).toBe('Sekme Hatası');
  });

  it('kip ve efor atanır', () => {
    const id = sessionStore.create();
    expect(sessionStore.active()?.mode).toBe('build');
    expect(sessionStore.active()?.effort).toBe('medium');
    expect(sessionStore.setMode(id, 'build')).toBe(true);
    expect(sessionStore.setEffort(id, 'ultra')).toBe(true);
    expect(sessionStore.active()?.mode).toBe('build');
    expect(sessionStore.active()?.effort).toBe('ultra');
    expect(sessionStore.setMode('yok', 'build')).toBe(false);
    expect(sessionStore.setEffort('yok', 'low')).toBe(false);
  });
});
