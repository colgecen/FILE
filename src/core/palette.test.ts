import { afterEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import { focusManager } from './focus';
import { registerMenuCommands } from './menuCommands';
import { openFilesModel } from './openFiles';
import { paletteModel } from './palette';
import { registerNavCommands } from './navCommands';

const registry = new CommandRegistry();
registerMenuCommands(registry);
registerNavCommands(registry);

afterEach(() => {
  openFilesModel.set([]);
});

describe('PaletteModel', () => {
  it('varsayılan listede ilk on iki komutu gösterir', () => {
    paletteModel.reset(registry.list());
    const state = paletteModel.getState();
    expect(state.items.length).toBe(12);
    expect(state.activeIndex).toBe(0);
  });

  it('sorguya göre komutları filtreler', () => {
    paletteModel.reset(registry.list());
    paletteModel.setQuery('kaydet', registry.list());
    const titles = paletteModel.getState().items.map((item) => item.title);
    expect(titles).toContain('Kaydet');
  });

  it('eşanlam ile komut bulunur', () => {
    paletteModel.reset(registry.list());
    paletteModel.setQuery('w', registry.list());
    const items = paletteModel.getState().items;
    expect(items.map((item) => item.commandId)).toContain('file.save');
    expect(items.map((item) => item.commandId)).toContain('file.save.all');
  });

  it('açık dosya adıyla arama yapılır', () => {
    openFilesModel.set([{ name: 'main.ts', path: '/proje/main.ts' }]);
    paletteModel.reset(registry.list());
    paletteModel.setQuery('main', registry.list());
    const items = paletteModel.getState().items;
    expect(items.map((item) => item.commandId)).toContain('file.open');
    const fileItem = items.find((item) => item.filePath === '/proje/main.ts');
    expect(fileItem?.title).toBe('main.ts');
  });

  it('sorgusuz listede açık dosyalar yer almaz', () => {
    openFilesModel.set([{ name: 'main.ts', path: '/proje/main.ts' }]);
    paletteModel.reset(registry.list());
    expect(paletteModel.getState().items.map((item) => item.filePath)).not.toContain(
      '/proje/main.ts',
    );
  });

  it('seçim sarar', () => {
    paletteModel.reset(registry.list());
    paletteModel.move(-1);
    expect(paletteModel.getState().activeIndex).toBe(11);
    paletteModel.move(1);
    expect(paletteModel.getState().activeIndex).toBe(0);
  });

  it('dağınık harflerle bulanık eşleşir', () => {
    paletteModel.reset(registry.list());
    paletteModel.setQuery('kdt', registry.list());
    const titles = paletteModel.getState().items.map((item) => item.title);
    expect(titles).toContain('Kaydet');
  });

  it('eşleşmeyen komutlar sonuçtan elenir', () => {
    paletteModel.reset([
      { id: 'a', title: 'Yapay Zekâ Sohbeti', category: 'ai', run: () => ({ ok: true }) },
      { id: 'b', title: 'Kaydet', category: 'file', run: () => ({ ok: true }) },
      { id: 'c', title: 'Uzay', category: 'file', run: () => ({ ok: true }) },
    ]);
    paletteModel.setQuery('kay', [
      { id: 'a', title: 'Yapay Zekâ Sohbeti', category: 'ai', run: () => ({ ok: true }) },
      { id: 'b', title: 'Kaydet', category: 'file', run: () => ({ ok: true }) },
      { id: 'c', title: 'Uzay', category: 'file', run: () => ({ ok: true }) },
    ]);
    const items = paletteModel.getState().items;
    expect(items.map((item) => item.commandId)).toEqual(['b']);
  });

  it('yüksek puanlı eşleşme önce sıralanır', () => {
    paletteModel.reset([
      { id: 'head', title: 'Kaydet', category: 'file', run: () => ({ ok: true }) },
      { id: 'tail', title: 'Çok Kaydet', category: 'file', run: () => ({ ok: true }) },
    ]);
    paletteModel.setQuery('k', [
      { id: 'head', title: 'Kaydet', category: 'file', run: () => ({ ok: true }) },
      { id: 'tail', title: 'Çok Kaydet', category: 'file', run: () => ({ ok: true }) },
    ]);
    const items = paletteModel.getState().items;
    expect(items.map((item) => item.commandId)).toEqual(['head', 'tail']);
  });
});

describe('palette açılış akışı', () => {
  it('toggle palet bölgesini açar ve komutları yükler', async () => {
    paletteModel.reset(registry.list());
    await registry.run('palette.toggle');
    expect(focusManager.get()).toBe('palette');
    expect(paletteModel.getState().items.length).toBeGreaterThan(0);
    while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
  });

  it('toggle tekrar paleti kapatır ve önceki bölgeye döner', async () => {
    paletteModel.reset(registry.list());
    await registry.run('palette.toggle');
    await registry.run('palette.toggle');
    expect(focusManager.get()).toBe('editor');
    expect(paletteModel.getState().query).toBe('');
  });
});

describe('palet seçim komutları', () => {
  it('up ve down seçimi kaydırır', async () => {
    paletteModel.reset(registry.list());
    await registry.run('palette.down');
    expect(paletteModel.getState().activeIndex).toBe(1);
    await registry.run('palette.up');
    expect(paletteModel.getState().activeIndex).toBe(0);
  });

  it('confirm seçili komutu çalıştırır ve paleti kapatır', async () => {
let executed = false;
    registry.register({
      id: 'test.hello',
      title: 'Merhaba',
      category: 'file',
      run: () => {
        executed = true;
        return { ok: true };
      },
    });
    await registry.run('palette.toggle');
    paletteModel.reset([registry.get('test.hello')!]);
    await registry.run('palette.confirm');
    expect(executed).toBe(true);
    expect(focusManager.get()).toBe('editor');
  });

  it('close sorguyu temizler ve önceki bölgeye döner', async () => {
    paletteModel.reset(registry.list());
    await registry.run('palette.toggle');
    paletteModel.setQuery('xyz', registry.list());
    await registry.run('palette.close');
    expect(paletteModel.getState().query).toBe('');
    expect(focusManager.get()).toBe('editor');
  });
});