import { useEffect } from 'react';
import type { Api } from '../../electron/shared/api-types';
import { telemetryStore } from './telemetry';

export function useIpcLifecycle(api: Pick<Api, 'onMetrics' | 'sysStart' | 'sysStop'>): void {
  useEffect(() => {
    telemetryStore.start(api);
    return () => {
      telemetryStore.stop(api);
    };
  }, [api]);
}