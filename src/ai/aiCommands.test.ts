import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { DEFAULT_MODEL } from './models';
import { registerAICommands } from './aiCommands';
import type { CommandDef, CommandResult } from '../core/types';

function buildRegistry(): { run: (id: string) => Promise<CommandResult>; calls: string[] } {
  const commands = new Map<string, CommandDef>();
  registerAICommands((command: CommandDef) => {
    commands.set(command.id, command);
  });
  return {
    calls: [],
    run: async (id: string) => {
      const command = commands.get(id);
      if (command === undefined) return { ok: false, error: 'yok' };
      return await command.run();
    },
  };
}

describe('registerAICommands', () => {
  let registry: ReturnType<typeof buildRegistry>;
  let ensureSpy: MockInstance<typeof aiEngine.ensureModel>;
  let generateSpy: MockInstance<typeof aiEngine.generate>;

  beforeEach(() => {
    registry = buildRegistry();
    aiChatModel.reset();
    aiEngine.resetChat();
    ensureSpy = vi.spyOn(aiEngine, 'ensureModel').mockResolvedValue(undefined);
    generateSpy = vi
      .spyOn(aiEngine, 'generate')
      .mockResolvedValue('Selam!');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    aiChatModel.reset();
    aiEngine.cancel();
    aiEngine.resetChat();
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