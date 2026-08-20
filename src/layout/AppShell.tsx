import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useExitPending, exitController } from '../core/exit';
import { createCore, type Core } from '../core/instances';
import { useIpcLifecycle } from '../core/ipc';
import { recentFiles } from '../core/recentFiles';
import { useSaveFlash } from '../core/saveSignal';
import { useTabsState } from '../core/tabs';
import { useTerminalOpen } from '../core/terminalModel';
import { useViewMode } from '../core/viewMode';
import { MenuBar } from '../menus/MenuBar';
import { CommandHUD } from '../ui/CommandHUD';
import { ConfirmOverlay } from '../ui/ConfirmOverlay';
import { ErrorIndicator } from '../ui/ErrorIndicator';
import { ExplorerView } from '../ui/ExplorerView';
import { HelpOverlay } from '../ui/HelpOverlay';
import { PaneManager } from '../ui/PaneManager';
import { StatusBar } from '../ui/StatusBar';
import { TabBar } from '../ui/TabBar';
import { TerminalView } from '../terminal/TerminalView';

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
  const terminalOpen = useTerminalOpen();
  const viewMode = useViewMode();
  useIpcLifecycle(window.api);
  useEffect(() => recentFiles.attach(window.localStorage), []);
  useEffect(() => core.controller.attach(window), [core]);

  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const className = [
    'app-shell',
    savedFlash ? 'app-shell--saved' : '',
    viewMode.zen ? 'app-shell--zen' : '',
    glass ? 'glass' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <CoreContext.Provider value={core}>
      <div className={className}>
        <MenuBar />
        <ErrorIndicator />
        <CommandHUD />
        <HelpOverlay />
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
          {terminalOpen && <TerminalView />}
          {children}
        </div>
        <StatusBar />
      </div>
    </CoreContext.Provider>
  );
}