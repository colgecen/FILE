import { useEffect, useState } from 'react';

export type Task = {
  readonly command: string;
  readonly label: string;
};

export class TaskModel {
  private lastTask: Task | null = null;
  private readonly listeners = new Set<() => void>();

  getLastTask(): Task | null {
    return this.lastTask;
  }

  setLastTask(task: Task): void {
    this.lastTask = task;
    this.emit();
  }

  clearLastTask(): void {
    this.lastTask = null;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const taskModel = new TaskModel();

export function useLastTask(): Task | null {
  const [task, setTask] = useState<Task | null>(() => taskModel.getLastTask());
  useEffect(() => taskModel.subscribe(() => setTask(taskModel.getLastTask())), []);
  return task;
}