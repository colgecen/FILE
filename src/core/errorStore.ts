import { useEffect, useState } from 'react';
import { onAppError } from './appErrors';

export type ErrorRecord = {
  readonly id: string;
  readonly message: string;
  readonly at: number;
};

const MAX_RECORDS = 5;

export class ErrorStore {
  private records: readonly ErrorRecord[] = [];
  private readonly listeners = new Set<() => void>();

  constructor() {
    onAppError((error) => {
      this.records = [error, ...this.records].slice(0, MAX_RECORDS);
      this.emit();
    });
  }

  getRecords(): readonly ErrorRecord[] {
    return this.records;
  }

  clear(): void {
    if (this.records.length === 0) return;
    this.records = [];
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

export const errorStore = new ErrorStore();

export function useErrorStore(): readonly ErrorRecord[] {
  const [records, setRecords] = useState<readonly ErrorRecord[]>(() => errorStore.getRecords());
  useEffect(() => errorStore.subscribe(() => setRecords(errorStore.getRecords())), []);
  return records;
}