import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useExitPending, exitController } from '../core/exit';
import { createCore, type Core } from '../core/instances';
import { useIpcLifecycle } from '../core/ipc';
import { useTabsState } from '../core/tabs';
import { MenuBar } from '../menus/MenuBar';
import { CommandHUD } from '../ui/CommandHUD';
import { ConfirmOverlay } from '../ui/ConfirmOverlay';
import { ErrorIndicator } from '../ui/ErrorIndicator';
import { ExplorerView } from '../ui/ExplorerView';
import { PaneManager } from '../ui/PaneManager';
import { TabBar } from '../ui/TabBar';

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
  const exitPending = useExitPending();
  const { tabs, activeId } = useTabsState();
  useIpcLifecycle(window.api);
  useEffect(() => core.controller.attach(window), [core]);

  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const className = glass ? 'app-shell glass' : 'app-shell';
  return (
    <CoreContext.Provider value={core}>
      <div className={className}>
        <MenuBar />
        <ErrorIndicator />
        <CommandHUD />
        {exitPending && (
          <ConfirmOverlay
            message="Kaydedilmemiş değişiklikler var. Kapatılsın mı?"
            confirmLabel="Onayla"
            onConfirm={() => exitController.confirm()}
            onCancel={() => exitController.cancel()}
          />
        )}
        <div className="app-shell__tabbar">
          <TabBar />
        </div>
        <div className="app-shell__workspace">
          <ExplorerView />
          <PaneManager file={activeFile} />
          {children}
        </div>
      </div>
    </CoreContext.Provider>
  );
}