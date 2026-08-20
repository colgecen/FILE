import { getActiveEditor } from '../editor/activeEditor';
import type { Bookmark } from './bookmarks';

export type TargetPosition = {
  readonly path: string;
  readonly line: number;
  readonly column: number;
};

export function gotoPosition(target: TargetPosition): boolean {
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

export function gotoBookmark(target: Bookmark): boolean {
  return gotoPosition(target);
}