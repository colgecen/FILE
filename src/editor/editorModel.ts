import type { OpenFile } from '../core/types';
import { monaco } from './monacoSetup';

export function resolveModel(file: OpenFile): monaco.editor.ITextModel {
  const uri = monaco.Uri.from({ scheme: 'file', path: file.path });
  const existing = monaco.editor.getModel(uri);
  if (existing !== null) {
    return existing;
  }
  return monaco.editor.createModel(
    file.content,
    file.language === '' ? 'plaintext' : file.language,
    uri,
  );
}