import { useEffect, useState } from 'react';
import { DEFAULT_EFFORT, DEFAULT_MODE, type EffortLevel, type PlanMode } from './modes';
import type { ChatMessage } from './types';

export type ChatSession = {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly ChatMessage[];
  readonly mode: PlanMode;
  readonly effort: EffortLevel;
  readonly updatedAt: number;
  readonly envId: string | null;
};

export type SessionsSnapshot = {
  readonly sessions: readonly ChatSession[];
  readonly activeId: string | null;
};

let counter = 0;

function nextId(): string {
  counter += 1;
  return `session-${Date.now()}-${counter}`;
}

function titleOf(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'Yeni sohbet';
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}…` : trimmed;
}

/** AI başlık yanıtını sekme adına uygun hale getirir. */
export function sanitizeTitle(text: string): string {
  const single = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`«»\s]+/, '')
    .replace(/["'`«»\s]+$/, '')
    .replace(/[.!?,;:]+$/, '')
    .trim();
  if (single.length === 0) return '';
  return single.length > 32 ? `${single.slice(0, 32).trimEnd()}…` : single;
}

export class SessionStore {
  private sessions: ChatSession[] = [];
  private activeId: string | null = null;
  private readonly listeners = new Set<() => void>();

  getSnapshot(): SessionsSnapshot {
    return { sessions: this.sessions, activeId: this.activeId };
  }

  active(): ChatSession | null {
    return this.sessions.find((session) => session.id === this.activeId) ?? null;
  }

  /** Aktif yoksa açar ve id döner; akış sürerken (busy) yeni açmaz. */
  ensure(busy: boolean): string | null {
    if (this.activeId !== null) return this.activeId;
    if (busy) return null;
    return this.create();
  }

  create(envId: string | null = null): string {
    const id = nextId();
    const now = Date.now();
    this.sessions = [
      ...this.sessions,
      {
        id,
        title: 'Yeni sohbet',
        messages: [],
        mode: DEFAULT_MODE,
        effort: DEFAULT_EFFORT,
        updatedAt: now,
        envId,
      },
    ];
    this.activeId = id;
    this.emit();
    return id;
  }

  /** Akış sürerken geçiş engellenir ki tokenlar yanlış sekmeye düşmesin. */
  switch(id: string, busy: boolean): boolean {
    if (busy) return false;
    if (!this.sessions.some((session) => session.id === id)) return false;
    if (this.activeId === id) return true;
    this.activeId = id;
    this.emit();
    return true;
  }

  findForEnv(envId: string): ChatSession | null {
    return this.sessions.find((session) => session.envId === envId) ?? null;
  }

  bindEnv(id: string, envId: string | null): boolean {
    if (!this.sessions.some((session) => session.id === id)) return false;
    this.sessions = this.sessions.map((session) =>
      session.id === id ? { ...session, envId, updatedAt: Date.now() } : session,
    );
    this.emit();
    return true;
  }

  /**
   * Proje ortamına ait sohbete geçiş: bağlı oturum varsa ona atlar,
   * aktif oturum dokunulmamış boş bir sohbetse ona bağlar, yoksa yeni bağlar.
   * Akış sürüyorsa (busy) hiçbir şey yapmaz.
   */
  activateForEnv(envId: string, busy: boolean): string | null {
    if (busy) return null;
    const existing = this.findForEnv(envId);
    if (existing !== null) {
      if (this.activeId !== existing.id) {
        this.activeId = existing.id;
        this.emit();
      }
      return existing.id;
    }
    const active = this.active();
    if (active !== null && active.envId === null && active.messages.length === 0) {
      this.bindEnv(active.id, envId);
      return active.id;
    }
    return this.create(envId);
  }

  close(id: string, busy: boolean): boolean {
    if (busy) return false;
    if (!this.sessions.some((session) => session.id === id)) return false;
    this.sessions = this.sessions.filter((session) => session.id !== id);
    if (this.activeId === id) {
      this.activeId = this.sessions[this.sessions.length - 1]?.id ?? null;
    }
    this.emit();
    return true;
  }

  saveMessages(id: string, messages: readonly ChatMessage[]): void {
    this.sessions = this.sessions.map((session) =>
      session.id === id ? { ...session, messages: [...messages], updatedAt: Date.now() } : session,
    );
    this.emit();
  }

  retitleFrom(id: string, firstUserMessage: string): void {
    this.sessions = this.sessions.map((session) =>
      session.id === id && session.title === 'Yeni sohbet'
        ? { ...session, title: titleOf(firstUserMessage), updatedAt: Date.now() }
        : session,
    );
    this.emit();
  }

  /** AI üretimi başlığı uygular; boş/geçersiz başlık yok sayılır. */
  setTitle(id: string, title: string): boolean {
    const clean = sanitizeTitle(title);
    if (clean.length === 0) return false;
    if (!this.sessions.some((session) => session.id === id)) return false;
    this.sessions = this.sessions.map((session) =>
      session.id === id ? { ...session, title: clean, updatedAt: Date.now() } : session,
    );
    this.emit();
    return true;
  }

  setMode(id: string, mode: PlanMode): boolean {
    if (!this.sessions.some((session) => session.id === id)) return false;
    this.sessions = this.sessions.map((session) =>
      session.id === id ? { ...session, mode, updatedAt: Date.now() } : session,
    );
    this.emit();
    return true;
  }

  setEffort(id: string, effort: EffortLevel): boolean {
    if (!this.sessions.some((session) => session.id === id)) return false;
    this.sessions = this.sessions.map((session) =>
      session.id === id ? { ...session, effort, updatedAt: Date.now() } : session,
    );
    this.emit();
    return true;
  }

  reset(): void {
    this.sessions = [];
    this.activeId = null;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const sessionStore = new SessionStore();

export function useSessions(): SessionsSnapshot {
  const [snapshot, setSnapshot] = useState<SessionsSnapshot>(() => sessionStore.getSnapshot());
  useEffect(() => sessionStore.subscribe(() => setSnapshot(sessionStore.getSnapshot())), []);
  return snapshot;
}
