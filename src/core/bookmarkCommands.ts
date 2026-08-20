import { getActiveEditor } from '../editor/activeEditor';
import { bookmarkModel } from './bookmarks';
import { gotoBookmark } from './bookmarkNav';
import { focusManager } from './focus';
import { paletteModel } from './palette';
import type { CommandDef } from './types';

export function registerBookmarkCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'bookmark.toggle',
    category: 'go',
    title: 'Yer İmi Aç/Kapat',
    run: () => {
      const editor = getActiveEditor();
      if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
      const position = editor.getPosition();
      if (position === null) return { ok: false, error: 'İmleç konumu alınamadı' };
      const model = editor.getModel();
      if (model === null) return { ok: false, error: 'Model yok' };
      bookmarkModel.toggle(model.uri.path, position.lineNumber, position.column);
      return { ok: true };
    },
  });

  register({
    id: 'bookmark.jump',
    category: 'go',
    title: 'Yer İmine Atla',
    run: () => {
      const editor = getActiveEditor();
      if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
      const position = editor.getPosition();
      if (position === null) return { ok: false, error: 'İmleç konumu alınamadı' };
      const model = editor.getModel();
      if (model === null) return { ok: false, error: 'Model yok' };
      const next = bookmarkModel.nextFrom(model.uri.path, position.lineNumber);
      if (next === null) return { ok: false, error: 'Yer imi yok' };
      gotoBookmark(next);
      return { ok: true };
    },
  });

  register({
    id: 'bookmark.list',
    category: 'go',
    title: 'Yer İmi Listesi',
    run: () => {
      paletteModel.showBookmarks(
        bookmarkModel.list().map((bookmark) => ({
          commandId: 'bookmark.goto',
          title: `${bookmark.path.split('/').pop() ?? 'dosya'}:${bookmark.line}`,
          category: 'go',
          filePath: bookmark.path,
          bookmark,
        })),
      );
      focusManager.set('palette');
      return { ok: true };
    },
  });
}