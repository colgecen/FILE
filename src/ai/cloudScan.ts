import type { AiEnvEntry, AiModelsResult, Api } from '../../electron/shared/api-types';
import { PROVIDERS, type ModelRef, type ProviderId } from './providers';
import { safeCall } from './localScan';

type CloudApi = Pick<Api, 'aiModels' | 'aiKeyHas' | 'aiEnvScan' | 'aiOpencodeModels'>;

export type CloudProbe = {
  readonly provider: ProviderId;
  readonly ok: boolean;
  readonly models: readonly ModelRef[];
  readonly error?: string;
};

export async function scanCloudModels(
  api: CloudApi,
  customUrl: string | null,
): Promise<{ probed: readonly CloudProbe[]; models: readonly ModelRef[] }> {
  const targets = PROVIDERS.filter(
    (provider) =>
      provider.source === 'cloud' &&
      (provider.id !== 'custom' || (customUrl !== null && customUrl.length > 0)),
  );
  const env: readonly AiEnvEntry[] = await safeCall(
    () =>
      api.aiEnvScan(targets.map((target) => ({ provider: target.id, envVar: target.keyEnv }))),
    [],
  );
  const probed: CloudProbe[] = [];
  for (const target of targets) {
    const baseUrl = target.id === 'custom' && customUrl !== null ? customUrl : target.defaultBaseUrl;
    if (target.id === 'opencode') {
      // OpenCode Zen'in uzak /models ucu yok; liste yalnızca yerel opencode
      // CLI'sinden (auth-farkında) okunur — anahtar gerekmez. Yerel katalog
      // yedeği bilinçli olarak kullanılmaz: oradaki eski listeler onlarca
      // kullanılamaz model gösteriyordu.
      const fallbackError = 'opencode CLI bulunamadı';
      const missing: AiModelsResult = { ok: false, models: [], error: fallbackError };
      const cli = await safeCall(() => api.aiOpencodeModels(), missing);
      if (cli.ok && cli.models.length > 0) {
        probed.push({
          provider: target.id,
          ok: true,
          models: cli.models.map((id) => ({
            id,
            name: id,
            provider: target.id,
            source: 'cloud' as const,
          })),
        });
      } else {
        const detail = cli.error;
        probed.push({
          provider: target.id,
          ok: false,
          models: [],
          error:
            detail !== undefined && detail.length > 0 && detail !== 'API yok'
              ? detail
              : fallbackError,
        });
      }
      continue;
    }
    const keyed = await safeCall(() => api.aiKeyHas(target.id), { present: false });
    const envPresent = env.find((entry) => entry.provider === target.id)?.present ?? false;
    if (!keyed.present && !envPresent) {
      probed.push({ provider: target.id, ok: false, models: [], error: 'Anahtar yok' });
      continue;
    }
    const listed = await safeCall(
      () => api.aiModels({ baseUrl, provider: target.id, keyEnv: target.keyEnv, apiKey: null }),
      { ok: false, models: [], error: 'API yok' } satisfies AiModelsResult,
    );
    if (!listed.ok) {
      probed.push({ provider: target.id, ok: false, models: [], error: listed.error ?? 'Liste okunamadı' });
      continue;
    }
    probed.push({
      provider: target.id,
      ok: true,
      models: listed.models.map((id) => ({
        id,
        name: id,
        provider: target.id,
        source: 'cloud' as const,
      })),
    });
  }
  return { probed, models: probed.flatMap((probe) => probe.models) };
}
