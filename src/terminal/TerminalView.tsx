import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { TerminalLineBuffer } from './lineBuffer';
import { MockShell } from './mockShell';

const THEME = {
  background: '#03050a',
  foreground: '#ffffff',
  cursor: '#00d2ff',
  selectionBackground: 'rgba(0, 85, 255, 0.4)',
};

function promptFor(): string {
  return '\u001b[36m#\u001b[0m ';
}

export function TerminalView(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    return mountTerminal(host);
  }, []);

  return <div className="terminal-view__host" ref={hostRef} data-testid="terminal-view" />;
}

export function mountTerminal(host: HTMLDivElement): () => void {
  const terminal = new Terminal({
    theme: THEME,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontSize: 13,
    cursorBlink: true,
    cols: 80,
    rows: 12,
  });
  terminal.open(host);

  const shell = new MockShell();
  const line = new TerminalLineBuffer();
  let pendingOutput: string | null = null;

  const writePrompt = (): void => {
    terminal.write(promptFor());
  };
  const flushOutput = (): void => {
    const output = pendingOutput;
    pendingOutput = null;
    if (output !== null) {
      terminal.write(`${output}\r\n`);
    }
    writePrompt();
  };

  writePrompt();
  const disposable = terminal.onData((data) => {
    const { echoed, submitted } = line.feed(data);
    if (echoed.length > 0) terminal.write(echoed);
    if (submitted !== null) {
      terminal.write('\r\n');
      const result = shell.run(submitted);
      if (result.clear) {
        terminal.clear();
        pendingOutput = null;
        writePrompt();
        return;
      }
      pendingOutput = result.output.join('\r\n');
      flushOutput();
    }
  });

  return () => {
    disposable.dispose();
    terminal.dispose();
  };
}