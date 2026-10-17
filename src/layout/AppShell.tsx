import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useExitPending, exitController } from '../core/exit';
import { createCore, type Core } from '../core/instances';
import { useIpcLifecycle } from '../core/ipc';
import { openBrowserEnvironment, cycleEnvironment } from '../core/envCommands';
import { recentFiles } from '../core/recentFiles';
import { useSaveFlash } from '../core/saveSignal';
import { perfModel, usePerfPanelOpen, usePerfState } from '../core/perfModel';
import { useGitPanelState } from '../core/gitModel';
import { useTabsState } from '../core/tabs';
import { useEnvironmentsState } from '../core/environments';
import { useTerminalOpen } from '../core/terminalModel';
import { useViewMode } from '../core/viewMode';
import { MenuBar } from '../menus/MenuBar';
import { AIChatPanel } from '../ui/AIChatPanel';
import { Breadcrumb } from '../ui/Breadcrumb';
import { BrowserView } from '../ui/BrowserView';
import { ZenHost } from '../ui/ZenHost';
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
import { TerminalView } from '../terminal/TerminalView';
import { PerfSettings } from '../ui/SettingsPanel';
import '../styles/git.css';

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
  const gitState = useGitPanelState();
  const perf = usePerfState();
  const perfPanelOpen = usePerfPanelOpen();
  const envState = useEnvironmentsState();
  const browserEnvActive = envState.activeId !== null && envState.activeId.startsWith('browser:');
  const zenEnvActive = envState.activeId === 'browser:zen';
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  useEffect(() => window.api.onWindowFullscreen(setNativeFullscreen), []);
  const [zenNonce, setZenNonce] = useState(0);
  const [zenMenuPaused, setZenMenuPaused] = useState(false);
  useEffect(() => {
    if (!zenEnvActive) return undefined;
    // X child pencere DOM üstüne her zaman çizilir: açık bir açılır menü/palet varsa
    // zen'i geçici olarak ekran dışına al, kapanınca geri getir.
    const POPUPS = '.menu-panel, .command-hud, .perf-sheet, .help-overlay, [role="dialog"]';
    let popupOpen = false;
    const sync = (): void => {
      const node = document.querySelector<HTMLElement>(POPUPS);
      const now = node !== null;
      if (now === popupOpen) return;
      popupOpen = now;
      setZenMenuPaused(now);
      void (now ? window.api.zenHide() : window.api.zenShow());
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      setZenMenuPaused(false);
    };
  }, [zenEnvActive]);
  useEffect(() => window.api.onZenExternal(() => {
    // Dışarıdan başlatılan Zen algılandı: ortamı aç ve host'u yeniden bağla
    // (yeniden mount embed + resize zincirini kurar).
    void openBrowserEnvironment('zen');
    setZenNonce((n) => n + 1);
  }), []);
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
    viewMode.zen ? 'app-shell--zen' : '',
    nativeFullscreen ? 'app-shell--fullscreen' : '',
    glass ? 'glass' : '',
    perf.reducedMotion ? 'perf-reduced' : '',
    perf.liteFx ? 'perf-litefx' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <CoreContext.Provider value={core}>
      <div className={`app-backdrop${nativeFullscreen ? ' app-backdrop--fullscreen' : ''}`} aria-hidden="true" />
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
        {perfPanelOpen && (
          <div className="perf-sheet" role="dialog" aria-label="Performans ayarları">
            <PerfSettings />
          </div>
        )}
        <div className="app-shell__envbar">
          <EnvironmentsBar />
        </div>
        <div className="app-shell__workspace">
          {!browserEnvActive && <ExplorerView />}
          {gitState.isOpen && <GitPanel />}
          <div className="app-shell__main">
            <div className="app-shell__editor">
              {zenEnvActive ? (
                <ZenHost key={zenNonce} paused={zenMenuPaused} />
              ) : browserEnvActive ? (
                <BrowserView />
              ) : (
                <>
                  <TabBar />
                  <Breadcrumb />
                  <PaneManager file={activeFile} />
                </>
              )}
            </div>
            {terminalOpen && <TerminalView />}
          </div>
          <AIChatPanel />
          {children}
        </div>
        <StatusBar />
      </div>
    </CoreContext.Provider>
  );
}