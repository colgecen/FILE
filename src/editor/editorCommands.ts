import type { CommandCategory, CommandDef, CommandResult } from '../core/types';
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
  'selection.select.all': 'editor.action.selectAll',
  'selection.expand': 'editor.action.smartSelect.expand',
  'selection.shrink': 'editor.action.smartSelect.shrink',
  'cursor.up': 'editor.action.insertCursorAbove',
  'cursor.down': 'editor.action.insertCursorBelow',
  'cursor.all': 'editor.action.selectAllMatches',
  'selection.column': 'editor.action.toggleColumnSelection',
  'selection.rectangular': 'editor.action.toggleColumnSelection',
} as const;

const EDITOR_SEQUENCES: Partial<Record<EditActionId, readonly string[]>> = {
  'edit.replace.regexp': ['editor.action.startFindReplaceAction', 'toggleFindRegex'],
};

const PLACEHOLDER_COMMANDS: ReadonlyArray<[string, string, CommandCategory]> = [
  ['bookmark.toggle', 'Yer İmi Aç/Kapat', 'go'],
  ['bookmark.jump', 'Yer İmine Atla', 'go'],
  ['bookmark.list', 'Yer İmi Listesi', 'go'],
];

export type EditActionId = keyof typeof EDITOR_ACTIONS | 'edit.replace.regexp';

const REGISTER_ORDER: readonly EditActionId[] = [
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
];

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
  'selection.select.all': 'Tümünü Seç',
  'selection.expand': 'Seçimi Genişlet',
  'selection.shrink': 'Seçimi Daralt',
  'cursor.up': 'İmleç Yukarı',
  'cursor.down': 'İmleç Aşağı',
  'cursor.all': 'Her Yerde İmleç',
  'selection.column': 'Sütun Modu',
  'selection.rectangular': 'Dikdörtgen Seçim',
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
  REGISTER_ORDER.forEach((id) => {
    register({
      id,
      category: 'edit',
      title: COMMAND_TITLES[id],
      run: () => runEditorAction(id),
    });
  });
  PLACEHOLDER_COMMANDS.forEach(([id, title, category]) => {
    register({
      id,
      category,
      title,
      placeholder: true,
      run: () => ({ ok: true }),
    });
  });
}