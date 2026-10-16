import type {
  AiApiMessage,
  AiChatDoneEvent,
  AiChatErrorEvent,
  AiChatTokenEvent,
  AiCliSessionEvent,
  Api,
} from '../../electron/shared/api-types';
import type { ProviderId } from './providers';

type RemoteApi = Pick<
  Api,
  | 'aiChatStart'
  | 'aiChatAbort'
  | 'onAiChatToken'
  | 'onAiChatDone'
  | 'onAiChatError'
  | 'aiOpencodeChat'
  | 'onAiCliSession'
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

export type CliSendArgs = {
  readonly model: string;
  readonly prompt: string;
  readonly sessionId: string | null;
};

type PendingEntry = {
  onToken: (text: string) => void;
  onDone: (text: string) => void;
  onError: (message: string) => void;
  onSession?: (sessionId: string) => void;
};

let counter = 0;

function nextRequestId(): string {
  counter += 1;
  return `req-${Date.now()}-${counter}`;
}

export class RemoteChatClient {
  private readonly api: RemoteApi;
  private readonly pending = new Map<string, PendingEntry>();
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
    const offSession = this.api.onAiCliSession((event: AiCliSessionEvent) => {
      this.pending.get(event.requestId)?.onSession?.(event.sessionId);
    });
    return () => {
      offToken();
      offDone();
      offError();
      offSession();
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

  sendCli(
    args: CliSendArgs,
    callbacks: RemoteCallbacks & { readonly onSession?: (sessionId: string) => void },
  ): { requestId: string; abort: () => void } {
    const requestId = nextRequestId();
    let aborted = false;
    this.pending.set(requestId, {
      onToken: callbacks.onToken,
      onDone: callbacks.onDone,
      onError: callbacks.onError,
      ...(callbacks.onSession !== undefined ? { onSession: callbacks.onSession } : {}),
    });
    const abort = (): void => {
      aborted = true;
      this.pending.delete(requestId);
      void this.api.aiChatAbort(requestId).catch(() => undefined);
    };
    void (async () => {
      try {
        const result = await this.api.aiOpencodeChat({
          requestId,
          model: args.model,
          prompt: args.prompt,
          sessionId: args.sessionId,
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
