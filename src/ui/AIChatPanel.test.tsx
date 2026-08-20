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