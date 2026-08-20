import type { ModelId, ModelInfo } from './types';

export const MODEL_LIST: readonly ModelInfo[] = [
  {
    id: 'Qwen/Qwen2.5-0.5B-Instruct',
    name: 'Qwen2.5 0.5B',
    sizeMb: 490,
    quantized: 'q4',
  },
  {
    id: 'Qwen/Qwen2.5-1.5B-Instruct',
    name: 'Qwen2.5 1.5B',
    sizeMb: 1160,
    quantized: 'q4',
  },
];

export const DEFAULT_MODEL: ModelId = MODEL_LIST[0]?.id ?? 'Qwen/Qwen2.5-0.5B-Instruct';

export function modelName(modelId: ModelId | null): string {
  const model = MODEL_LIST.find((entry) => entry.id === modelId);
  return model?.name ?? '—';
}