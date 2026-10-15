import { DEFAULT_MODEL, MODEL_LIST } from './models';
import type { ModelId } from './types';
import type { ModelRef, ProviderId } from './providers';

const STORAGE_KEY = 'editor.activeModel';
const ACTIVE_REF_KEY = 'ai.activeRef';

export type ActiveRef = {
  readonly id: string;
  readonly provider: ProviderId;
};

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

const KNOWN_PROVIDERS: readonly ProviderId[] = [
  'builtin',
  'openai',
  'deepseek',
  'groq',
  'openrouter',
  'ollama',
  'lmstudio',
  'llamacpp',
  'custom',
];

function isProviderId(value: string): value is ProviderId {
  return (KNOWN_PROVIDERS as readonly string[]).includes(value);
}

export function loadActiveRef(): ActiveRef {
  try {
    const raw = localStorage.getItem(ACTIVE_REF_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as { id?: unknown; provider?: unknown };
      if (
        typeof parsed.id === 'string' &&
        parsed.id.length > 0 &&
        typeof parsed.provider === 'string' &&
        isProviderId(parsed.provider)
      ) {
        return { id: parsed.id, provider: parsed.provider };
      }
    }
    // Eski anahtardan taşı: yerleşik model seçiliyse koru.
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy !== null && isModelId(legacy)) {
      return { id: legacy, provider: 'builtin' };
    }
  } catch {
    // erişim yoksa varsayılan
  }
  return { id: DEFAULT_MODEL, provider: 'builtin' };
}

export function saveActiveRef(ref: ActiveRef): void {
  try {
    localStorage.setItem(ACTIVE_REF_KEY, JSON.stringify(ref));
  } catch {
    // depolama engelliyse sessiz geç
  }
}

export function refFromModel(model: ModelRef): ActiveRef {
  return { id: model.id, provider: model.provider };
}