import type { ChatMessage } from './types';

// OpenAI-uyumlu sağlayıcı kayıtları.
// Davranış Cherry Studio'dan ilhamlıdır; kod bu projeye özel sıfırdan yazıldı.

export type ProviderId =
  | 'builtin'
  | 'openai'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'custom';

export type ProviderSource = 'cloud' | 'local';

export type ProviderDef = {
  readonly id: ProviderId;
  readonly name: string;
  readonly defaultBaseUrl: string;
  /** Ortam değişkeni adı; null = anahtar gerekmez (yerel sunucular). */
  readonly keyEnv: string | null;
  readonly source: ProviderSource;
  readonly defaultModels: readonly string[];
};

export const PROVIDERS: readonly ProviderDef[] = [
  {
    id: 'builtin',
    name: 'Yerleşik (cihaz içi)',
    defaultBaseUrl: '',
    keyEnv: null,
    source: 'local',
    defaultModels: ['Qwen/Qwen2.5-0.5B-Instruct', 'Qwen/Qwen2.5-1.5B-Instruct'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI_API_KEY',
    source: 'cloud',
    defaultModels: ['gpt-4o-mini', 'gpt-4o'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK_API_KEY',
    source: 'cloud',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    source: 'cloud',
    defaultModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    source: 'cloud',
    defaultModels: [],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    keyEnv: null,
    source: 'local',
    defaultModels: [],
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    defaultBaseUrl: 'http://localhost:1234/v1',
    keyEnv: null,
    source: 'local',
    defaultModels: [],
  },
  {
    id: 'llamacpp',
    name: 'llama.cpp',
    defaultBaseUrl: 'http://localhost:8080/v1',
    keyEnv: null,
    source: 'local',
    defaultModels: [],
  },
  {
    id: 'custom',
    name: 'Özel (OpenAI-uyumlu)',
    defaultBaseUrl: '',
    keyEnv: null,
    source: 'cloud',
    defaultModels: [],
  },
];

export function getProvider(id: ProviderId): ProviderDef | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

export function isLocalProvider(id: ProviderId): boolean {
  return getProvider(id)?.source === 'local';
}

export function providerNeedsKey(id: ProviderId): boolean {
  return getProvider(id)?.keyEnv !== null;
}

export type ModelSource = 'builtin' | 'ollama' | 'local-openai' | 'cloud';

export type ModelRef = {
  readonly id: string;
  readonly name: string;
  readonly provider: ProviderId;
  readonly source: ModelSource;
};

export function displayName(ref: ModelRef): string {
  const provider = getProvider(ref.provider);
  return provider === undefined ? ref.name : `${ref.name} · ${provider.name}`;
}

export type EndpointConfig = {
  readonly baseUrl: string;
  readonly apiKey: string | null;
};

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

export function chatCompletionsUrl(baseUrl: string): string {
  return joinUrl(baseUrl, '/chat/completions');
}

export function openAIModelsUrl(baseUrl: string): string {
  return joinUrl(baseUrl, '/models');
}

export type ChatCompletionRequest = {
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stream?: boolean;
};
