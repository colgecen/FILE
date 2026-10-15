import { useEffect } from 'react';
import type { Api } from '../../electron/shared/api-types';
import { perfModel } from './perfModel';
import { telemetryStore } from './telemetry';

export function useIpcLifecycle(api: Pick<Api, 'onMetrics' | 'sysStart' | 'sysStop'>): void {
  useEffect(() => {
    const sync = (): void => {
      if (perfModel.getState().telemetry) {
        telemetryStore.start(api);
      } else {
        telemetryStore.stop(api);
      }
    };
    sync();
    const unsubscribe = perfModel.subscribe(sync);
    return () => {
      unsubscribe();
      telemetryStore.stop(api);
    };
  }, [api]);
}