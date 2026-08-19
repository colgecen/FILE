import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../../electron/shared/api-types';
import { useIpcLifecycle } from './ipc';

const fakeApi = (): Pick<Api, 'onMetrics' | 'sysStart' | 'sysStop'> => ({
  onMetrics: () => () => undefined,
  sysStart: vi.fn().mockResolvedValue(undefined),
  sysStop: vi.fn().mockResolvedValue(undefined),
});

describe('useIpcLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mountta telemetriyi başlatır, unmountta durdurur', () => {
    const api = fakeApi();
    const { unmount } = renderHook(() => useIpcLifecycle(api));
    expect(api.sysStart).toHaveBeenCalledTimes(1);
    expect(api.sysStop).not.toHaveBeenCalled();
    unmount();
    expect(api.sysStop).toHaveBeenCalledTimes(1);
  });
});