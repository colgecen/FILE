import type { OpenFile } from '../core/types';
import { tabsModel } from '../core/tabs';
import { monaco } from './monacoSetup';

export const MAX_MODELS = 10;

const touchOrder = new Map<string, number>();
let clock = 0;

export function resetModelCache(): void {
  touchOrder.clear();
  clock = 0;
}

export function touchModel(path: string): void {
  clock += 1;
  touchOrder.set(path, clock);
}

function modelUri(path: string): monaco.Uri {
  return monaco.Uri.from({ scheme: 'file', path });
}

export function pruneModels(): void {
  if (touchOrder.size <= MAX_MODELS) return;
  const openPaths = new Set(tabsModel.getState().tabs.map((tab) => tab.file.path));
  const candidates = [...touchOrder.entries()]
    .filter(([path]) => !openPaths.has(path))
    .sort((a, b) => a[1] - b[1]);
  let excess = touchOrder.size - MAX_MODELS;
  for (const [path] of candidates) {
    if (excess <= 0) break;
    const model = monaco.editor.getModel(modelUri(path));
    if (model !== null) {
      model.dispose();
    }
    touchOrder.delete(path);
    excess -= 1;
  }
}

export function resolveModel(file: OpenFile): monaco.editor.ITextModel {
  touchModel(file.path);
  const existing = monaco.editor.getModel(modelUri(file.path));
  if (existing !== null) {
    return existing;
  }
  const model = monaco.editor.createModel(
    file.content,
    file.language === '' ? 'plaintext' : file.language,
    modelUri(file.path),
  );
  pruneModels();
  return model;
}