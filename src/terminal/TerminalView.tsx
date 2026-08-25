import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { setActivePtyId, getActivePtyId } from '../core/terminalRegistry';

const THEME = {
  background: '#03050a',
  foreground: '#ffffff',
  cursor: '#00d2ff',
  selectionBackground: 'rgba(0, 85, 255, 0.4)',
};

function generatePtyId(): string {
  return `pty-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function TerminalView(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const disposeDataRef = useRef<(() => void) | null>(null);
  const disposeExitRef = useRef<(() => void) | null>(null);
  const colsRef = useRef<number>(80);
  const rowsRef = useRef<number>(24);
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    return mountTerminal(host);
  }, []);

  return <div className="terminal-view__host" ref={hostRef} data-testid="terminal-view" />;

  function mountTerminal(host: HTMLDivElement): () => void {
    if (initializedRef.current) {
      return () => {};
    }
    initializedRef.current = true;

    const terminal = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      cursorBlink: true,
      cols: colsRef.current,
      rows: rowsRef.current,
    });
    terminal.open(host);
    terminalRef.current = terminal;

    const ptyId = generatePtyId();
    ptyIdRef.current = ptyId;

    const cols = colsRef.current;
    const rows = rowsRef.current;

    const api = window.api;
    if (!api) {
      console.warn('window.api not available; terminal running in mock mode');
      return () => {
        terminal.dispose();
      };
    }

    api.ptySpawn({ cols, rows }).then((result: { id: string } | null) => {
      if (result && result.id) {
        ptyIdRef.current = result.id;
        setActivePtyId(result.id);
      }
    });

    const handleData = (id: string, data: string): void => {
      if (id === ptyIdRef.current) {
        terminal.write(data);
      }
    };

    const handleExit = (id: string, exitCode: number): void => {
      if (id === ptyIdRef.current) {
        terminal.write(`\r\n[Process exited with code ${exitCode}]\r\n`);
        cleanup();
      }
    };

    disposeDataRef.current = api.onPtyData(handleData);
    disposeExitRef.current = api.onPtyExit(handleExit);

    const handleResize = ({ cols: newCols, rows: newRows }: { cols: number; rows: number }): void => {
      colsRef.current = newCols;
      rowsRef.current = newRows;
      const currentPtyId = ptyIdRef.current;
      if (currentPtyId) {
        api.ptyResize(currentPtyId, newCols, newRows);
      }
    };
    terminal.onResize(handleResize);

    const handleDataFromTerminal = (data: string): void => {
      const currentPtyId = ptyIdRef.current;
      if (currentPtyId) {
        api.ptyWrite(currentPtyId, data);
      }
    };
    const disposableData = terminal.onData(handleDataFromTerminal);

    const cleanup = (): void => {
      const currentPtyId = ptyIdRef.current;
      if (currentPtyId) {
        api.ptyKill(currentPtyId);
      }
      if (currentPtyId === getActivePtyId()) {
        setActivePtyId(null);
      }
      if (disposeDataRef.current) {
        disposeDataRef.current();
        disposeDataRef.current = null;
      }
      if (disposeExitRef.current) {
        disposeExitRef.current();
        disposeExitRef.current = null;
      }
      disposableData.dispose();
      terminal.dispose();
      terminalRef.current = null;
      initializedRef.current = false;
    };

    return cleanup;
  }
}