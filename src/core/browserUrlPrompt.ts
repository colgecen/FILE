import { useEffect, useState } from 'react';

export type UrlPromptRequest = {
  readonly label: string;
  readonly value: string;
  readonly onSubmit: (url: string) => void;
};

let request: UrlPromptRequest | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export const browserUrlPromptModel = {
  getSnapshot(): UrlPromptRequest | null {
    return request;
  },
  open(next: UrlPromptRequest): void {
    request = next;
    emit();
  },
  close(): void {
    if (request === null) return;
    request = null;
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useBrowserUrlPrompt(): UrlPromptRequest | null {
  const [state, setState] = useState<UrlPromptRequest | null>(() => browserUrlPromptModel.getSnapshot());
  useEffect(() => browserUrlPromptModel.subscribe(() => setState(browserUrlPromptModel.getSnapshot())), []);
  return state;
}
