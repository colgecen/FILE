import { useEffect, useState } from 'react';
import type {
  AIProgress,
  AIStatus,
  AIWorkerEvent,
  ChatState,
  CompletionRequest,
  ModelId,
} from './types';

type EngineState = {
  readonly status: AIStatus;
  readonly modelId: ModelId | null;
  readonly progress: AIProgress | null;
  readonly error: string | null;
  readonly chat: ChatState;
};

const INITIAL: EngineState = {
  status: 'idle',
  modelId: null,
  progress: null,
  error: null,
  chat: { messages: [], error: null },
};

type Pending = {
  readonly resolve: (text: string) => void;
  readonly reject: (error: Error) => void;
};

export class AIEngine {
  private state: EngineState = INITIAL;
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private readonly listeners = new Set<(state: EngineState) => void>();

  getState(): EngineState {
    return this.state;
  }

  subscribe(listener: (state: EngineState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  init(modelId: ModelId): void {
    if (this.state.status === 'loading' || this.state.status === 'computing') {
      this.cancel();
    }
    this.patch({ status: 'loading', modelId, progress: null, error: null });
    const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<AIWorkerEvent>): void => {
      this.handle(event.data);
    };
    worker.postMessage({ type: 'init', modelId });
  }

  async generate(request: CompletionRequest): Promise<string> {
    const modelId = this.state.modelId;
    if (modelId === null) {
      throw new Error('Önce model seçilmelidir');
    }
    if (this.worker === null) {
      throw new Error('AI worker hazır değil');
    }
    this.patch({ status: 'computing', error: null, progress: null });
    return new Promise<string>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker?.postMessage({ type: 'generate', modelId, request });
    });
  }

  cancel(): void {
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
    const pending = this.pending;
    this.pending = null;
    if (pending !== null) {
      pending.reject(new Error('İptal edildi'));
    }
    this.patch({ status: 'idle', progress: null, error: null });
  }

  resetChat(): void {
    this.patch({ chat: { messages: [], error: null } });
  }

  private handle(event: AIWorkerEvent): void {
    switch (event.kind) {
      case 'ready':
        this.patch({ status: 'idle', progress: null, error: null });
        break;
      case 'download':
        this.patch({ status: 'loading', progress: event.progress, error: null });
        break;
      case 'computing':
        this.patch({ status: 'computing' });
        break;
      case 'token':
        {
          const messages = [...this.state.chat.messages];
          const last = messages[messages.length - 1];
          if (last !== undefined && last.role === 'assistant') {
            messages[messages.length - 1] = { role: 'assistant', content: event.text };
          } else {
            messages.push({ role: 'assistant', content: event.text });
          }
          this.patch({ chat: { ...this.state.chat, messages } });
        }
        break;
      case 'done':
        {
          const pending = this.pending;
          this.pending = null;
          if (pending !== null) {
            pending.resolve(event.text);
          }
          this.patch({
            status: 'idle',
            chat: {
              messages: [
                ...this.state.chat.messages.slice(0, -1),
                { role: 'assistant', content: event.text },
              ],
              error: null,
            },
          });
        }
        break;
      case 'error':
        {
          const pending = this.pending;
          this.pending = null;
          if (pending !== null) {
            pending.reject(new Error(event.message));
          }
          this.patch({ status: 'error', error: event.message });
        }
        break;
    }
  }

  private patch(partial: Partial<EngineState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const aiEngine = new AIEngine();

export function useAIEngine(): EngineState {
  const [state, setState] = useState<EngineState>(() => aiEngine.getState());
  useEffect(() => aiEngine.subscribe(setState), []);
  return state;
}