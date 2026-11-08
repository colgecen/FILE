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
  private pending: Pending | null = null;
  private currentRequestId: string | null = null;
  private loadGen = 0;
  private lastActivityAt = 0;
  private readonly listeners = new Set<(state: EngineState) => void>();
  private listenerFn: ((listener: (event: unknown) => void) => (() => void)) | null = null;

  private ensureListener(): void {
    if (typeof window === 'undefined' || !window.api || typeof window.api.onAiLocalEvent !== 'function') return;
    const current = window.api.onAiLocalEvent;
    if (this.listenerFn === current) return;
    this.listenerFn = current;
    current((raw: unknown) => {
      this.handle(raw as AIWorkerEvent);
    });
  }

  constructor() {
    this.ensureListener();
  }

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
    this.ensureListener();
    this.loadGen += 1;
    this.lastActivityAt = Date.now();
    this.patch({ status: 'loading', modelId, progress: null, error: null });
    void window.api
      .aiLocalLoad({ modelId })
      .then((result: { ok: boolean; error?: string }) => {
        if (!result.ok) {
          this.patch({ status: 'error', error: result.error ?? 'Model yüklenemedi', progress: null });
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.patch({ status: 'error', error: message, progress: null });
      });
  }

  async ensureModel(modelId: ModelId, stallMs: number = LOAD_STALL_MS): Promise<void> {
    if (perfModel.getState().aiLazy && this.state.modelId === null && this.state.status === 'idle') {
      // lazy: sadece gerektiğinde yüklenir — zaten buradayız
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
    this.ensureListener();
    const modelId = this.state.modelId;
    if (modelId === null) {
      throw new Error('Önce model seçilmelidir');
    }
    this.patch({ status: 'computing', error: null, progress: null });
    const requestId = `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.currentRequestId = requestId;
    return new Promise<string>((resolve, reject) => {
      this.pending = { resolve, reject };
      void window.api
        .aiLocalGenerate(requestId, request.prompt, request.maxNewTokens, request.temperature)
        .then((result: { started: boolean; error?: string }) => {
          if (!result.started) {
            const pending = this.pending;
            this.pending = null;
            if (pending !== null) pending.reject(new Error(result.error ?? 'Üretim başlatılamadı'));
            this.patch({ status: 'error', error: result.error ?? 'Üretim başlatılamadı' });
          }
        })
        .catch((error: unknown) => {
          const pending = this.pending;
          this.pending = null;
          const message = error instanceof Error ? error.message : String(error);
          if (pending !== null) pending.reject(new Error(message));
          this.patch({ status: 'error', error: message });
        });
    });
  }

  cancel(): void {
    const requestId = this.currentRequestId;
    if (requestId !== null) void window.api.aiLocalCancel(requestId);
    const pending = this.pending;
    this.pending = null;
    if (pending !== null) pending.reject(new Error('İptal edildi'));
    this.patch({ status: 'idle', progress: null, error: null });
  }

  terminateWorker(): void {
    void window.api.aiLocalUnload();
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
      case 'done': {
        const pending = this.pending;
        this.pending = null;
        if (pending !== null) pending.resolve(event.text);
        this.finishRemote(event.text);
        break;
      }
      case 'error': {
        const pending = this.pending;
        this.pending = null;
        if (pending !== null) pending.reject(new Error(event.message));
        this.patch({ status: 'error', error: event.message });
        break;
      }
      case 'status': {
        const state = (event as unknown as { state?: string }).state;
        if (state === 'ready' || state === 'ok') {
          this.lastActivityAt = Date.now();
          this.patch({ status: 'idle', progress: null, error: null });
        } else if (state === 'loading') {
          this.patch({ status: 'loading', error: null });
        } else if (state === 'error') {
          this.patch({ status: 'error', error: (event as unknown as { message?: string }).message ?? 'Hata' });
        }
        break;
      }
      default:
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
