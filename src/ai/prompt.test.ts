import { describe, expect, it } from 'vitest';
import { buildPrompt, extractAssistantText } from './prompt';

describe('buildPrompt', () => {
  it('Qwen şablonunda mesajları birleştirir', () => {
    const messages = [
      { role: 'system' as const, content: 'Sen bir yardımcısın.' },
      { role: 'user' as const, content: 'Merhaba' },
    ];
    const prompt = buildPrompt(messages);
    expect(prompt).toBe(
      '<|im_start|>system\nSen bir yardımcısın.<|im_end|>\n<|im_start|>user\nMerhaba<|im_end|>\n<|im_start|>assistant\n',
    );
  });
});

describe('extractAssistantText', () => {
  it('prompt ön ekini ve şablon kalıntılarını temizler', () => {
    const prompt = '<|im_start|>user\nMerhaba<|im_end|>\n<|im_start|>assistant\n';
    const full = `${prompt}<|im_start|>assistant\nSelam!<|im_end|>`;
    expect(extractAssistantText(full, prompt)).toBe('Selam!');
  });

  it('ön ek eşleşmezse kaynak metni temizler', () => {
    expect(extractAssistantText('<|im_start|>assistant\nMerhaba<|im_end|>', '')).toBe('Merhaba');
  });
});