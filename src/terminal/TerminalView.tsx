import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { setActivePtyId, getActivePtyId } from '../core/terminalRegistry';

const THEME = {
  background: '#121317',
  foreground: '#f5f5f7',
  cursor: '#ffffff',
  cursorAccent: '#121317',
  selectionBackground: 'rgba(255, 255, 255, 0.32)',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: 'rgba(255, 255, 255, 0.18)',
  green: '#4ade80',
  brightGreen: '#86efac',
};

export type TerminalViewProps = {
  readonly cwd: string | null;
  readonly active: boolean;
};

export function TerminalView({ cwd, active }: TerminalViewProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const ptyIdRef = useRef<string | null>(null);
  activeRef.current = active;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    return mountTerminal(host);
  }, []);

  useEffect(() => {
    if (!active || ptyIdRef.current === null) return;
    setActivePtyId(ptyIdRef.current);
  }, [active]);

  return <div className="terminal-view__host" ref={hostRef} data-testid="terminal-view" />;

  function mountTerminal(host: HTMLDivElement): () => void {
    const terminal = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      cursorBlink: false,
      cursorStyle: 'block',
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);

    const cleanupFlags = { data: null as (() => void) | null, exit: null as (() => void) | null };
    let disposed = false;
    let resizeFrame = 0;

    const safeFit = (): void => {
      if (disposed) return;
      const rect = host.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24) return;
      try {
        fit.fit();
      } catch {
        // görünmeyen panelde boyut hesaplanamaz; görününce tekrar denenir
      }
    };

    const api = window.api;
    if (!api) {
      console.warn('window.api not available; terminal running in mock mode');
      return () => {
        terminal.dispose();
        fit.dispose();
      };
    }

    requestAnimationFrame(safeFit);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (resizeFrame !== 0) return;
            resizeFrame = window.requestAnimationFrame(() => {
              resizeFrame = 0;
              safeFit();
            });
          });
    observer?.observe(host);

    const spawnOptions = {
      cols: Math.max(20, terminal.cols),
      rows: Math.max(5, terminal.rows),
      ...(cwd === null ? {} : { cwd }),
    };
    void api.ptySpawn(spawnOptions).then((result: { id: string } | null) => {
      if (disposed || result === null) return;
      ptyIdRef.current = result.id;
      if (activeRef.current) setActivePtyId(result.id);
    });

    const handleData = (id: string, data: string): void => {
      if (id === ptyIdRef.current) terminal.write(data);
    };

    const handleExit = (id: string, exitCode: number): void => {
      if (id !== ptyIdRef.current) return;
      terminal.write(`\r\n[Process exited with code ${exitCode}]\r\n`);
    };

    cleanupFlags.data = api.onPtyData(handleData);
    cleanupFlags.exit = api.onPtyExit(handleExit);

    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      const current = ptyIdRef.current;
      if (current !== null) void api.ptyResize(current, cols, rows);
    });

    const dataDisposable = terminal.onData((data) => {
      const current = ptyIdRef.current;
      if (current !== null) void api.ptyWrite(current, data);
    });

    return () => {
      disposed = true;
      if (resizeFrame !== 0) window.cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      const current = ptyIdRef.current;
      if (current !== null) {
        void api.ptyKill(current);
        if (current === getActivePtyId()) setActivePtyId(null);
      }
      ptyIdRef.current = null;
      cleanupFlags.data?.();
      cleanupFlags.exit?.();
      resizeDisposable.dispose();
      dataDisposable.dispose();
      fit.dispose();
      terminal.dispose();
    };
  }
}
