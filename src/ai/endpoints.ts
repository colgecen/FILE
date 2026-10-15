import { getProvider, providerNeedsKey, type ProviderId } from './providers';

const CUSTOM_URL_KEY = 'ai.customUrl';

export type Endpoint = {
  readonly baseUrl: string;
  readonly keyEnv: string | null;
  readonly keyRequired: boolean;
};

export function loadCustomUrl(): string | null {
  try {
    const raw = localStorage.getItem(CUSTOM_URL_KEY);
    return raw !== null && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function saveCustomUrl(url: string): void {
  try {
    localStorage.setItem(CUSTOM_URL_KEY, url);
  } catch {
    // depolama engelliyse sessiz geç
  }
}

export function resolveEndpoint(
  provider: ProviderId,
  customUrl: string | null = loadCustomUrl(),
): Endpoint | { error: string } {
  const def = getProvider(provider);
  if (def === undefined) return { error: 'Bilinmeyen sağlayıcı' };
  if (provider === 'builtin') return { error: 'Yerleşik model uzak endpoint kullanmaz' };
  if (provider === 'custom') {
    if (customUrl === null || customUrl.trim().length === 0) {
      return { error: 'Özel endpoint girilmedi' };
    }
    return { baseUrl: customUrl.trim(), keyEnv: null, keyRequired: false };
  }
  return { baseUrl: def.defaultBaseUrl, keyEnv: def.keyEnv, keyRequired: providerNeedsKey(provider) };
}
