import { useEffect, useState } from 'react';
import type { ChatMessage } from './types';

export type ChatSession = {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly ChatMessage[];
  readonly updatedAt: number;
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

  create(): string {
    const id = nextId();
    const now = Date.now();
    this.sessions = [...this.sessions, { id, title: 'Yeni sohbet', messages: [], updatedAt: now }];
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
