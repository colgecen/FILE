import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setActiveEditor } from '../editor/activeEditor';
import type { monaco } from '../editor/monacoSetup';
import { focusManager } from './focus';
import { historyModel } from './history';
import { registerHistoryCommands } from './historyCommands';
import { paletteModel } from './palette';
import type { CommandDef } from './types';

type FakeEditor = {
  editor: monaco.editor.IStandaloneCodeEditor;
  setValues: string[];
};

function fakeEditor(path: string): FakeEditor {
  const setValues: string[] = [];
  const editor = {
    getPosition: () => ({ lineNumber: 1, column: 1 }),
    getModel: () => ({ uri: { path }, setValue: (value: string) => setValues.push(value) }),
  } as unknown as monaco.editor.IStandaloneCodeEditor;
  return { editor, setValues };
}

function commands(): CommandDef[] {
  const list: CommandDef[] = [];
  registerHistoryCommands((command) => list.push(command));
  return list;
}

describe('geri alma ağacı komutları', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    setActiveEditor(null);
    historyModel.reset();
    paletteModel.reset([]);
    vi.useRealTimers();
    while (focusManager.get() !== 'editor') {
      focusManager.returnToPrevious();
    }
  });

  it('edit.undo.tree.view geçmişi komut paletine yükler ve paleti açar', () => {
    const path = '/proje/a.ts';
    historyModel.capture(path, 'eski içerik');
    vi.advanceTimersByTime(700);
    const list = commands();
    setActiveEditor(fakeEditor(path).editor);

    const view = list.find((command) => command.id === 'edit.undo.tree.view');
    expect(view?.run()).toEqual({ ok: true });
    const state = paletteModel.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      commandId: 'edit.undo.tree.restore',
      category: 'edit',
      history: { path, content: 'eski içerik' },
    });
    expect(focusManager.get()).toBe('palette');
  });

  it('edit.undo.tree.view geçmiş yokken hata döner', () => {
    const list = commands();
    setActiveEditor(fakeEditor('/proje/a.ts').editor);
    const view = list.find((command) => command.id === 'edit.undo.tree.view');
    expect(view?.run()).toEqual({ ok: false, error: 'Geçmiş yok' });
  });

  it('edit.undo.tree.clean geçmişi temizler', () => {
    const path = '/proje/a.ts';
    historyModel.capture(path, 'içerik');
    vi.advanceTimersByTime(700);
    const list = commands();
    setActiveEditor(fakeEditor(path).editor);

    const clean = list.find((command) => command.id === 'edit.undo.tree.clean');
    expect(clean?.run()).toEqual({ ok: true });
    expect(historyModel.list(path)).toHaveLength(0);
  });
});