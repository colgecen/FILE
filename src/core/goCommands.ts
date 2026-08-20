import { getActiveEditor } from '../editor/activeEditor';
import { gotoPosition } from './bookmarkNav';
import { cursorModel } from './cursor';
import { focusManager } from './focus';
import { navStackModel } from './navStack';
import { openFilesModel } from './openFiles';
import { paletteModel } from './palette';
import type { CommandDef } from './types';

type EditorLike = {
  getModel: () => { uri: { path: string } } | null;
  getPosition: () => { lineNumber: number; column: number } | null;
  trigger: (source: string, action: string, payload: unknown) => void;
  focus: () => void;
};

function snapshotPosition(): { path: string; line: number; column: number } | null {
  const editor = getActiveEditor();
  if (editor === null) return null;
  const model = editor.getModel();
  const position = editor.getPosition();
  if (model === null || position === null) return null;
  return { path: model.uri.path, line: position.lineNumber, column: position.column };
}

function runEditorAction(editor: EditorLike, action: string): void {
  editor.focus();
  editor.trigger('keyboard', action, null);
}

function withSnapshot(action: (editor: EditorLike) => void): { ok: boolean; error?: string } {
  const editor = getActiveEditor();
  if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
  const before = snapshotPosition();
  if (before !== null) {
    navStackModel.recordBack(before);
    cursorModel.update(before.path, before.line, before.column);
  }
  action(editor as EditorLike);
  return { ok: true };
}

export function registerGoCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'go.to.file',
    category: 'go',
    title: 'Dosyaya Git',
    run: () => {
      paletteModel.showFiles(openFilesModel.list());
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'go.to.symbol',
    category: 'go',
    title: 'Sembole Git',
    run: () =>
      withSnapshot((editor) => runEditorAction(editor, 'editor.action.quickOutline')),
  });

  register({
    id: 'go.to.line',
    category: 'go',
    title: 'Satıra Git',
    run: () => withSnapshot((editor) => runEditorAction(editor, 'editor.action.gotoLine')),
  });

  register({
    id: 'go.to.definition',
    category: 'go',
    title: 'Tanıma Git',
    run: () =>
      withSnapshot((editor) => runEditorAction(editor, 'editor.action.revealDefinition')),
  });

  register({
    id: 'go.to.references',
    category: 'go',
    title: 'Referanslar',
    run: () =>
      withSnapshot((editor) => runEditorAction(editor, 'editor.action.referenceSearch')),
  });

  register({
    id: 'go.back',
    category: 'go',
    title: 'Geri',
    run: () => {
      const target = navStackModel.stepBack();
      if (target === null) return { ok: false, error: 'Geri gidilecek konum yok' };
      return gotoPosition(target) ? { ok: true } : { ok: false, error: 'Dosya açık değil' };
    },
  });

  register({
    id: 'go.forward',
    category: 'go',
    title: 'İleri',
    run: () => {
      const target = navStackModel.stepForward();
      if (target === null) return { ok: false, error: 'İleri gidilecek konum yok' };
      return gotoPosition(target) ? { ok: true } : { ok: false, error: 'Dosya açık değil' };
    },
  });
}