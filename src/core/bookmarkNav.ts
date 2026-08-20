import { getActiveEditor } from '../editor/activeEditor';
import type { Bookmark } from './bookmarks';

export function gotoBookmark(target: Bookmark): boolean {
  const editor = getActiveEditor();
  if (editor === null) return false;
  const model = editor.getModel();
  if (model === null || model.uri.path !== target.path) return false;
  const position = { lineNumber: target.line, column: target.column };
  editor.setPosition(position);
  editor.revealPosition(position);
  editor.focus();
  return true;
}