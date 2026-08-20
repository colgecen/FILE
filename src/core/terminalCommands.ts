import type { CommandDef, CommandResult } from './types';
import { terminalModel } from './terminalModel';

export function registerTerminalCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'file.new.terminal',
    category: 'terminal',
    title: 'Yeni Terminal',
    run: (): CommandResult => {
      terminalModel.open();
      return { ok: true };
    },
  });
  register({
    id: 'terminal.kill',
    category: 'terminal',
    title: 'Terminali Kapat',
    run: (): CommandResult => {
      terminalModel.close();
      return { ok: true };
    },
  });
}