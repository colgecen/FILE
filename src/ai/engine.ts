import { useEffect, useState } from 'react';
import { perfModel } from '../core/perfModel';
import type {
  AIProgress,
  AIStatus,
  AIWorkerEvent,
  ChatMessage,
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

/** Yükleme sırasında ilerleme gelmezse takıldı sayılan süre. */
export const LOAD_STALL_MS = 180_000;

const STALL_CHECK_MS = 10_000;

export class AIEngine {
  private state: EngineState = INITIAL;
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private loadGen = 0;
  private lastActivityAt = 0;
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
    this.terminateWorker();
    this.loadGen += 1;
    this.lastActivityAt = Date.now();
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

  async ensureModel(modelId: ModelId, stallMs: number = LOAD_STALL_MS): Promise<void> {
    if (perfModel.getState().aiLazy && this.worker === null && this.state.status === 'idle') {
      // lazy: only init when actually needed via ensureModel — already here
    }
    if (this.state.modelId === modelId && this.state.status !== 'loading') return;
    this.init(modelId);
    const gen = this.loadGen;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = setInterval(() => {
        if (gen !== this.loadGen || settled) {
          clearInterval(timer);
          return;
        }
        if (this.state.status === 'loading' && Date.now() - this.lastActivityAt > stallMs) {
          settled = true;
          clearInterval(timer);
          this.cancel();
          reject(new Error('Model yüklemesi takıldı (ilerleme yok) — Durdur ile iptal edip tekrar deneyin'));
        }
      }, Math.min(STALL_CHECK_MS, Math.max(stallMs / 4, 10)));
      const unsubscribe = this.subscribe((state) => {
        if (settled) return;
        if (state.modelId === modelId && state.status === 'idle') {
          settled = true;
          clearInterval(timer);
          unsubscribe();
          resolve();
        } else if (state.status === 'error') {
          settled = true;
          clearInterval(timer);
          unsubscribe();
          reject(new Error(state.error ?? 'Model yüklenemedi'));
        }
      });
    });
  }

  appendUserMessage(content: string): void {
    this.patch({
      chat: {
        ...this.state.chat,
        messages: [...this.state.chat.messages, { role: 'user', content }],
      },
    });
  }

  appendSystemMessage(content: string): void {
    this.patch({
      chat: {
        ...this.state.chat,
        messages: [...this.state.chat.messages, { role: 'system', content }],
      },
    });
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
    this.terminateWorker();
    const pending = this.pending;
    this.pending = null;
    if (pending !== null) {
      pending.reject(new Error('İptal edildi'));
    }
    this.patch({ status: 'idle', progress: null, error: null });
  }

  private terminateWorker(): void {
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  resetChat(): void {
    this.patch({ chat: { messages: [], error: null } });
  }

  /** Uzak akış girişi: hesaplanıyor durumuna geçirir. */
  beginRemote(): void {
    this.patch({ status: 'computing', error: null, progress: null });
  }

  /** Uzak akış token'ı: son asistan iletisini kümülatif metinle günceller. */
  appendRemoteToken(text: string): void {
    const messages = [...this.state.chat.messages];
    const last = messages[messages.length - 1];
    if (last !== undefined && last.role === 'assistant') {
      messages[messages.length - 1] = { role: 'assistant', content: text };
    } else {
      messages.push({ role: 'assistant', content: text });
    }
    this.patch({ chat: { ...this.state.chat, messages } });
  }

  /** Uzak akış finali: durumu boşa alır, son iletiyi netleştirir. */
  finishRemote(text: string): void {
    const finalText = text.trim().length > 0
      ? text
      : 'Yanıt alınamadı efendim; model boş döndü. Lütfen tekrar deneyin.';
    const messages = [...this.state.chat.messages];
    const last = messages[messages.length - 1];
    if (last !== undefined && last.role === 'assistant') {
      messages[messages.length - 1] = { role: 'assistant', content: finalText };
    } else {
      messages.push({ role: 'assistant', content: finalText });
    }
    this.patch({ status: 'idle', chat: { messages, error: null } });
  }

  /** Başka sekmeden gelen geçmişi aynaya yükler (akış hedefi değişmez). */
  loadMessages(messages: readonly ChatMessage[]): void {
    this.patch({ chat: { messages: [...messages], error: null } });
  }

  setError(message: string): void {
    this.patch({ status: 'error', error: message });
  }

  private handle(event: AIWorkerEvent): void {
    switch (event.kind) {
      case 'ready':
        this.lastActivityAt = Date.now();
        this.patch({ status: 'idle', progress: null, error: null });
        break;
      case 'download':
        this.lastActivityAt = Date.now();
        this.patch({ status: 'loading', progress: event.progress, error: null });
        break;
      case 'computing':
        this.lastActivityAt = Date.now();
        this.patch({ status: 'computing' });
        break;
      case 'token':
        this.appendRemoteToken(event.text);
        break;
      case 'done':
        {
          const pending = this.pending;
          this.pending = null;
          if (pending !== null) {
            pending.resolve(event.text);
          }
          this.finishRemote(event.text);
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