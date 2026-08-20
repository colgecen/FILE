import { DEFAULT_MODEL, MODEL_LIST } from './models';
import type { ModelId } from './types';

const STORAGE_KEY = 'editor.activeModel';

export function isModelId(value: string): value is ModelId {
  return MODEL_LIST.some((model) => model.id === value);
}

export function loadActiveModel(): ModelId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && isModelId(stored)) return stored;
  } catch {
    // erişim yoksa varsayılan
  }
  return DEFAULT_MODEL;
}

export function saveActiveModel(modelId: ModelId): void {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch {
    // depolama engelliyse sessiz geç
  }
}