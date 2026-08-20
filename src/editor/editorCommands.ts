import type { CommandDef, CommandResult } from '../core/types';
import { getActiveEditor } from './activeEditor';

const EDITOR_ACTIONS = {
  'edit.undo': 'undo',
  'edit.redo': 'redo',
  'edit.cut': 'editor.action.clipboardCutAction',
  'edit.copy': 'editor.action.clipboardCopyAction',
  'edit.paste': 'editor.action.clipboardPasteAction',
  'edit.comment.toggle': 'editor.action.commentLine',
  'edit.comment.toggle.block': 'editor.action.blockComment',
} as const;

export type EditActionId = keyof typeof EDITOR_ACTIONS;

const COMMAND_TITLES: Record<EditActionId, string> = {
  'edit.undo': 'Geri Al',
  'edit.redo': 'Yinele',
  'edit.cut': 'Kes',
  'edit.copy': 'Kopyala',
  'edit.paste': 'Yapıştır',
  'edit.comment.toggle': 'Satır Yorumunu Aç/Kapat',
  'edit.comment.toggle.block': 'Blok Yorumunu Aç/Kapat',
};

export function runEditorAction(actionId: EditActionId): CommandResult {
  const editor = getActiveEditor();
  if (editor === null) {
    return { ok: false, error: 'Düzenleyici etkin değil' };
  }
  editor.focus();
  editor.trigger('keyboard', EDITOR_ACTIONS[actionId], null);
  return { ok: true };
}

export function registerEditCommands(register: (command: CommandDef) => void): void {
  (Object.keys(EDITOR_ACTIONS) as EditActionId[]).forEach((id) => {
    register({
      id,
      category: 'edit',
      title: COMMAND_TITLES[id],
      run: () => runEditorAction(id),
    });
  });
}