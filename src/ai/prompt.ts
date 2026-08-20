import type { ChatMessage } from './types';

const IM_START = '<|im_start|>';
const IM_END = '<|im_end|>';

export function buildPrompt(messages: readonly ChatMessage[]): string {
  const blocks = messages.map((message) => `${IM_START}${message.role}\n${message.content}${IM_END}\n`);
  return `${blocks.join('')}${IM_START}assistant\n`;
}

export function extractAssistantText(full: string, prompt: string): string {
  let text = full;
  if (text.startsWith(prompt)) {
    text = text.slice(prompt.length);
  }
  text = text
    .replace(/^<\|im_start\|>assistant\s*/, '')
    .replace(/<\|im_end\|>/g, '')
    .trim();
  return text;
}