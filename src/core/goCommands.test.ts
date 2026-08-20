import { afterEach, describe, expect, it } from 'vitest';
import { setActiveEditor } from '../editor/activeEditor';
import type { monaco } from '../editor/monacoSetup';
import { focusManager } from './focus';
import { registerGoCommands } from './goCommands';
import { openFilesModel } from './openFiles';
import { paletteModel } from './palette';
import { tabsModel } from './tabs';
import type { CommandDef } from './types';

type FakeEditor = {
  editor: monaco.editor.IStandaloneCodeEditor;
  triggers: string[];
  focuses: () => number;
};

function fakeEditor(path: string): FakeEditor {
  const triggers: string[] = [];
  let focusCount = 0;
  const editor = {
    getModel: () => ({ uri: { path } }),
    getPosition: () => ({ lineNumber: 4, column: 2 }),
    trigger: (_source: string, action: string, _payload: unknown) => {
      triggers.push(action);
    },
    focus: () => {
      focusCount += 1;
    },
  } as unknown as monaco.editor.IStandaloneCodeEditor;
  return { editor, triggers, focuses: () => focusCount };
}

function commands(): CommandDef[] {
  const list: CommandDef[] = [];
  registerGoCommands((command) => list.push(command));
  return list;
}

function closePalette(): void {
  while (focusManager.get() !== 'editor') {
    focusManager.returnToPrevious();
  }
}

describe('go komutları', () => {
  afterEach(() => {
    setActiveEditor(null);
    tabsModel.reset();
    openFilesModel.set([]);
    paletteModel.reset([]);
    closePalette();
  });

  it('go.to.symbol/line/definition/references monaco eylemlerini tetikler', () => {
    const fake = fakeEditor('/proje/a.ts');
    setActiveEditor(fake.editor);
    const list = commands();

    for (const id of ['go.to.symbol', 'go.to.line', 'go.to.definition', 'go.to.references']) {
      const command = list.find((entry) => entry.id === id);
      expect(command?.run()).toEqual({ ok: true });
    }
    expect(fake.focuses()).toBe(4);
    expect(fake.triggers).toEqual([
      'editor.action.quickOutline',
      'editor.action.gotoLine',
      'editor.action.revealDefinition',
      'editor.action.referenceSearch',
    ]);
  });

  it('go.to.file açık dosyaları komut paletine yükler', () => {
    tabsModel.open({
      path: '/proje/b.ts',
      name: 'b.ts',
      content: 'let x = 1;',
      language: 'typescript',
    });
    openFilesModel.set([{ path: '/proje/b.ts', name: 'b.ts' }]);
    const list = commands();

    const goFile = list.find((entry) => entry.id === 'go.to.file');
    expect(goFile?.run()).toEqual({ ok: true });
    const state = paletteModel.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      commandId: 'file.open',
      category: 'file',
      filePath: '/proje/b.ts',
    });
    expect(focusManager.get()).toBe('palette');
  });

  it('go.to.definition editor yokken hata döner', () => {
    const list = commands();
    const command = list.find((entry) => entry.id === 'go.to.definition');
    expect(command?.run()).toEqual({ ok: false, error: 'Düzenleyici etkin değil' });
  });
});