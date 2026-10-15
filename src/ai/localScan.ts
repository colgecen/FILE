import type { AiModelsResult, AiOllamaTagsResult, AiPingResult, Api } from '../../electron/shared/api-types';
import { getProvider, type ModelRef, type ProviderId } from './providers';

type ScanApi = Pick<Api, 'aiPing' | 'aiModels' | 'aiOllamaTags'>;

export type LocalProviderId = 'ollama' | 'lmstudio' | 'llamacpp';

export type ProbeReport = {
  readonly provider: LocalProviderId;
  readonly ok: boolean;
  readonly models: readonly ModelRef[];
  readonly error?: string;
};

export type ScanResult = {
  readonly probed: readonly ProbeReport[];
  readonly models: readonly ModelRef[];
};

export type LocalBases = {
  readonly ollama?: string;
  readonly lmstudio?: string;
  readonly llamacpp?: string;
};

const DEFAULT_BASES: Record<LocalProviderId, string> = {
  ollama: 'http://localhost:11434',
  lmstudio: 'http://localhost:1234/v1',
  llamacpp: 'http://localhost:8080/v1',
};

function baseOf(provider: LocalProviderId, bases: LocalBases | undefined): string {
  const override = bases?.[provider];
  if (override !== undefined && override.length > 0) return override;
  const def = getProvider(provider)?.defaultBaseUrl ?? '';
  return def.length > 0 ? def : DEFAULT_BASES[provider];
}

/** IPC mock'u eksik ya da çökmüşse tarama ölmesin, prob başarısız saysın. */
async function safeCall<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await call();
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

async function probeOllama(api: ScanApi, origin: string): Promise<ProbeReport> {
  const ping = await safeCall(
    () => api.aiPing(origin),
    { ok: false, error: 'API yok' } satisfies AiPingResult,
  );
  if (!ping.ok) {
    return { provider: 'ollama', ok: false, models: [], error: 'Ollama yanıt vermiyor' };
  }
  const tags = await safeCall(
    () => api.aiOllamaTags(origin),
    { ok: false, models: [], error: 'API yok' } satisfies AiOllamaTagsResult,
  );
  if (!tags.ok) {
    return { provider: 'ollama', ok: false, models: [], error: tags.error ?? 'Liste okunamadı' };
  }
  return {
    provider: 'ollama',
    ok: true,
    models: tags.models.map((name) => ({
      id: name,
      name,
      provider: 'ollama' as ProviderId,
      source: 'ollama' as const,
    })),
  };
}

async function probeOpenAICompat(
  api: ScanApi,
  provider: LocalProviderId,
  baseUrl: string,
  label: string,
): Promise<ProbeReport> {
  const ping = await safeCall(
    () => api.aiPing(baseUrl),
    { ok: false, error: 'API yok' } satisfies AiPingResult,
  );
  if (!ping.ok) {
    return { provider, ok: false, models: [], error: `${label} yanıt vermiyor` };
  }
  const listed = await safeCall(
    () => api.aiModels(baseUrl, null),
    { ok: false, models: [], error: 'API yok' } satisfies AiModelsResult,
  );
  if (!listed.ok) {
    return { provider, ok: false, models: [], error: listed.error ?? 'Liste okunamadı' };
  }
  return {
    provider,
    ok: true,
    models: listed.models.map((id) => ({
      id,
      name: id,
      provider,
      source: 'local-openai' as const,
    })),
  };
}

/** Yerel sunucuları tara; biri çökse diğerleri yine döner. */
export async function scanLocalModels(api: ScanApi, bases?: LocalBases): Promise<ScanResult> {
  const probed = await Promise.all([
    probeOllama(api, baseOf('ollama', bases)),
    probeOpenAICompat(api, 'lmstudio', baseOf('lmstudio', bases), 'LM Studio'),
    probeOpenAICompat(api, 'llamacpp', baseOf('llamacpp', bases), 'llama.cpp'),
  ]);
  return { probed, models: probed.flatMap((probe) => probe.models) };
}
