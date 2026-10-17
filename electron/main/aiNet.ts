import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type {
  AiChatAbortArgs,
  AiChatStartArgs,
  AiModelsArgs,
  AiModelsResult,
  AiOllamaTagsResult,
  AiOpencodeChatArgs,
  AiPingResult,
} from '../shared/api-types';
import { findOpencodeBinary, listOpencodeModels, startOpencodeCliChat } from './opencodeCli';

// Renderer'dan gelen AI ağ isteklerinin main-process karşılığı.
// Neden main: Ollama/LM Studio CORS engeline takılmaz, API anahtarı renderer'a inmez.

export type FetchFn = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<Response>;

export type AiChatStreamCallbacks = {
  readonly onToken: (cumulativeText: string) => void;
  readonly onDone: (text: string) => void;
  readonly onError: (message: string) => void;
};

export type AiChatJob = {
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly model: string;
  readonly messages: readonly { readonly role: string; readonly content: string }[];
  readonly temperature?: number;
  readonly maxTokens?: number;
};

const PING_TIMEOUT_MS = 4000;
const LIST_TIMEOUT_MS = 8000;
const CHAT_IDLE_TIMEOUT_MS = 75000;

function withTimeout(signal: AbortSignal | undefined, ms: number): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const cancel = (): void => {
    clearTimeout(timer);
  };
  if (signal !== undefined) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cancel };
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return '';
  }
}

type SSEAccumulator = {
  readonly rest: string;
  readonly done: boolean;
  readonly pieces: readonly string[];
};

/** SSE tamponunu `data:` satırlarına böler; yarım kalan kuyruğu iade eder. */
export function splitSSE(buffer: string): SSEAccumulator {
  const pieces: string[] = [];
  let done = false;
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice('data:'.length).trim();
    if (payload === '[DONE]') {
      done = true;
      continue;
    }
    pieces.push(payload);
  }
  return { rest, done, pieces };
}

type DeltaPiece = {
  readonly content: string;
  readonly reasoning: string;
};

type ContentPart = { readonly type?: string; readonly text?: string };

type DeltaShape = {
  readonly content?: string | readonly ContentPart[];
  readonly reasoning?: string;
  readonly reasoning_content?: string;
  readonly reasoning_details?: readonly { readonly text?: string }[];
};

/** Farklı sağlayıcıların içerik biçimlerini (metin veya parça dizisi) tek metne indirir. */
function textFromContent(content: string | readonly ContentPart[] | undefined): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'object' && part !== null && typeof part.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

/** Düşünce metnini sağlayıcıya göre (reasoning / reasoning_content / reasoning_details) çıkarır. */
function reasoningFromDelta(delta: DeltaShape): string {
  if (typeof delta.reasoning === 'string' && delta.reasoning.length > 0) return delta.reasoning;
  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
    return delta.reasoning_content;
  }
  if (Array.isArray(delta.reasoning_details)) {
    return delta.reasoning_details
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('');
  }
  return '';
}

function deltaPiece(payload: string): DeltaPiece | null {
  try {
    const json = JSON.parse(payload) as { choices?: readonly { delta?: DeltaShape }[] };
    const delta = json.choices?.[0]?.delta;
    if (delta === undefined) return null;
    return { content: textFromContent(delta.content), reasoning: reasoningFromDelta(delta) };
  } catch {
    return null;
  }
}

/** Akış içinde gelen `{"error": ...}` yükünü okunur mesaja çevirir. */
function streamError(payload: string): string | null {
  try {
    const json = JSON.parse(payload) as {
      error?: { message?: string; code?: string | number; type?: string };
    };
    if (json.error === undefined || json.error === null) return null;
    if (typeof json.error.message === 'string' && json.error.message.length > 0) {
      return json.error.message;
    }
    if (typeof json.error.code === 'string' && json.error.code.length > 0) return json.error.code;
    if (typeof json.error.type === 'string' && json.error.type.length > 0) return json.error.type;
    return 'Sağlayıcı akış sırasında hata bildirdi';
  } catch {
    return null;
  }
}

async function readStream(
  response: Response,
  callbacks: AiChatStreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader();
  if (reader === undefined || reader === null) {
    callbacks.onError('Akış gövdesi okunamadı');
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let reasoning = '';
  let shown = '';
  for (;;) {
    if (signal.aborted) {
      await reader.cancel().catch(() => undefined);
      callbacks.onError('İptal edildi');
      return;
    }
    // Model sessiz kalırsa işlem sonsuza kadar beklemesin: hareketsizlik zaman aşımı.
    let idleTimer: NodeJS.Timeout | null = null;
    const idleGuard = new Promise<'idle'>((resolve) => {
      idleTimer = setTimeout(() => resolve('idle'), CHAT_IDLE_TIMEOUT_MS);
    });
    const raced = await Promise.race([reader.read().catch(() => null), idleGuard]);
    if (idleTimer !== null) clearTimeout(idleTimer);
    if (raced === 'idle') {
      await reader.cancel().catch(() => undefined);
      callbacks.onError('Model yanıt vermedi — işlem durduruldu');
      return;
    }
    const chunk = raced as ReadableStreamReadResult<Uint8Array> | null;
    if (chunk === null || chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const split = splitSSE(buffer);
    buffer = split.rest;
    for (const payload of split.pieces) {
      const failure = streamError(payload);
      if (failure !== null) {
        await reader.cancel().catch(() => undefined);
        callbacks.onError(failure.slice(0, 300));
        return;
      }
      const piece = deltaPiece(payload);
      if (piece === null) continue;
      if (piece.content.length > 0) answer += piece.content;
      if (piece.reasoning.length > 0) reasoning += piece.reasoning;
      // Düşünce metni arayüze asla akıtılmaz; yalnız cevap metni gösterilir.
      if (answer.length > 0 && answer !== shown) {
        shown = answer;
        callbacks.onToken(answer);
      }
    }
    if (split.done) break;
  }
  callbacks.onDone(answer.length > 0 ? answer : reasoning);
}

export type AiNet = {
  readonly ping: (baseUrl: string) => Promise<AiPingResult>;
  readonly listOpenAIModels: (baseUrl: string, apiKey: string | null) => Promise<AiModelsResult>;
  readonly listOllamaTags: (origin: string) => Promise<AiOllamaTagsResult>;
  readonly startChat: (job: AiChatJob, callbacks: AiChatStreamCallbacks) => () => void;
};

export function createAiNet(fetchFn: FetchFn = fetch): AiNet {
  const headersFor = (baseUrl: string, apiKey: string | null): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey !== null && apiKey.length > 0) headers['Authorization'] = `Bearer ${apiKey}`;
    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'http://localhost';
      headers['X-Title'] = 'File';
    }
    return headers;
  };

  const ping = async (baseUrl: string): Promise<AiPingResult> => {
    const timeout = withTimeout(undefined, PING_TIMEOUT_MS);
    try {
      const response = await fetchFn(baseUrl, { method: 'GET', signal: timeout.signal });
      return { ok: response.ok, status: response.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message.slice(0, 200) };
    } finally {
      timeout.cancel();
    }
  };

  const listOpenAIModels = async (
    baseUrl: string,
    apiKey: string | null,
  ): Promise<AiModelsResult> => {
    const timeout = withTimeout(undefined, LIST_TIMEOUT_MS);
    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/models`;
      const response = await fetchFn(url, { method: 'GET', headers: headersFor(baseUrl, apiKey), signal: timeout.signal });
      if (!response.ok) {
        const body = await readErrorBody(response);
        return { ok: false, models: [], error: `HTTP ${response.status}${body.length > 0 ? `: ${body}` : ''}` };
      }
      const json = (await response.json()) as { data?: readonly { id?: string }[] };
      const models = (json.data ?? [])
        .map((entry) => entry.id ?? '')
        .filter((id) => id.length > 0);
      return { ok: true, models };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, models: [], error: message.slice(0, 200) };
    } finally {
      timeout.cancel();
    }
  };

  const listOllamaTags = async (origin: string): Promise<AiOllamaTagsResult> => {
    const timeout = withTimeout(undefined, LIST_TIMEOUT_MS);
    try {
      const url = `${origin.replace(/\/+$/, '')}/api/tags`;
      const response = await fetchFn(url, { method: 'GET', signal: timeout.signal });
      if (!response.ok) {
        const body = await readErrorBody(response);
        return { ok: false, models: [], error: `HTTP ${response.status}${body.length > 0 ? `: ${body}` : ''}` };
      }
      const json = (await response.json()) as { models?: readonly { name?: string }[] };
      const models = (json.models ?? [])
        .map((entry) => entry.name ?? '')
        .filter((name) => name.length > 0);
      return { ok: true, models };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, models: [], error: message.slice(0, 200) };
    } finally {
      timeout.cancel();
    }
  };

  const startChat = (job: AiChatJob, callbacks: AiChatStreamCallbacks): (() => void) => {
    const controller = new AbortController();
    const run = async (): Promise<void> => {
      let idleTimer: NodeJS.Timeout | null = null;
      type ChatFetchInit = {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        signal?: AbortSignal;
      };
      const fetchIdle = async (url: string, init: ChatFetchInit): Promise<Response | 'idle'> => {
        const guard = new Promise<'idle'>((resolve) => {
          idleTimer = setTimeout(() => resolve('idle'), CHAT_IDLE_TIMEOUT_MS);
        });
        const result = await Promise.race([
          fetchFn(url, { ...init, signal: controller.signal }),
          guard,
        ]);
        if (idleTimer !== null) clearTimeout(idleTimer);
        return result;
      };
      try {
        const url = `${job.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const headers = headersFor(job.baseUrl, job.apiKey);
        const body: Record<string, unknown> = {
          model: job.model,
          messages: job.messages,
          stream: true,
        };
        if (job.temperature !== undefined) body['temperature'] = job.temperature;
        if (job.maxTokens !== undefined) body['max_tokens'] = job.maxTokens;

        let response = await fetchIdle(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (response === 'idle') {
          controller.abort();
          callbacks.onError('Model yanıt vermedi — işlem durduruldu');
          return;
        }
        if (response.status === 400) {
          // Bazı modeller (ör. reasoning ailesi) belirli parametreleri reddeder.
          // Hata mesajına göre desteklenen biçime uyarla ve tek kez yeniden dene.
          const detail = await readErrorBody(response);
          const lowered = detail.toLowerCase();
          let changed = false;
          if (lowered.includes('temperature') && body['temperature'] !== undefined) {
            delete body['temperature'];
            changed = true;
          }
          if (
            (lowered.includes('max_tokens') || lowered.includes('max_completion_tokens')) &&
            body['max_tokens'] !== undefined
          ) {
            body['max_completion_tokens'] = body['max_tokens'];
            delete body['max_tokens'];
            changed = true;
          }
          if (lowered.includes('stream') && lowered.includes('not support') && body['stream'] === true) {
            body['stream'] = false;
            changed = true;
          }
          if (changed) {
            const retry = await fetchIdle(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
            });
            if (retry === 'idle') {
              controller.abort();
              callbacks.onError('Model yanıt vermedi — işlem durduruldu');
              return;
            }
            response = retry;
          }
        }
        if (!response.ok) {
          const detail = await readErrorBody(response);
          callbacks.onError(`HTTP ${response.status}${detail.length > 0 ? `: ${detail}` : ''}`);
          return;
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/event-stream')) {
          // Akışsız cevap (bazı yerel sunucular ve stream desteklemeyen uçlar): tek JSON gövde.
          const json = (await response.json()) as {
            error?: { message?: string };
            choices?: readonly {
              message?: {
                content?: string | readonly ContentPart[];
                reasoning?: string;
                reasoning_content?: string;
              };
            }[];
          };
          if (json.error !== undefined && json.error !== null) {
            const detail = json.error.message ?? 'Sağlayıcı hata döndürdü';
            callbacks.onError(detail.slice(0, 300));
            return;
          }
          const message = json.choices?.[0]?.message;
          const content = textFromContent(message?.content);
          const reasoning = typeof message?.reasoning === 'string'
            ? message.reasoning
            : typeof message?.reasoning_content === 'string'
              ? message.reasoning_content
              : '';
          callbacks.onDone(content.length > 0 ? content : reasoning);
          return;
        }
        await readStream(response, callbacks, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) {
          callbacks.onError('İptal edildi');
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        callbacks.onError(message.slice(0, 300));
      }
    };
    void run();
    return () => controller.abort();
  };

  return { ping, listOpenAIModels, listOllamaTags, startChat };
}

export function registerAiNetHandlers(
  resolveKey: (provider: string, keyEnv: string | null, override: string | null) => Promise<string | null>,
): void {
  const aiNet = createAiNet();
  const inflight = new Map<string, () => void>();

  ipcMain.handle('ai:ping', async (_event: IpcMainInvokeEvent, baseUrl: string) => aiNet.ping(baseUrl));
  ipcMain.handle('ai:models', async (_event: IpcMainInvokeEvent, args: AiModelsArgs) => {
    // Anahtar main içinde çözülür; renderer'a ve loglara inmez.
    const key = await resolveKey(args.provider, args.keyEnv, args.apiKey);
    return aiNet.listOpenAIModels(args.baseUrl, key);
  });
  ipcMain.handle('ai:ollama:tags', async (_event: IpcMainInvokeEvent, origin: string) =>
    aiNet.listOllamaTags(origin),
  );
  ipcMain.handle('ai:chat:start', async (event: IpcMainInvokeEvent, args: AiChatStartArgs) => {
    const sender = event.sender;
    const apiKey = await resolveKey(args.provider, args.keyEnv, args.apiKey);
    if (apiKey === null && args.keyRequired) {
      return { started: false, error: 'API anahtarı yok — anahtar ekleyin ya da env tanımlayın' };
    }
    const abort = aiNet.startChat(
      {
        baseUrl: args.baseUrl,
        apiKey,
        model: args.model,
        messages: args.messages,
        ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
        ...(args.maxTokens !== undefined ? { maxTokens: args.maxTokens } : {}),
      },
      {
        onToken: (text) => {
          if (!sender.isDestroyed()) sender.send('ai:chat:token', { requestId: args.requestId, text });
        },
        onDone: (text) => {
          inflight.delete(args.requestId);
          if (!sender.isDestroyed()) sender.send('ai:chat:done', { requestId: args.requestId, text });
        },
        onError: (message) => {
          inflight.delete(args.requestId);
          if (!sender.isDestroyed())
            sender.send('ai:chat:error', { requestId: args.requestId, message });
        },
      },
    );
    inflight.set(args.requestId, abort);
    return { started: true };
  });
  ipcMain.handle('ai:chat:abort', async (_event: IpcMainInvokeEvent, args: AiChatAbortArgs) => {
    inflight.get(args.requestId)?.();
    inflight.delete(args.requestId);
  });
  ipcMain.handle('ai:opencode:models', async () => listOpencodeModels());
  ipcMain.handle('ai:opencode:chat', async (event: IpcMainInvokeEvent, args: AiOpencodeChatArgs) => {
    const sender = event.sender;
    const bin = await findOpencodeBinary();
    if (bin === null) {
      return { started: false, error: 'opencode CLI bulunamadı — anahtar ekleyip uzak sağlayıcı kullanın' };
    }
    const abort = startOpencodeCliChat(
      {
        requestId: args.requestId,
        model: args.model,
        prompt: args.prompt,
        sessionId: args.sessionId,
      },
      {
        onSession: (sessionId) => {
          if (!sender.isDestroyed()) sender.send('ai:cli:session', { requestId: args.requestId, sessionId });
        },
        onToken: (text) => {
          if (!sender.isDestroyed()) sender.send('ai:chat:token', { requestId: args.requestId, text });
        },
        onDone: (text) => {
          inflight.delete(args.requestId);
          if (!sender.isDestroyed()) sender.send('ai:chat:done', { requestId: args.requestId, text });
        },
        onError: (message) => {
          inflight.delete(args.requestId);
          if (!sender.isDestroyed())
            sender.send('ai:chat:error', { requestId: args.requestId, message });
        },
      },
      { bin },
    );
    inflight.set(args.requestId, abort);
    return { started: true };
  });
}
