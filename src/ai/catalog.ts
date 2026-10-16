import { useEffect, useState } from 'react';
import type { Api } from '../../electron/shared/api-types';
import { MODEL_LIST } from './models';
import { loadCustomUrl } from './endpoints';
import { scanCloudModels } from './cloudScan';
import { scanLocalModels } from './localScan';
import type { ModelRef } from './providers';

function builtins(): ModelRef[] {
  return MODEL_LIST.map((model) => ({
    id: model.id,
    name: model.name,
    provider: 'builtin' as const,
    source: 'builtin' as const,
  }));
}

export type CatalogSnapshot = {
  readonly entries: readonly ModelRef[];
  readonly updatedAt: number;
};

const sameRef = (a: ModelRef, b: ModelRef): boolean =>
  a.provider === b.provider && a.id === b.id;

export class ModelCatalog {
  private entries: ModelRef[] = builtins();
  private updatedAt = 0;
  private readonly listeners = new Set<() => void>();

  all(): readonly ModelRef[] {
    return this.entries;
  }

  getSnapshot(): CatalogSnapshot {
    return { entries: this.entries, updatedAt: this.updatedAt };
  }

  find(provider: ModelRef['provider'], id: string): ModelRef | undefined {
    return this.entries.find((entry) => entry.provider === provider && entry.id === id);
  }

  findById(id: string): ModelRef | undefined {
    return this.entries.find((entry) => entry.id === id);
  }

  /** Taramayla gelenleri yerleştirir; yerleşikler her zaman korunur, tekrar eklenmez. */
  setScanned(models: readonly ModelRef[]): void {
    const merged = [...builtins()];
    for (const model of models) {
      if (!merged.some((entry) => sameRef(entry, model))) {
        merged.push(model);
      }
    }
    this.entries = merged;
    this.updatedAt = Date.now();
    this.emit();
  }

  reset(): void {
    this.entries = builtins();
    this.updatedAt = 0;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const modelCatalog = new ModelCatalog();

export function useModelCatalog(): CatalogSnapshot {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot>(() => modelCatalog.getSnapshot());
  useEffect(() => modelCatalog.subscribe(() => setSnapshot(modelCatalog.getSnapshot())), []);
  return snapshot;
}

type RefreshApi = Pick<
  Api,
  'aiPing' | 'aiModels' | 'aiLocalModels' | 'aiOpencodeModels' | 'aiOllamaTags' | 'aiKeyHas' | 'aiEnvScan'
>;

let refreshing = false;

/** Yerel + bulut taramasını birleştirip kataloğa yazar. */
export async function refreshCatalog(api: RefreshApi): Promise<{ local: number; cloud: number }> {
  if (refreshing) return { local: 0, cloud: 0 };
  refreshing = true;
  try {
    const [local, cloud] = await Promise.all([
      scanLocalModels(api),
      scanCloudModels(api, loadCustomUrl()),
    ]);
    modelCatalog.setScanned([...local.models, ...cloud.models]);
    return { local: local.models.length, cloud: cloud.models.length };
  } finally {
    refreshing = false;
  }
}
