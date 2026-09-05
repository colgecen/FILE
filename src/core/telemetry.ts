import { useEffect, useRef, useState } from 'react';
import type { Api, TelemetrySnapshot } from '../../electron/shared/api-types';
import { perfModel } from './perfModel';

const THROTTLE_MS = 500;
const THROTTLE_SLOW = 1000;

type TelemetryListener = (snapshot: TelemetrySnapshot) => void;

export class TelemetryStore {
  private latest: TelemetrySnapshot | null = null;
  private readonly listeners = new Set<TelemetryListener>();
  private unsubscribe: (() => void) | null = null;
  private lastEmittedAt = 0;

  start(windowApi: Pick<Api, 'onMetrics' | 'sysStart'>): void {
    if (this.unsubscribe !== null) return;
    if (!perfModel.getState().telemetry) return;
    const throttle = perfModel.getState().reducedMotion ? THROTTLE_SLOW : THROTTLE_MS;
    this.unsubscribe = windowApi.onMetrics((snapshot: TelemetrySnapshot) => {
      this.latest = snapshot;
      const now = Date.now();
      if (now - this.lastEmittedAt < throttle) return;
      this.lastEmittedAt = now;
      this.listeners.forEach((listener) => listener(snapshot));
    });
    void windowApi.sysStart();
  }

  stop(windowApi: Pick<Api, 'sysStop'>): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    void windowApi.sysStop();
  }

  reset(): void {
    this.latest = null;
    this.lastEmittedAt = 0;
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