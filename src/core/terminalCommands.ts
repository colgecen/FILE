import type { CommandDef, CommandResult } from './types';
import { terminalModel } from './terminalModel';
import { taskModel, type Task } from './taskModel';
import { writeToActiveTerminal } from './terminalRegistry';

const COMMON_TASKS: readonly Task[] = [
  { command: 'npm run dev\n', label: 'npm run dev' },
  { command: 'npm run build\n', label: 'npm run build' },
  { command: 'npm test\n', label: 'npm test' },
  { command: 'npm run lint\n', label: 'npm run lint' },
  { command: 'npm run typecheck\n', label: 'npm run typecheck' },
];

function runTaskInTerminal(task: Task): boolean {
  const success = writeToActiveTerminal(task.command);
  if (success) {
    taskModel.setLastTask(task);
  }
  return success;
}

function createTaskCommand(task: Task, register: (command: CommandDef) => void): void {
  register({
    id: `task.${task.label.replace(/\s+/g, '.')}`,
    category: 'terminal',
    title: `Görev: ${task.label}`,
    run: (): CommandResult => {
      const success = runTaskInTerminal(task);
      return success ? { ok: true } : { ok: false, error: 'Aktif terminal bulunamadı' };
    },
  });
}

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
    id: 'terminal.split',
    category: 'terminal',
    title: 'Terminali Böl',
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
  register({
    id: 'terminal.task.run',
    category: 'terminal',
    title: 'Görev Çalıştır',
    run: (): CommandResult => {
      return { ok: true };
    },
  });
  register({
    id: 'terminal.task.last',
    category: 'terminal',
    title: 'Son Görevi Tekrarla',
    run: (): CommandResult => {
      const lastTask = taskModel.getLastTask();
      if (!lastTask) {
        return { ok: false, error: 'Çalıştırılacak önceki görev yok' };
      }
      const success = runTaskInTerminal(lastTask);
      return success ? { ok: true } : { ok: false, error: 'Aktif terminal bulunamadı' };
    },
  });

  for (const task of COMMON_TASKS) {
    createTaskCommand(task, register);
  }
}