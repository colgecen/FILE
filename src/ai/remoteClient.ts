import type {
  AiApiMessage,
  AiChatDoneEvent,
  AiChatErrorEvent,
  AiChatTokenEvent,
  Api,
} from '../../electron/shared/api-types';
import type { ProviderId } from './providers';

type RemoteApi = Pick<
  Api,
  'aiChatStart' | 'aiChatAbort' | 'onAiChatToken' | 'onAiChatDone' | 'onAiChatError'
>;

export type RemoteSendArgs = {
  readonly provider: ProviderId;
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly keyEnv: string | null;
  readonly keyRequired: boolean;
  readonly model: string;
  readonly messages: readonly AiApiMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
};

export type RemoteCallbacks = {
  readonly onToken: (cumulativeText: string) => void;
  readonly onDone: (text: string) => void;
  readonly onError: (message: string) => void;
};

let counter = 0;

function nextRequestId(): string {
  counter += 1;
  return `req-${Date.now()}-${counter}`;
}

export class RemoteChatClient {
  private readonly api: RemoteApi;
  private readonly pending = new Map<
    string,
    { onToken: (text: string) => void; onDone: (text: string) => void; onError: (message: string) => void }
  >();
  private attached = false;

  constructor(api: RemoteApi) {
    this.api = api;
  }

  attach(): () => void {
    if (this.attached) return () => undefined;
    this.attached = true;
    const offToken = this.api.onAiChatToken((event: AiChatTokenEvent) => {
      this.pending.get(event.requestId)?.onToken(event.text);
    });
    const offDone = this.api.onAiChatDone((event: AiChatDoneEvent) => {
      const entry = this.pending.get(event.requestId);
      this.pending.delete(event.requestId);
      entry?.onDone(event.text);
    });
    const offError = this.api.onAiChatError((event: AiChatErrorEvent) => {
      const entry = this.pending.get(event.requestId);
      this.pending.delete(event.requestId);
      entry?.onError(event.message);
    });
    return () => {
      offToken();
      offDone();
      offError();
      this.attached = false;
    };
  }

  send(args: RemoteSendArgs, callbacks: RemoteCallbacks): { requestId: string; abort: () => void } {
    const requestId = nextRequestId();
    let aborted = false;
    this.pending.set(requestId, {
      onToken: callbacks.onToken,
      onDone: callbacks.onDone,
      onError: callbacks.onError,
    });
    const abort = (): void => {
      aborted = true;
      this.pending.delete(requestId);
      void this.api.aiChatAbort(requestId).catch(() => undefined);
    };
    void (async () => {
      try {
        const result = await this.api.aiChatStart({
          requestId,
          provider: args.provider,
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          keyEnv: args.keyEnv,
          keyRequired: args.keyRequired,
          model: args.model,
          messages: args.messages,
          ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
          ...(args.maxTokens !== undefined ? { maxTokens: args.maxTokens } : {}),
        });
        if (aborted) return;
        if (!result.started) {
          this.pending.delete(requestId);
          callbacks.onError(result.error ?? 'Sohbet başlatılamadı');
        }
      } catch (error) {
        if (aborted) return;
        this.pending.delete(requestId);
        const message = error instanceof Error ? error.message : String(error);
        callbacks.onError(message.slice(0, 300));
      }
    })();
    return { requestId, abort };
  }
}

let shared: RemoteChatClient | null = null;

export function getRemoteClient(api: RemoteApi = window.api): RemoteChatClient {
  if (shared === null) {
    shared = new RemoteChatClient(api);
    shared.attach();
  }
  return shared;
}

export function resetRemoteClient(): void {
  shared = null;
}
