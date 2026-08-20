import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIEngine } from './engine';
import type { AIWorkerEvent } from './types';

type EventData = AIWorkerEvent;

function createFakeWorker(): {
  postMessage: () => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<EventData>) => void) | null;
  deliver: (event: EventData) => void;
} {
  const fake = {
    postMessage: () => {},
    terminate: () => {
      fake.onmessage = null;
    },
    onmessage: null as ((event: MessageEvent<EventData>) => void) | null,
    deliver: (event: EventData): void => {
      if (fake.onmessage !== null) {
        fake.onmessage({ data: event } as unknown as MessageEvent<EventData>);
      }
    },
  };
  return fake;
}

describe('AIEngine', () => {
  let engine: AIEngine;
  let fake: ReturnType<typeof createFakeWorker>;
  let originalWorker: typeof Worker;

  beforeEach(() => {
    fake = createFakeWorker();
    originalWorker = globalThis.Worker;
    vi.spyOn(fake, 'terminate');
    vi.stubGlobal(
      'Worker',
      class {
        postMessage = fake.postMessage;
        terminate = fake.terminate;
        set onmessage(handler: ((event: MessageEvent<EventData>) => void) | null) {
          fake.onmessage = handler;
        }
        get onmessage(): ((event: MessageEvent<EventData>) => void) | null {
          return fake.onmessage;
        }
      } as unknown as typeof Worker,
    );
    engine = new AIEngine();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWorker !== undefined) {
      globalThis.Worker = originalWorker;
    }
  });

  it('init anında loading, ready ulaştığında idle olur', () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    expect(engine.getState().status).toBe('loading');
    fake.deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    expect(engine.getState().status).toBe('idle');
    expect(engine.getState().modelId).toBe('Qwen/Qwen2.5-0.5B-Instruct');
  });

  it('indirme ilerlemesi loading ve yüzde ile izlenir', () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    fake.deliver({
      kind: 'download',
      progress: {
        phase: 'downloading',
        loaded: 40,
        total: 100,
        percent: 40,
        modelId: 'Qwen/Qwen2.5-0.5B-Instruct',
      },
    });
    const state = engine.getState();
    expect(state.status).toBe('loading');
    expect(state.progress?.percent).toBe(40);
  });

  it('generate worker çalışırken computing olur', () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    fake.deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    void engine.generate({ prompt: 'x', maxNewTokens: 8 });
    expect(engine.getState().status).toBe('computing');
  });

  it('token olayı sohbet akışını günceller, done ile tamamlanır', async () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    fake.deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    const promise = engine.generate({ prompt: 'x', maxNewTokens: 8 });
    fake.deliver({ kind: 'token', text: 'Mer' });
    fake.deliver({ kind: 'token', text: 'Merhaba' });
    fake.deliver({ kind: 'done', text: 'Merhaba', tokensPerSecond: 5.2 });
    await expect(promise).resolves.toBe('Merhaba');
    const messages = engine.getState().chat.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('assistant');
    expect(messages[0]?.content).toBe('Merhaba');
    expect(engine.getState().status).toBe('idle');
  });

  it('hata olayı error durumuna geçirir ve generate reddeder', async () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    fake.deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    const promise = engine.generate({ prompt: 'x', maxNewTokens: 8 });
    fake.deliver({ kind: 'error', message: 'Model dosyası bulunamadı' });
    await expect(promise).rejects.toThrow('Model dosyası bulunamadı');
    expect(engine.getState().status).toBe('error');
    expect(engine.getState().error).toBe('Model dosyası bulunamadı');
  });

  it('cancel workerı sonlandırır, bekleyen isteği reddeder ve idle döner', async () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    fake.deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    const promise = engine.generate({ prompt: 'x', maxNewTokens: 8 });
    engine.cancel();
    await expect(promise).rejects.toThrow('İptal edildi');
    expect(fake.terminate).toHaveBeenCalled();
    expect(engine.getState().status).toBe('idle');
    expect(engine.getState().progress).toBeNull();
  });
});