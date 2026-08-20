import { afterEach, describe, expect, it } from 'vitest';
import { setActiveEditor } from './activeEditor';
import { registerEditCommands, runEditorAction } from './editorCommands';
import type { monaco } from './monacoSetup';

function fakeEditor(): {
  editor: monaco.editor.IStandaloneCodeEditor;
  triggers: Array<{ source: string; action: string; payload: unknown }>;
  focuses: () => number;
} {
  const triggers: Array<{ source: string; action: string; payload: unknown }> = [];
  let focusCount = 0;
  const editor = {
    focus: () => {
      focusCount += 1;
    },
    trigger: (source: string, action: string, payload: unknown) => {
      triggers.push({ source, action, payload });
    },
  } as unknown as monaco.editor.IStandaloneCodeEditor;
  return { editor, triggers, focuses: () => focusCount };
}

describe('editorCommands', () => {
  afterEach(() => {
    setActiveEditor(null);
  });

  it('etkin düzenleyiciye karşılık gelen monaco eylemini tetikler', () => {
    const fake = fakeEditor();
    setActiveEditor(fake.editor);

    runEditorAction('edit.undo');
    runEditorAction('edit.redo');
    runEditorAction('edit.cut');
    runEditorAction('edit.copy');
    runEditorAction('edit.paste');
    runEditorAction('edit.comment.toggle');
    runEditorAction('edit.comment.toggle.block');

    expect(fake.focuses()).toBe(7);
    expect(fake.triggers).toEqual([
      { source: 'keyboard', action: 'undo', payload: null },
      { source: 'keyboard', action: 'redo', payload: null },
      { source: 'keyboard', action: 'editor.action.clipboardCutAction', payload: null },
      { source: 'keyboard', action: 'editor.action.clipboardCopyAction', payload: null },
      { source: 'keyboard', action: 'editor.action.clipboardPasteAction', payload: null },
      { source: 'keyboard', action: 'editor.action.commentLine', payload: null },
      { source: 'keyboard', action: 'editor.action.blockComment', payload: null },
    ]);
  });

  it('etkin düzenleyici yokken hata döner', () => {
    expect(runEditorAction('edit.undo')).toEqual({ ok: false, error: 'Düzenleyici etkin değil' });
  });

  it('kayıt sırasında yedi düzenleme komutu tanımlar', () => {
    const ids: string[] = [];
    registerEditCommands((command) => ids.push(command.id));
    expect(ids).toEqual([
      'edit.undo',
      'edit.redo',
      'edit.cut',
      'edit.copy',
      'edit.paste',
      'edit.comment.toggle',
      'edit.comment.toggle.block',
    ]);
  });
});