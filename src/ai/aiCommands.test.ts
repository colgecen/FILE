import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { DEFAULT_MODEL } from './models';
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