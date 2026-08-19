import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { createCore, type Core } from '../core/instances';
import { useIpcLifecycle } from '../core/ipc';
import { ErrorIndicator } from '../ui/ErrorIndicator';

const CoreContext = createContext<Core | null>(null);

export function useCore(): Core {
  const core = useContext(CoreContext);
  if (core === null) {
    throw new Error('Core bağlamı bulunamadı; AppShell içinde kullanılmalı');
  }
  return core;
}

export function AppShell({
  children,
  glass,
}: {
  children?: ReactNode;
  glass?: boolean;
}): React.JSX.Element {
  const core = useMemo(() => createCore(), []);
  useIpcLifecycle(window.api);
  useEffect(() => core.controller.attach(window), [core]);

  const className = glass ? 'app-shell glass' : 'app-shell';
  return (
    <CoreContext.Provider value={core}>
      <div className={className}>
        <ErrorIndicator />
        {children}
      </div>
    </CoreContext.Provider>
  );
}