import { getActiveEditor } from '../editor/activeEditor';
import { focusManager } from './focus';
import { historyModel, type HistoryEntry, timestampLabel } from './history';
import { paletteModel } from './palette';
import type { CommandDef } from './types';

export function restoreHistory(entry: HistoryEntry): boolean {
  const editor = getActiveEditor();
  if (editor === null) return false;
  const model = editor.getModel();
  if (model === null || model.uri.path !== entry.path) return false;
  model.setValue(entry.content);
  return true;
}

export function registerHistoryCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'edit.undo.tree.view',
    category: 'edit',
    title: 'Ağacı Görüntüle',
    run: () => {
      const editor = getActiveEditor();
      if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
      const model = editor.getModel();
      if (model === null) return { ok: false, error: 'Model yok' };
      const entries = historyModel.list(model.uri.path);
      if (entries.length === 0) return { ok: false, error: 'Geçmiş yok' };
      paletteModel.showHistory(
        entries.map((entry) => ({
          commandId: 'edit.undo.tree.restore',
          title: `${timestampLabel(entry.at)} · ${entry.content.length} karakter`,
          category: 'edit',
          history: entry,
        })),
      );
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'edit.undo.tree.clean',
    category: 'edit',
    title: 'Dalları Temizle',
    run: () => {
      const editor = getActiveEditor();
      if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
      const model = editor.getModel();
      if (model === null) return { ok: false, error: 'Model yok' };
      historyModel.clear(model.uri.path);
      return { ok: true };
    },
  });
}