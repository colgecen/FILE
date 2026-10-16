import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiChatModel } from '../core/chatModel';
import { aiEngine } from '../ai/engine';
import { modelCatalog } from '../ai/catalog';
import { sessionStore } from '../ai/sessions';
import { focusManager } from '../core/focus';
import { AIChatPanel } from './AIChatPanel';

const mockCore = {
  registry: {
    run: vi.fn<(id: string) => { ok: boolean }>(() => ({ ok: true })),
  },
};

vi.mock('../layout/AppShell', () => ({
  useCore: () => mockCore,
}));

describe('AIChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiChatModel.reset();
    aiEngine.resetChat();
    sessionStore.reset();
    modelCatalog.reset();
    localStorage.clear();
    focusManager.set('editor');
  });

  afterEach(() => {
    aiChatModel.reset();
    aiEngine.resetChat();
    sessionStore.reset();
    modelCatalog.reset();
    localStorage.clear();
    focusManager.set('editor');
  });

  it('sohbet kapalıyken render edilmez', () => {
    const { container } = render(<AIChatPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('sohbet açıkken taslak ve gönderim komutu çalışır', () => {
    aiChatModel.open();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Mesajınızı yazın…');
    fireEvent.change(input, { target: { value: 'Merhaba' } });
    expect(aiChatModel.getDraft()).toBe('Merhaba');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockCore.registry.run).toHaveBeenCalledWith('ai.chat.send');
  });

  it('Esc kapatma komutunu tetikler', () => {
    aiChatModel.open();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Mesajınızı yazın…');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockCore.registry.run).toHaveBeenCalledWith('ai.chat.close');
  });

  it('shift ile satır sonu ekler, göndermez', () => {
    aiChatModel.open();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Mesajınızı yazın…');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(mockCore.registry.run).not.toHaveBeenCalled();
  });

  it('başlıktaki kapat düğmesi kapatma komutunu çalıştırır', () => {
    aiChatModel.open();
    render(<AIChatPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(mockCore.registry.run).toHaveBeenCalledWith('ai.chat.close');
  });

  it('sekme çubuğu geçişte mesajları değiştirir', async () => {
    const { newSession } = await import('../ai/aiCommands');
    aiChatModel.open();
    const first = newSession();
    aiEngine.appendUserMessage('birinci-mesaj');
    if (first !== null) sessionStore.saveMessages(first, aiEngine.getState().chat.messages);
    newSession();
    aiEngine.appendUserMessage('ikinci-mesaj');
    const second = sessionStore.active();
    if (second !== null) sessionStore.saveMessages(second.id, aiEngine.getState().chat.messages);
    render(<AIChatPanel />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('tab')[0]!);
    expect(screen.getByText('birinci-mesaj')).toBeInTheDocument();
    expect(screen.queryByText('ikinci-mesaj')).toBeNull();
  });

  it('model seçimi kataloğu listeler ve değiştirir', async () => {
    modelCatalog.setScanned([
      { id: 'llama3', name: 'llama3', provider: 'ollama', source: 'ollama' },
    ]);
    aiChatModel.open();
    render(<AIChatPanel />);
    const picker = screen.getByRole('button', { name: 'Model seç' });
    fireEvent.click(picker);
    fireEvent.click(screen.getByRole('button', { name: /llama3/ }));
    expect(JSON.parse(localStorage.getItem('ai.activeRef') ?? '{}')).toEqual({
      id: 'llama3',
      provider: 'ollama',
    });
  });

  it('kip düğmesi komut koşar', () => {
    aiChatModel.open();
    render(<AIChatPanel />);
    fireEvent.click(screen.getByText('Yapım'));
    expect(mockCore.registry.run).toHaveBeenCalledWith('ai.mode.plan');
  });

  it('anahtar kaydetme kasaya yazar', async () => {
    aiChatModel.open();
    render(<AIChatPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayarlar' }));
    fireEvent.change(screen.getByLabelText('API anahtarı'), { target: { value: 'sk-test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await vi.waitFor(() => {
      expect(window.api.aiKeySet).toHaveBeenCalledWith({ provider: 'openai', key: 'sk-test' });
    });
  });

});

describe('AIChatPanel indirme akışı', () => {
  let fake: {
    onmessage: ((event: MessageEvent<{ kind: 'download' }>) => void) | null;
    postMessage: () => void;
    terminate: () => void;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    aiChatModel.reset();
    focusManager.set('editor');
    fake = {
      onmessage: null,
      postMessage: () => {},
      terminate: () => {},
    };
    vi.stubGlobal(
      'Worker',
      class {
        postMessage = fake.postMessage;
        terminate = fake.terminate;
        set onmessage(handler: ((event: MessageEvent<{ kind: 'download' }>) => void) | null) {
          fake.onmessage = handler;
        }
        get onmessage(): ((event: MessageEvent<{ kind: 'download' }>) => void) | null {
          return fake.onmessage;
        }
      } as unknown as typeof Worker,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    aiChatModel.reset();
    focusManager.set('editor');
  });

  it('indirme sırasında ilerleme çubuğu ve durdur butonu görünür', async () => {
    const { aiEngine } = await import('../ai/engine');
    aiEngine.init('Qwen/Qwen2.5-0.5B-Instruct');
    if (fake.onmessage !== null) {
      fake.onmessage({
        data: {
          kind: 'download',
          progress: {
            phase: 'downloading',
            loaded: 40,
            total: 100,
            percent: 40,
            modelId: 'Qwen/Qwen2.5-0.5B-Instruct',
          },
        },
      } as unknown as MessageEvent<{ kind: 'download' }>);
    }
    aiChatModel.open();
    render(<AIChatPanel />);
    const bar = screen.getByLabelText('Model indirme ilerlemesi');
    expect(bar).toBeTruthy();
    expect(screen.getByText(/İndiriliyor/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Durdur'));
    expect(mockCore.registry.run).toHaveBeenCalledWith('ai.models.cancel');
  });
});