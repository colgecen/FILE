import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIEngine } from './engine';
import type { AIWorkerEvent } from './types';

type EventData = AIWorkerEvent;

describe('AIEngine', () => {
  let engine: AIEngine;
  let deliver: (event: EventData) => void;
  let api: {
    aiLocalLoad: ReturnType<typeof vi.fn>;
    aiLocalGenerate: ReturnType<typeof vi.fn>;
    aiLocalCancel: ReturnType<typeof vi.fn>;
    aiLocalUnload: ReturnType<typeof vi.fn>;
    onAiLocalEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      aiLocalLoad: vi.fn().mockResolvedValue({ ok: true }),
      aiLocalGenerate: vi.fn().mockResolvedValue({ started: true }),
      aiLocalCancel: vi.fn().mockResolvedValue(undefined),
      aiLocalUnload: vi.fn().mockResolvedValue(undefined),
      onAiLocalEvent: vi.fn((listener: (event: unknown) => void) => {
        deliver = (event: EventData): void => {
          listener(event);
        };
        return () => undefined;
      }),
    };
    Object.defineProperty(window, 'api', { value: { ...window.api, ...api }, configurable: true, writable: true });
    engine = new AIEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('init anında loading, ready ulaştığında idle olur', () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    expect(engine.getState().status).toBe('loading');
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    expect(engine.getState().status).toBe('idle');
    expect(engine.getState().modelId).toBe('Qwen/Qwen2.5-0.5B-Instruct');
  });

  it('indirme ilerlemesi loading ve yüzde ile izlenir', () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    deliver({
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
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    void engine.generate({ prompt: 'x', maxNewTokens: 8 });
    expect(engine.getState().status).toBe('computing');
  });

  it('token olayı sohbet akışını günceller, done ile tamamlanır', async () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    const promise = engine.generate({ prompt: 'x', maxNewTokens: 8 });
    deliver({ kind: 'token', text: 'Mer' });
    deliver({ kind: 'token', text: 'Merhaba' });
    deliver({ kind: 'done', text: 'Merhaba', tokensPerSecond: 5.2 });
    await expect(promise).resolves.toBe('Merhaba');
    const messages = engine.getState().chat.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('assistant');
    expect(messages[0]?.content).toBe('Merhaba');
    expect(engine.getState().status).toBe('idle');
  });

  it('boş uzak yanıt yerine uyarı iletisi koyar', () => {
    engine.beginRemote();
    engine.finishRemote('   ');
    const messages = engine.getState().chat.messages;
    expect(messages[0]?.content).toContain('boş döndü');
    expect(messages[0]?.role).toBe('assistant');
    expect(engine.getState().status).toBe('idle');
  });

  it('hata olayı error durumuna geçirir ve generate reddeder', async () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    const promise = engine.generate({ prompt: 'x', maxNewTokens: 8 });
    deliver({ kind: 'error', message: 'Model dosyası bulunamadı' });
    await expect(promise).rejects.toThrow('Model dosyası bulunamadı');
    expect(engine.getState().status).toBe('error');
    expect(engine.getState().error).toBe('Model dosyası bulunamadı');
  });

  it('cancel isteği gönderir, bekleyen isteği reddeder ve idle döner', async () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    const promise = engine.generate({ prompt: 'x', maxNewTokens: 8 });
    engine.cancel();
    await expect(promise).rejects.toThrow('İptal edildi');
    expect(api.aiLocalCancel).toHaveBeenCalled();
    expect(engine.getState().status).toBe('idle');
    expect(engine.getState().progress).toBeNull();
  });

  it('yeniden init eski modeli bellekten çıkarır', () => {
    engine.init('Qwen/Qwen2.5-0.5B-Instruct');
    engine.init('Qwen/Qwen2.5-1.5B-Instruct');
    expect(api.aiLocalUnload).not.toHaveBeenCalled(); // unload sidecar'a gitmez; model değiştirilir
    expect(engine.getState().modelId).toBe('Qwen/Qwen2.5-1.5B-Instruct');
  });

  it('ensureModel ready gelince çözülür', async () => {
    const pending = engine.ensureModel('Qwen/Qwen2.5-0.5B-Instruct', 5000);
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    await expect(pending).resolves.toBeUndefined();
  });

  it('ilerleme durursa ensureModel takılma hatasıyla reddeder', async () => {
    const pending = engine.ensureModel('Qwen/Qwen2.5-0.5B-Instruct', 40);
    deliver({
      kind: 'download',
      progress: {
        phase: 'downloading',
        loaded: 100,
        total: 100,
        percent: 100,
        modelId: 'Qwen/Qwen2.5-0.5B-Instruct',
      },
    });
    await expect(pending).rejects.toThrow('takıldı');
    expect(engine.getState().status).toBe('idle');
  });

  it('sürekli ilerleme takılma sayacını sıfırlar', async () => {
    const pending = engine.ensureModel('Qwen/Qwen2.5-0.5B-Instruct', 120);
    const progress = {
      phase: 'downloading' as const,
      loaded: 100,
      total: 100,
      percent: 100,
      modelId: 'Qwen/Qwen2.5-0.5B-Instruct' as const,
    };
    deliver({ kind: 'download', progress });
    await new Promise((resolve) => setTimeout(resolve, 60));
    deliver({ kind: 'download', progress });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(engine.getState().status).toBe('loading');
    deliver({ kind: 'ready', modelId: 'Qwen/Qwen2.5-0.5B-Instruct' });
    await expect(pending).resolves.toBeUndefined();
  });

  it('load hatası ensureModel reddeder', async () => {
    api.aiLocalLoad.mockResolvedValueOnce({ ok: false, error: 'Model yüklenemedi' });
    const pending = engine.ensureModel('Qwen/Qwen2.5-0.5B-Instruct', 5000);
    await expect(pending).rejects.toThrow('Model yüklenemedi');
    expect(engine.getState().status).toBe('error');
  });
});