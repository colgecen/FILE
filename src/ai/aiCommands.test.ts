import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { DEFAULT_MODEL } from './models';
import { modelCatalog } from './catalog';
import { sessionStore } from './sessions';
import type { AiChatDoneEvent, AiChatTokenEvent, AiModelsArgs } from '../../electron/shared/api-types';
import { registerAICommands } from './aiCommands';
import type { CommandDef, CommandResult } from '../core/types';

function buildRegistry(): { run: (id: string) => Promise<CommandResult> } {
  const commands = new Map<string, CommandDef>();
  registerAICommands((command: CommandDef) => {
    commands.set(command.id, command);
  });
  return {
    run: async (id: string) => {
      const command = commands.get(id);
      if (command === undefined) return { ok: false, error: 'yok' };
      return await command.run();
    },
  };
}

function resetAI(): void {
  aiChatModel.reset();
  aiEngine.cancel();
  aiEngine.resetChat();
  modelCatalog.reset();
  sessionStore.reset();
  localStorage.clear();
}

describe('registerAICommands — sohbet ve kod akışları', () => {
  let registry: ReturnType<typeof buildRegistry>;
  let ensureSpy: MockInstance<typeof aiEngine.ensureModel>;
  let generateSpy: MockInstance<typeof aiEngine.generate>;

  beforeEach(() => {
    registry = buildRegistry();
    resetAI();
    ensureSpy = vi.spyOn(aiEngine, 'ensureModel').mockResolvedValue(undefined);
    generateSpy = vi.spyOn(aiEngine, 'generate').mockResolvedValue('Selam!');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAI();
  });

  it('ai.chat sohbeti açar ve ai bölgesine odaklanır', async () => {
    await registry.run('ai.chat');
    expect(aiChatModel.isOpen()).toBe(true);
    expect(focusManager.get()).toBe('ai');
    focusManager.returnToPrevious();
  });

  it('ai.chat açıkken tekrar çağrılınca kapatır', async () => {
    await registry.run('ai.chat');
    await registry.run('ai.chat');
    expect(aiChatModel.isOpen()).toBe(false);
    focusManager.returnToPrevious();
  });

  it('ai.chat.send taslağı gönderir ve model yüklenir', async () => {
    aiChatModel.setDraft('Merhaba');
    const result = await registry.run('ai.chat.send');
    expect(result.ok).toBe(true);
    await vi.waitFor(() => {
      expect(ensureSpy).toHaveBeenCalledWith(DEFAULT_MODEL);
      expect(aiChatModel.getDraft()).toBe('');
      const messages = aiEngine.getState().chat.messages;
      expect(messages.some((message) => message.content === 'Merhaba')).toBe(true);
      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ maxNewTokens: 256 }),
      );
    });
  });

  it('boş taslak gönderilmez', async () => {
    aiChatModel.setDraft('   ');
    const result = await registry.run('ai.chat.send');
    expect(result.ok).toBe(false);
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('ai.explain seçili metni kullanır', async () => {
    const source = 'const x = 1;';
    const editor = {
      getSelection: () => ({ isEmpty: () => false }),
      getModel: () => ({
        getValue: () => 'other',
        getValueInRange: () => source,
      }),
    };
    const { setActiveEditor } = await import('../editor/activeEditor');
    setActiveEditor(editor as never);
    await registry.run('ai.explain');
    await vi.waitFor(() => {
      const messages = aiEngine.getState().chat.messages;
      expect(messages.at(-1)?.content).toContain(source);
    });
    setActiveEditor(null);
  });

  it('ai.inline.complete açık dosya olmadan hata verir', async () => {
    const { setActiveEditor } = await import('../editor/activeEditor');
    setActiveEditor(null);
    const result = await registry.run('ai.inline.complete');
    expect(result.ok).toBe(false);
  });
});

describe('aiCommands — model seçimi ve durum', () => {
  let registry: ReturnType<typeof buildRegistry>;
  let ensureSpy: MockInstance<typeof aiEngine.ensureModel>;

  beforeEach(() => {
    registry = buildRegistry();
    resetAI();
    ensureSpy = vi.spyOn(aiEngine, 'ensureModel').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAI();
  });

  it('ai.model.select paleti model listesiyle açar', async () => {
    await registry.run('ai.model.select');
    const { paletteModel } = await import('../core/palette');
    const items = paletteModel.getState().items;
    expect(items.some((item) => item.modelId === 'Qwen/Qwen2.5-0.5B-Instruct')).toBe(true);
    expect(focusManager.get()).toBe('palette');
    focusManager.returnToPrevious();
  });

  it('model seçimi modeli yükler ve kalıcı kaydeder', async () => {
    const { setActiveModel } = await import('./aiCommands');
    const ok = await setActiveModel('Qwen/Qwen2.5-1.5B-Instruct');
    expect(ok).toBe(true);
    expect(ensureSpy).toHaveBeenCalledWith('Qwen/Qwen2.5-1.5B-Instruct');
    expect(localStorage.getItem('editor.activeModel')).toBe('Qwen/Qwen2.5-1.5B-Instruct');
  });

  it('ai.model.status sohbete durum mesajı ekler', async () => {
    const { setActiveModel } = await import('./aiCommands');
    await setActiveModel('Qwen/Qwen2.5-0.5B-Instruct');
    const result = await registry.run('ai.model.status');
    expect(result.ok).toBe(true);
    const messages = aiEngine.getState().chat.messages;
    expect(messages.some((message) => message.content.includes('Model: Qwen2.5 0.5B'))).toBe(true);
  });
});

describe('aiCommands — birleşik katalog', () => {
  let registry: ReturnType<typeof buildRegistry>;
  let ensureSpy: MockInstance<typeof aiEngine.ensureModel>;
  let generateSpy: MockInstance<typeof aiEngine.generate>;

  beforeEach(() => {
    registry = buildRegistry();
    resetAI();
    ensureSpy = vi.spyOn(aiEngine, 'ensureModel').mockResolvedValue(undefined);
    generateSpy = vi.spyOn(aiEngine, 'generate').mockResolvedValue('Selam!');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAI();
  });

  it('ai.model.select yerleşik modelleri palete dizer', async () => {
    modelCatalog.setScanned([
      { id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' },
    ]);
    await registry.run('ai.model.select');
    const { paletteModel } = await import('../core/palette');
    const ids = paletteModel.getState().items.map((item) => item.modelId);
    expect(ids).toContain('Qwen/Qwen2.5-0.5B-Instruct');
    expect(ids).toContain('llama3');
    focusManager.returnToPrevious();
  });

  it('uzak model seçimi kasaya yazılır, worker başlatılmaz', async () => {
    const { selectModel } = await import('./aiCommands');
    selectModel({ id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' });
    expect(ensureSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('ai.activeRef')).toBe(
      JSON.stringify({ id: 'llama3', provider: 'ollama' }),
    );
    expect(
      aiEngine.getState().chat.messages.some((message) => message.content.includes('llama3')),
    ).toBe(true);
  });

  it('uzak modelde gönderim köprüye gider ve yayınlanır', async () => {
    const { selectModel } = await import('./aiCommands');
    const { resetRemoteClient } = await import('./remoteClient');
    resetRemoteClient();
    const listeners: {
      token: ((event: AiChatTokenEvent) => void) | null;
      done: ((event: AiChatDoneEvent) => void) | null;
    } = { token: null, done: null };
    vi.mocked(window.api.aiChatStart).mockResolvedValue({ started: true });
    vi.mocked(window.api.onAiChatToken).mockImplementation(
      (fn: (event: AiChatTokenEvent) => void) => {
        listeners.token = fn;
        return () => undefined;
      },
    );
    vi.mocked(window.api.onAiChatDone).mockImplementation(
      (fn: (event: AiChatDoneEvent) => void) => {
        listeners.done = fn;
        return () => undefined;
      },
    );
    selectModel({ id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' });
    aiChatModel.setDraft('selam');
    const pending = registry.run('ai.chat.send');
    await vi.waitFor(() => {
      expect(window.api.aiChatStart).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'llama3', provider: 'ollama' }),
      );
    });
    const calls = vi.mocked(window.api.aiChatStart).mock.calls[0];
    expect(calls).toBeDefined();
    const requestId = (calls?.[0] as { requestId: string }).requestId;
    listeners.token?.({ requestId, text: 'kısmi' });
    expect(aiEngine.getState().status).toBe('computing');
    listeners.done?.({ requestId, text: 'tam yanıt' });
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(ensureSpy).not.toHaveBeenCalled();
    expect(generateSpy).not.toHaveBeenCalled();
    expect(
      aiEngine.getState().chat.messages.some((message) => message.content === 'tam yanıt'),
    ).toBe(true);
  });

  it('anahtar yoksa uzak gönderim hata mesajı bırakır', async () => {
    const { selectModel } = await import('./aiCommands');
    const { resetRemoteClient } = await import('./remoteClient');
    resetRemoteClient();
    vi.mocked(window.api.aiChatStart).mockResolvedValue({
      started: false,
      error: 'API anahtarı yok',
    });
    selectModel({ id: 'gpt-4o-mini', name: 'gpt-4o-mini', provider: 'openai', source: 'cloud' });
    aiChatModel.setDraft('selam');
    const result = await registry.run('ai.chat.send');
    expect(result.ok).toBe(true);
    expect(aiEngine.getState().status).toBe('error');
    expect(aiEngine.getState().error).toContain('API anahtarı yok');
  });

  it('ai.models.refresh tarar, yerleşikler korunur', async () => {
    vi.mocked(window.api.aiPing).mockResolvedValue({ ok: false, error: 'kapalı' });
    const result = await registry.run('ai.models.refresh');
    expect(result.ok).toBe(true);
    expect(modelCatalog.all().some((entry) => entry.provider === 'builtin')).toBe(true);
  });

  it('anahtarlı bulut modelleri kataloğa girer', async () => {
    vi.mocked(window.api.aiPing).mockResolvedValue({ ok: false, error: 'kapalı' });
    vi.mocked(window.api.aiKeyHas).mockImplementation(async (provider: string) => ({
      present: provider === 'groq',
    }));
    vi.mocked(window.api.aiEnvScan).mockResolvedValue([]);
    vi.mocked(window.api.aiModels).mockImplementation(async (args: AiModelsArgs) =>
      args.baseUrl.includes('groq')
        ? { ok: true, models: ['llama-3.3-70b-versatile'] }
        : { ok: false, models: [], error: 'yok' },
    );
    await registry.run('ai.models.refresh');
    expect(modelCatalog.find('groq', 'llama-3.3-70b-versatile')?.source).toBe('cloud');
  });

  it('sekmeler mesajları izole eder', async () => {
    const { closeSession, newSession, switchSession } = await import('./aiCommands');
    const first = newSession();
    expect(first).not.toBeNull();
    aiEngine.appendUserMessage('birinci');
    const second = newSession();
    expect(second).not.toBeNull();
    expect(aiEngine.getState().chat.messages).toHaveLength(0);
    expect(switchSession(first ?? '')).toBe(true);
    expect(aiEngine.getState().chat.messages.map((m) => m.content)).toContain('birinci');
    expect(closeSession(second ?? '')).toBe(true);
    expect(sessionStore.active()?.id).toBe(first);
  });

  it('ai.session.new akışı paletten açar', async () => {
    const result = await registry.run('ai.session.new');
    expect(result.ok).toBe(true);
    expect(sessionStore.active()).not.toBeNull();
    expect(aiChatModel.isOpen()).toBe(true);
    const closed = await registry.run('ai.session.close');
    expect(closed.ok).toBe(true);
    expect(sessionStore.active()).toBeNull();
    const empty = await registry.run('ai.session.close');
    expect(empty.ok).toBe(false);
  });

  it('kip ve efor komutları aktif sekmeyi değiştirir', async () => {
    await registry.run('ai.session.new');
    expect(await registry.run('ai.mode.build')).toEqual({ ok: true });
    expect(sessionStore.active()?.mode).toBe('build');
    expect(await registry.run('ai.effort.ultra')).toEqual({ ok: true });
    expect(sessionStore.active()?.effort).toBe('ultra');
    expect(await registry.run('ai.mode.plan')).toEqual({ ok: true });
    expect(sessionStore.active()?.mode).toBe('plan');
  });

  it('ultra efor daha büyük bütçeyle üretir', async () => {
    await registry.run('ai.session.new');
    await registry.run('ai.effort.ultra');
    aiChatModel.setDraft('Merhaba');
    await registry.run('ai.chat.send');
    await vi.waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ maxNewTokens: 1024, temperature: 0.7 }),
      );
    });
  });
});

describe('aiCommands — öneri uygulama', () => {
  let registry: ReturnType<typeof buildRegistry>;

  beforeEach(async () => {
    registry = buildRegistry();
    resetAI();
    vi.spyOn(aiEngine, 'ensureModel').mockResolvedValue(undefined);
    vi.spyOn(aiEngine, 'generate').mockResolvedValue('Selam!');
    vi.mocked(window.api.writeFile).mockResolvedValue({ ok: true, path: '/p/a.ts' });
    const { explorerModel } = await import('../core/explorer');
    await explorerModel.loadRoot('/p', async () => []);
    const { clearPending } = await import('./apply');
    clearPending();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetAI();
    const { tabsModel } = await import('../core/tabs');
    tabsModel.reset();
    const { explorerModel } = await import('../core/explorer');
    explorerModel.settle([], null);
    const { clearPending } = await import('./apply');
    clearPending();
  });

  it('plan modda öneri aşamalanır, onay uygular', async () => {
    await registry.run('ai.session.new');
    aiEngine.appendUserMessage('yap');
    aiEngine.finishRemote('```a.ts\nYENİ\n```');
    expect(await registry.run('ai.apply')).toEqual({ ok: true });
    expect(window.api.writeFile).not.toHaveBeenCalled();
    expect(await registry.run('ai.apply.confirm')).toEqual({ ok: true });
    expect(window.api.writeFile).toHaveBeenCalledWith('/p/a.ts', 'YENİ');
  });

  it('yapım modunda direkt yazar', async () => {
    await registry.run('ai.session.new');
    await registry.run('ai.mode.build');
    aiEngine.appendUserMessage('yap');
    aiEngine.finishRemote('```b.ts\nB\n```');
    expect(await registry.run('ai.apply')).toEqual({ ok: true });
    expect(window.api.writeFile).toHaveBeenCalledWith('/p/b.ts', 'B');
  });

  it('kök dışı blok reddedilir', async () => {
    await registry.run('ai.session.new');
    await registry.run('ai.mode.build');
    aiEngine.appendUserMessage('yap');
    aiEngine.finishRemote('```../disa.ts\nX\n```');
    const result = await registry.run('ai.apply');
    expect(result.ok).toBe(false);
    expect(window.api.writeFile).not.toHaveBeenCalled();
  });

  it('vazgeç bekleyeni temizler', async () => {
    await registry.run('ai.session.new');
    aiEngine.appendUserMessage('yap');
    aiEngine.finishRemote('```a.ts\nX\n```');
    expect(await registry.run('ai.apply')).toEqual({ ok: true });
    expect(await registry.run('ai.apply.cancel')).toEqual({ ok: true });
    const confirm = await registry.run('ai.apply.confirm');
    expect(confirm.ok).toBe(false);
  });

  it('öneri yoksa hata verir', async () => {
    await registry.run('ai.session.new');
    const result = await registry.run('ai.apply');
    expect(result.ok).toBe(false);
  });
});

describe('aiCommands — indirme akışı', () => {
  let registry: ReturnType<typeof buildRegistry>;
  let ensureSpy: MockInstance<typeof aiEngine.ensureModel>;

  beforeEach(() => {
    registry = buildRegistry();
    resetAI();
    ensureSpy = vi.spyOn(aiEngine, 'ensureModel').mockResolvedValue(undefined);
    vi.stubGlobal(
      'Worker',
      class {
        postMessage = () => {};
        terminate = () => {};
        onmessage: unknown = null;
      } as unknown as typeof Worker,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetAI();
  });

  it('ai.models.download aktif modeli indirir', async () => {
    aiEngine.appendSystemMessage('hazırlık');
    const result = await registry.run('ai.models.download');
    expect(result.ok).toBe(true);
    await vi.waitFor(() => {
      expect(ensureSpy).toHaveBeenCalled();
    });
  });

  it('ai.models.cancel meşgulken indirmeyi durdurur', async () => {
    const cancelSpy = vi.spyOn(aiEngine, 'cancel');
    aiEngine.init('Qwen/Qwen2.5-1.5B-Instruct');
    expect(aiEngine.getState().status).toBe('loading');
    const result = await registry.run('ai.models.cancel');
    expect(result.ok).toBe(true);
    expect(cancelSpy).toHaveBeenCalled();
    expect(
      aiEngine.getState().chat.messages.some((m) => m.content.includes('iptal')),
    ).toBe(true);
  });

  it('ai.models.cancel boşta hata döndürür', async () => {
    const result = await registry.run('ai.models.cancel');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Aktif işlem yok');
  });
});