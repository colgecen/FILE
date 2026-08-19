import { useEffect, useRef, useState } from 'react';
import type { TelemetrySnapshot } from '../../electron/shared/api-types';

const THROTTLE_MS = 500;

type TelemetryListener = (snapshot: TelemetrySnapshot) => void;

export class TelemetryStore {
  private latest: TelemetrySnapshot | null = null;
  private readonly listeners = new Set<TelemetryListener>();
  private unsubscribe: (() => void) | null = null;
  private lastEmittedAt = 0;

  start(windowApi: Pick<typeof window.api, 'onMetrics' | 'sysStart'>): void {
    if (this.unsubscribe !== null) return;
    this.unsubscribe = windowApi.onMetrics((snapshot) => {
      this.latest = snapshot;
      const now = Date.now();
      if (now - this.lastEmittedAt < THROTTLE_MS) return;
      this.lastEmittedAt = now;
      this.listeners.forEach((listener) => listener(snapshot));
    });
    void windowApi.sysStart();
  }

  stop(windowApi: Pick<typeof window.api, 'sysStop'>): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    void windowApi.sysStop();
  }

  getLatest(): TelemetrySnapshot | null {
    return this.latest;
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const telemetryStore = new TelemetryStore();

export function useTelemetry(): TelemetrySnapshot | null {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(telemetryStore.getLatest());
  const latestRef = useRef(snapshot);

  useEffect(() => {
    const unsubscribe = telemetryStore.subscribe((s) => {
      latestRef.current = s;
      setSnapshot(s);
    });
    return unsubscribe;
  }, []);

  return snapshot;
}