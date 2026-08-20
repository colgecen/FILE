import { useEffect, useState } from 'react';

export class AIChatModel {
  private isOpenState = false;
  private draft = '';
  private readonly listeners = new Set<() => void>();

  isOpen(): boolean {
    return this.isOpenState;
  }

  getDraft(): string {
    return this.draft;
  }

  setDraft(value: string): void {
    this.draft = value;
    this.emit();
  }

  open(): void {
    this.isOpenState = true;
    this.emit();
  }

  close(): void {
    this.isOpenState = false;
    this.emit();
  }

  toggle(): void {
    this.isOpenState = !this.isOpenState;
    this.emit();
  }

  reset(): void {
    this.isOpenState = false;
    this.draft = '';
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

export const aiChatModel = new AIChatModel();

export function useAIChat(): { open: boolean; draft: string } {
  const [state, setState] = useState(() => ({
    open: aiChatModel.isOpen(),
    draft: aiChatModel.getDraft(),
  }));
  useEffect(
    () =>
      aiChatModel.subscribe(() =>
        setState({ open: aiChatModel.isOpen(), draft: aiChatModel.getDraft() }),
      ),
    [],
  );
  return state;
}