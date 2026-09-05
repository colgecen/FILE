import { getActiveEditor } from '../editor/activeEditor';
import { clipboardHistory } from './clipboardHistory';
import { focusManager } from './focus';
import { paletteModel } from './palette';
import type { CommandDef } from './types';

export function registerClipboardCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'edit.paste.history',
    category: 'edit',
    title: 'Yapıştırma Geçmişi',
    run: () => {
      const entries = clipboardHistory.list();
      if (entries.length === 0) return { ok: false, error: 'Yapıştırma geçmişi boş' };
      paletteModel.showClipboardHistory(
        entries.map((entry, index) => ({
          commandId: `edit.paste.history.item.${index}`,
          title: entry.text.slice(0, 80),
          category: 'edit',
          clipboard: entry,
        })),
      );
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'edit.paste.history.open',
    category: 'edit',
    title: 'Geçmişi Göster',
    run: () => {
      const entries = clipboardHistory.list();
      if (entries.length === 0) return { ok: false, error: 'Yapıştırma geçmişi boş' };
      paletteModel.showClipboardHistory(
        entries.map((entry, index) => ({
          commandId: `edit.paste.history.item.${index}`,
          title: entry.text.slice(0, 80),
          category: 'edit',
          clipboard: entry,
        })),
      );
      focusManager.set('palette');
      return { ok: true };
    },
  });

  for (let index = 0; index < 20; index += 1) {
    const i = index;
    register({
      id: `edit.paste.history.item.${i}`,
      category: 'edit',
      title: `Geçmiş ${i + 1}`,
      run: () => {
        const entry = clipboardHistory.list()[i];
        if (!entry) return { ok: false, error: 'Geçmiş öğesi yok' };
        const editor = getActiveEditor();
        if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
        const selection = editor.getSelection();
        if (selection !== null) {
          editor.executeEdits('paste-history', [
            { range: selection, text: entry.text, forceMoveMarkers: true },
          ]);
        }
        focusManager.set('editor');
        editor.focus();
        return { ok: true };
      },
    });
  }

  // capture copy/cut into history via polling clipboard when command runs
  register({
    id: 'edit.undo.tree',
    category: 'edit',
    title: 'Geri Alma Ağacı',
    run: () => ({ ok: true }),
  });
}
