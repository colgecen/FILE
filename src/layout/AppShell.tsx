import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useExitPending, exitController } from '../core/exit';
import { createCore, type Core } from '../core/instances';
import { useIpcLifecycle } from '../core/ipc';
import { recentFiles } from '../core/recentFiles';
import { useSaveFlash } from '../core/saveSignal';
import { useTabsState } from '../core/tabs';
import { MenuBar } from '../menus/MenuBar';
import { CommandHUD } from '../ui/CommandHUD';
import { ConfirmOverlay } from '../ui/ConfirmOverlay';
import { ErrorIndicator } from '../ui/ErrorIndicator';
import { ExplorerView } from '../ui/ExplorerView';
import { PaneManager } from '../ui/PaneManager';
import { StatusBar } from '../ui/StatusBar';
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
  const savedFlash = useSaveFlash();
  useIpcLifecycle(window.api);
  useEffect(() => recentFiles.attach(window.localStorage), []);
  useEffect(() => core.controller.attach(window), [core]);

  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const className = ['app-shell', savedFlash ? 'app-shell--saved' : '', glass ? 'glass' : '']
    .filter(Boolean)
    .join(' ');
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
        <StatusBar />
      </div>
    </CoreContext.Provider>
  );
}