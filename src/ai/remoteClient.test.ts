import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AiChatDoneEvent,
  AiChatErrorEvent,
  AiChatTokenEvent,
  AiCliSessionEvent,
} from '../../electron/shared/api-types';
import { RemoteChatClient, resetRemoteClient } from './remoteClient';

function fakeApi(): {
  api: ConstructorParameters<typeof RemoteChatClient>[0];
  start: ReturnType<typeof vi.fn>;
  cliStart: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  emitToken: (event: AiChatTokenEvent) => void;
  emitDone: (event: AiChatDoneEvent) => void;
  emitError: (event: AiChatErrorEvent) => void;
  emitSession: (event: AiCliSessionEvent) => void;
} {
  const start = vi.fn(async () => ({ started: true }));
  const cliStart = vi.fn(async () => ({ started: true }));
  const abort = vi.fn(async () => undefined);
  let tokenFn: ((event: AiChatTokenEvent) => void) | null = null;
  let doneFn: ((event: AiChatDoneEvent) => void) | null = null;
  let errorFn: ((event: AiChatErrorEvent) => void) | null = null;
  let sessionFn: ((event: AiCliSessionEvent) => void) | null = null;
  const api = {
    aiChatStart: start,
    aiChatAbort: abort,
    onAiChatToken: vi.fn((fn: (event: AiChatTokenEvent) => void) => {
      tokenFn = fn;
      return () => undefined;
    }),
    onAiChatDone: vi.fn((fn: (event: AiChatDoneEvent) => void) => {
      doneFn = fn;
      return () => undefined;
    }),
    onAiChatError: vi.fn((fn: (event: AiChatErrorEvent) => void) => {
      errorFn = fn;
      return () => undefined;
    }),
    aiOpencodeChat: cliStart,
    onAiCliSession: vi.fn((fn: (event: AiCliSessionEvent) => void) => {
      sessionFn = fn;
      return () => undefined;
    }),
  };
  return {
    api,
    start,
    cliStart,
    abort,
    emitToken: (event) => tokenFn?.(event),
    emitDone: (event) => doneFn?.(event),
    emitError: (event) => errorFn?.(event),
    emitSession: (event) => sessionFn?.(event),
  };
}

const ARGS = {
  provider: 'ollama' as const,
  baseUrl: 'http://localhost:11434/v1',
  apiKey: null,
  keyEnv: null,
  keyRequired: false,
  model: 'llama3',
  messages: [{ role: 'user' as const, content: 'selam' }],
};

describe('RemoteChatClient', () => {
  afterEach(() => {
    resetRemoteClient();
  });

  it('başlatma isteğini main köprüye iletir', async () => {
    const fake = fakeApi();
    const client = new RemoteChatClient(fake.api);
    client.attach();
    const done = new Promise<string>((resolve, reject) => {
      client.send(ARGS, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await vi.waitFor(() => {
      expect(fake.start).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'llama3', provider: 'ollama' }),
      );
    });
    const requestId = fake.start.mock.calls[0]?.[0].requestId as string;
    fake.emitToken({ requestId, text: 'Sel' });
    fake.emitDone({ requestId, text: 'Selam!' });
    await expect(done).resolves.toBe('Selam!');
  });

  it('tokenları kümülatif iletir, yabancı isteği yok sayar', async () => {
    const fake = fakeApi();
    const client = new RemoteChatClient(fake.api);
    client.attach();
    const tokens: string[] = [];
    const done = new Promise<string>((resolve, reject) => {
      client.send(ARGS, {
        onToken: (text) => tokens.push(text),
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await vi.waitFor(() => {
      expect(fake.start).toHaveBeenCalled();
    });
    const requestId = fake.start.mock.calls[0]?.[0].requestId as string;
    fake.emitToken({ requestId: 'başkası', text: 'görünmez' });
    fake.emitToken({ requestId, text: 'a' });
    fake.emitToken({ requestId, text: 'ab' });
    fake.emitDone({ requestId, text: 'ab' });
    await expect(done).resolves.toBe('ab');
    expect(tokens).toEqual(['a', 'ab']);
  });

  it('başlatılamazsa hatayı iletir', async () => {
    const fake = fakeApi();
    fake.start.mockResolvedValue({ started: false, error: 'API anahtarı yok' });
    const client = new RemoteChatClient(fake.api);
    client.attach();
    const done = new Promise<string>((resolve) => {
      client.send(ARGS, {
        onToken: () => undefined,
        onDone: () => resolve('bitti'),
        onError: (message) => resolve(message),
      });
    });
    await expect(done).resolves.toBe('API anahtarı yok');
  });

  it('CLI isteğini oturum bilgisiyle iletir', async () => {
    const fake = fakeApi();
    const client = new RemoteChatClient(fake.api);
    client.attach();
    const tokens: string[] = [];
    let session: string | null = null;
    const done = new Promise<string>((resolve) => {
      client.sendCli(
        { model: 'big-pickle', prompt: 'selam', sessionId: null },
        {
          onToken: (text) => tokens.push(text),
          onDone: (text) => resolve(text),
          onError: () => resolve('hata'),
          onSession: (id) => {
            session = id;
          },
        },
      );
    });
    await vi.waitFor(() => {
      expect(fake.cliStart).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'big-pickle', prompt: 'selam', sessionId: null }),
      );
    });
    const requestId = fake.cliStart.mock.calls[0]?.[0].requestId as string;
    fake.emitSession({ requestId, sessionId: 'ses-1' });
    expect(session).toBe('ses-1');
    fake.emitToken({ requestId, text: 'Me' });
    fake.emitToken({ requestId, text: 'Merhaba' });
    fake.emitDone({ requestId, text: 'Merhaba' });
    await expect(done).resolves.toBe('Merhaba');
    expect(tokens).toEqual(['Me', 'Merhaba']);
  });

  it('CLI başlatılamazsa hatayı iletir', async () => {
    const fake = fakeApi();
    fake.cliStart.mockResolvedValue({ started: false, error: 'opencode CLI bulunamadı' });
    const client = new RemoteChatClient(fake.api);
    client.attach();
    const done = new Promise<string>((resolve) => {
      client.sendCli(
        { model: 'big-pickle', prompt: 'selam', sessionId: null },
        {
          onToken: () => undefined,
          onDone: () => resolve('bitti'),
          onError: (message) => resolve(message),
        },
      );
    });
    await expect(done).resolves.toBe('opencode CLI bulunamadı');
  });

  it('iptal köprüye iletilir, sonrası yoksayılır', async () => {
    const fake = fakeApi();
    const client = new RemoteChatClient(fake.api);
    client.attach();
    let settled = '';
    const { abort } = client.send(ARGS, {
      onToken: () => {
        settled = 'token';
      },
      onDone: () => {
        settled = 'bitti';
      },
      onError: () => {
        settled = 'hata';
      },
    });
    await vi.waitFor(() => {
      expect(fake.start).toHaveBeenCalled();
    });
    const requestId = fake.start.mock.calls[0]?.[0].requestId as string;
    abort();
    expect(fake.abort).toHaveBeenCalledWith(requestId);
    fake.emitToken({ requestId, text: 'geç' });
    fake.emitDone({ requestId, text: 'geç' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe('');
  });
});
