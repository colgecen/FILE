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
    runEditorAction('edit.find');
    runEditorAction('edit.replace');
    runEditorAction('selection.select.all');
    runEditorAction('selection.expand');
    runEditorAction('selection.shrink');
    runEditorAction('cursor.up');
    runEditorAction('cursor.down');
    runEditorAction('cursor.all');
    runEditorAction('selection.column');
    runEditorAction('selection.rectangular');

    expect(fake.focuses()).toBe(17);
    expect(fake.triggers).toEqual([
      { source: 'keyboard', action: 'undo', payload: null },
      { source: 'keyboard', action: 'redo', payload: null },
      { source: 'keyboard', action: 'editor.action.clipboardCutAction', payload: null },
      { source: 'keyboard', action: 'editor.action.clipboardCopyAction', payload: null },
      { source: 'keyboard', action: 'editor.action.clipboardPasteAction', payload: null },
      { source: 'keyboard', action: 'editor.action.commentLine', payload: null },
      { source: 'keyboard', action: 'editor.action.blockComment', payload: null },
      { source: 'keyboard', action: 'actions.find', payload: null },
      { source: 'keyboard', action: 'editor.action.startFindReplaceAction', payload: null },
      { source: 'keyboard', action: 'editor.action.selectAll', payload: null },
      { source: 'keyboard', action: 'editor.action.smartSelect.expand', payload: null },
      { source: 'keyboard', action: 'editor.action.smartSelect.shrink', payload: null },
      { source: 'keyboard', action: 'editor.action.insertCursorAbove', payload: null },
      { source: 'keyboard', action: 'editor.action.insertCursorBelow', payload: null },
      { source: 'keyboard', action: 'editor.action.selectAllMatches', payload: null },
      { source: 'keyboard', action: 'editor.action.toggleColumnSelection', payload: null },
      { source: 'keyboard', action: 'editor.action.toggleColumnSelection', payload: null },
    ]);
  });

  it('regexp değiştirme önce değiştirme yüzeyini açar sonra regexp seçeneğini etkinleştirir', () => {
    const fake = fakeEditor();
    setActiveEditor(fake.editor);

    runEditorAction('edit.replace.regexp');

    expect(fake.focuses()).toBe(1);
    expect(fake.triggers).toEqual([
      { source: 'keyboard', action: 'editor.action.startFindReplaceAction', payload: null },
      { source: 'keyboard', action: 'toggleFindRegex', payload: null },
    ]);
  });

  it('etkin düzenleyici yokken hata döner', () => {
    expect(runEditorAction('edit.undo')).toEqual({ ok: false, error: 'Düzenleyici etkin değil' });
  });

  it('kayıt sırasında on altı düzenleme/yer imi komutu tanımlar', () => {
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
      'edit.find',
      'edit.replace',
      'edit.replace.regexp',
      'selection.select.all',
      'selection.expand',
      'selection.shrink',
      'cursor.up',
      'cursor.down',
      'cursor.all',
      'selection.column',
      'selection.rectangular',
      'bookmark.toggle',
      'bookmark.jump',
      'bookmark.list',
    ]);
  });

  it('yalnız yer imi komutlarını yer tutucu olarak tanımlar', () => {
    const placeholders: Array<{ id: string; category: string; placeholder: boolean | undefined }> = [];
    registerEditCommands((command) => {
      if (command.placeholder === true) {
        placeholders.push({
          id: command.id,
          category: command.category,
          placeholder: command.placeholder,
        });
      }
    });
    expect(placeholders).toEqual([
      { id: 'bookmark.toggle', category: 'go', placeholder: true },
      { id: 'bookmark.jump', category: 'go', placeholder: true },
      { id: 'bookmark.list', category: 'go', placeholder: true },
    ]);
  });
});