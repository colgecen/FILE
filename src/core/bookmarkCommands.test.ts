import { afterEach, describe, expect, it } from 'vitest';
import { setActiveEditor } from '../editor/activeEditor';
import type { monaco } from '../editor/monacoSetup';
import { bookmarkModel } from './bookmarks';
import { registerBookmarkCommands } from './bookmarkCommands';
import { paletteModel } from './palette';
import type { CommandDef } from './types';

type FakeEditor = {
  editor: monaco.editor.IStandaloneCodeEditor;
  positions: Array<{ lineNumber: number; column: number }>;
};

function fakeEditor(path: string, line: number): FakeEditor {
  const positions: Array<{ lineNumber: number; column: number }> = [];
  const editor = {
    getPosition: () => ({ lineNumber: line, column: 1 }),
    getModel: () => ({ uri: { path } }),
    setPosition: (position: { lineNumber: number; column: number }) => {
      positions.push(position);
    },
    revealPosition: (position: { lineNumber: number; column: number }) => {
      positions.push(position);
    },
    focus: () => undefined,
  } as unknown as monaco.editor.IStandaloneCodeEditor;
  return { editor, positions };
}

function commands(): CommandDef[] {
  const list: CommandDef[] = [];
  registerBookmarkCommands((command) => list.push(command));
  return list;
}

describe('bookmark komutları', () => {
  afterEach(() => {
    setActiveEditor(null);
    bookmarkModel.reset();
  });

  it('bookmark.toggle imleç satırına yer imi ekler ve kaldırır', () => {
    const fake = fakeEditor('/proje/a.ts', 4);
    setActiveEditor(fake.editor);
    const list = commands();

    const toggle = list.find((command) => command.id === 'bookmark.toggle');
    expect(toggle?.run()).toEqual({ ok: true });
    expect(bookmarkModel.list()).toEqual([{ path: '/proje/a.ts', line: 4, column: 1 }]);

    expect(toggle?.run()).toEqual({ ok: true });
    expect(bookmarkModel.list()).toEqual([]);
  });

  it('bookmark.jump bir sonraki yer imine gider', () => {
    bookmarkModel.toggle('/proje/a.ts', 10, 1);
    bookmarkModel.toggle('/proje/a.ts', 20, 1);
    const fake = fakeEditor('/proje/a.ts', 5);
    setActiveEditor(fake.editor);
    const list = commands();

    const jump = list.find((command) => command.id === 'bookmark.jump');
    expect(jump?.run()).toEqual({ ok: true });
    expect(fake.positions).toEqual([
      { lineNumber: 10, column: 1 },
      { lineNumber: 10, column: 1 },
    ]);
  });

  it('bookmark.jump editor yoksa hata döner', () => {
    const list = commands();
    const jump = list.find((command) => command.id === 'bookmark.jump');
    expect(jump?.run()).toEqual({ ok: false, error: 'Düzenleyici etkin değil' });
  });

  it('bookmark.list yer imlerini komut paletine yükler', () => {
    bookmarkModel.toggle('/proje/a.ts', 3, 1);
    bookmarkModel.toggle('/proje/b.ts', 7, 5);
    const list = commands();

    const listCommand = list.find((command) => command.id === 'bookmark.list');
    expect(listCommand?.run()).toEqual({ ok: true });
    const state = paletteModel.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items[0]).toMatchObject({
      commandId: 'bookmark.goto',
      title: 'a.ts:3',
      category: 'go',
      filePath: '/proje/a.ts',
    });
  });
});