import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiChatModel } from '../core/chatModel';
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
    focusManager.set('editor');
  });

  afterEach(() => {
    aiChatModel.reset();
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
    fireEvent.click(screen.getByText('Durdur'));
    expect(mockCore.registry.run).toHaveBeenCalledWith('ai.models.cancel');
  });
});