import type { CommandDef, CommandResult } from '../core/types';
import { getActiveEditor } from './activeEditor';
import type { monaco } from './monacoSetup';

const EDITOR_ACTIONS = {
  'edit.undo': 'undo',
  'edit.redo': 'redo',
  'edit.cut': 'editor.action.clipboardCutAction',
  'edit.copy': 'editor.action.clipboardCopyAction',
  'edit.paste': 'editor.action.clipboardPasteAction',
  'edit.comment.toggle': 'editor.action.commentLine',
  'edit.comment.toggle.block': 'editor.action.blockComment',
  'edit.find': 'actions.find',
  'edit.replace': 'editor.action.startFindReplaceAction',
} as const;

const EDITOR_SEQUENCES: Partial<Record<EditActionId, readonly string[]>> = {
  'edit.replace.regexp': ['editor.action.startFindReplaceAction', 'toggleFindRegex'],
};

export type EditActionId = keyof typeof EDITOR_ACTIONS | 'edit.replace.regexp';

const COMMAND_TITLES: Record<EditActionId, string> = {
  'edit.undo': 'Geri Al',
  'edit.redo': 'Yinele',
  'edit.cut': 'Kes',
  'edit.copy': 'Kopyala',
  'edit.paste': 'Yapıştır',
  'edit.comment.toggle': 'Satır Yorumunu Aç/Kapat',
  'edit.comment.toggle.block': 'Blok Yorumunu Aç/Kapat',
  'edit.find': 'Ara',
  'edit.replace': 'Değiştir',
  'edit.replace.regexp': 'Değiştir (Regexp)',
};

function triggerEditor(editor: monaco.editor.IStandaloneCodeEditor, action: string): void {
  editor.trigger('keyboard', action, null);
}

export function runEditorAction(actionId: EditActionId): CommandResult {
  const editor = getActiveEditor();
  if (editor === null) {
    return { ok: false, error: 'Düzenleyici etkin değil' };
  }
  editor.focus();
  const action = EDITOR_ACTIONS[actionId as keyof typeof EDITOR_ACTIONS];
  if (action !== undefined) {
    triggerEditor(editor, action);
    return { ok: true };
  }
  const sequence = EDITOR_SEQUENCES[actionId];
  if (sequence !== undefined) {
    sequence.forEach((item) => triggerEditor(editor, item));
    return { ok: true };
  }
  return { ok: false, error: `Bilinmeyen düzenleme eylemi: ${actionId}` };
}

export function registerEditCommands(register: (command: CommandDef) => void): void {
  (Object.keys({ ...EDITOR_ACTIONS, ...EDITOR_SEQUENCES }) as EditActionId[]).forEach((id) => {
    register({
      id,
      category: 'edit',
      title: COMMAND_TITLES[id],
      run: () => runEditorAction(id),
    });
  });
}