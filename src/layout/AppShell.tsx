import { createContext, memo, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useExitPending, exitController } from '../core/exit';
import { createCore, type Core } from '../core/instances';
import { useIpcLifecycle } from '../core/ipc';
import { cycleEnvironment } from '../core/envCommands';
import { recentFiles } from '../core/recentFiles';
import { useSaveFlash } from '../core/saveSignal';
import { perfModel, usePerfPanelOpen, usePerfState } from '../core/perfModel';
import { useGitPanelState } from '../core/gitModel';
import { useTabsState } from '../core/tabs';
import { useEnvironmentsState } from '../core/environments';
import { MenuBar } from '../menus/MenuBar';
import { AIChatPanel } from '../ui/AIChatPanel';
import { Breadcrumb } from '../ui/Breadcrumb';
import { BrowserView } from '../ui/BrowserView';
import { CommandHUD } from '../ui/CommandHUD';
import { ConfirmOverlay } from '../ui/ConfirmOverlay';
import { EnvironmentsBar } from '../ui/EnvironmentsBar';
import { ErrorIndicator } from '../ui/ErrorIndicator';
import { ExplorerView } from '../ui/ExplorerView';
import { GitPanel } from '../ui/GitPanel';
import { HelpOverlay } from '../ui/HelpOverlay';
import { PaneManager } from '../ui/PaneManager';
import { StatusBar } from '../ui/StatusBar';
import { TabBar } from '../ui/TabBar';
import { TerminalDock } from '../terminal/TerminalDock';
import { PerfSettings } from '../ui/SettingsPanel';
import '../styles/git.css';

const CoreContext = createContext<Core | null>(null);

// These panels subscribe to their own stores. Memoizing them keeps tab clicks
// and explorer navigation from re-rendering the whole shell.
const MemoMenuBar = memo(MenuBar);
const MemoErrorIndicator = memo(ErrorIndicator);
const MemoCommandHUD = memo(CommandHUD);
const MemoHelpOverlay = memo(HelpOverlay);
const MemoEnvironmentsBar = memo(EnvironmentsBar);
const MemoExplorerView = memo(ExplorerView);
const MemoGitPanel = memo(GitPanel);
const MemoAIChatPanel = memo(AIChatPanel);
const MemoTerminalDock = memo(TerminalDock);
const MemoStatusBar = memo(StatusBar);
const MemoBrowserView = memo(BrowserView);
const MemoTabBar = memo(TabBar);
const MemoBreadcrumb = memo(Breadcrumb);

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
  const gitState = useGitPanelState();
  const perf = usePerfState();
  const perfPanelOpen = usePerfPanelOpen();
  const envState = useEnvironmentsState();
  const browserEnvActive = envState.activeId !== null && envState.activeId.startsWith('browser:');
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  useEffect(() => window.api.onWindowFullscreen(setNativeFullscreen), []);
  useEffect(() => window.api.onEnvKey((delta: number) => {
    void cycleEnvironment(delta < 0 ? -1 : 1);
  }), []);
  useIpcLifecycle(window.api);
  useEffect(() => perfModel.init(), []);
  useEffect(() => recentFiles.attach(window.localStorage), []);
  useEffect(() => core.controller.attach(window), [core]);

  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const className = [
    'app-shell',
    savedFlash ? 'app-shell--saved' : '',
    nativeFullscreen ? 'app-shell--fullscreen' : '',
    glass ? 'glass' : '',
    perf.reducedMotion ? 'perf-reduced' : '',
    perf.liteFx ? 'perf-litefx' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <CoreContext.Provider value={core}>
      <div className={className}>
        <MemoMenuBar />
        <MemoErrorIndicator />
        <MemoCommandHUD />
        <MemoHelpOverlay />
        {exitPending && (
          <ConfirmOverlay
            message="Kaydedilmemiş değişiklikler var. Kapatılsın mı?"
            confirmLabel="Onayla"
            onConfirm={() => exitController.confirm()}
            onCancel={() => exitController.cancel()}
          />
        )}
        {perfPanelOpen && (
          <div className="perf-sheet" role="dialog" aria-label="Performans ayarları">
            <PerfSettings />
          </div>
        )}
        <div className="app-shell__envbar">
          <MemoEnvironmentsBar />
        </div>
        <div className="app-shell__workspace">
          {!browserEnvActive && <MemoExplorerView />}
          {gitState.isOpen && <MemoGitPanel />}
          <div className="app-shell__main">
            <div className="app-shell__editor">
              {browserEnvActive ? (
                <MemoBrowserView />
              ) : (
                <>
                  <MemoTabBar />
                  <MemoBreadcrumb />
                  <PaneManager file={activeFile} />
                </>
              )}
            </div>
            <MemoTerminalDock />
          </div>
          <MemoAIChatPanel />
          {children}
        </div>
        <MemoStatusBar />
      </div>
    </CoreContext.Provider>
  );
}