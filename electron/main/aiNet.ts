import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type {
  AiChatAbortArgs,
  AiChatStartArgs,
  AiModelsArgs,
  AiModelsResult,
  AiOllamaTagsResult,
  AiPingResult,
} from '../shared/api-types';

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

function deltaText(payload: string): string | null {
  try {
    const json = JSON.parse(payload) as {
      choices?: readonly { delta?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : null;
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
  let full = '';
  for (;;) {
    if (signal.aborted) {
      await reader.cancel().catch(() => undefined);
      callbacks.onError('İptal edildi');
      return;
    }
    const chunk = await reader.read().catch(() => null);
    if (chunk === null || chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const split = splitSSE(buffer);
    buffer = split.rest;
    for (const payload of split.pieces) {
      const piece = deltaText(payload);
      if (piece !== null && piece.length > 0) {
        full += piece;
        callbacks.onToken(full);
      }
    }
    if (split.done) break;
  }
  callbacks.onDone(full);
}

export type AiNet = {
  readonly ping: (baseUrl: string) => Promise<AiPingResult>;
  readonly listOpenAIModels: (baseUrl: string, apiKey: string | null) => Promise<AiModelsResult>;
  readonly listOllamaTags: (origin: string) => Promise<AiOllamaTagsResult>;
  readonly startChat: (job: AiChatJob, callbacks: AiChatStreamCallbacks) => () => void;
};

export function createAiNet(fetchFn: FetchFn = fetch): AiNet {
  const headersFor = (apiKey: string | null): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey !== null && apiKey.length > 0) headers['Authorization'] = `Bearer ${apiKey}`;
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
      const response = await fetchFn(url, { method: 'GET', headers: headersFor(apiKey), signal: timeout.signal });
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
      try {
        const url = `${job.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const body: Record<string, unknown> = {
          model: job.model,
          messages: job.messages,
          stream: true,
        };
        if (job.temperature !== undefined) body['temperature'] = job.temperature;
        if (job.maxTokens !== undefined) body['max_tokens'] = job.maxTokens;
        const response = await fetchFn(url, {
          method: 'POST',
          headers: headersFor(job.apiKey),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          const detail = await readErrorBody(response);
          callbacks.onError(`HTTP ${response.status}${detail.length > 0 ? `: ${detail}` : ''}`);
          return;
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/event-stream')) {
          // Akışsız cevap (bazı yerel sunucular): tek JSON gövde.
          const json = (await response.json()) as {
            choices?: readonly { message?: { content?: string } }[];
          };
          const content = json.choices?.[0]?.message?.content ?? '';
          callbacks.onDone(content);
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
}
