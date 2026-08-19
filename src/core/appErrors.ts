type AppError = {
  readonly id: string;
  readonly message: string;
  readonly at: number;
};

type AppErrorListener = (error: AppError) => void;

const listeners = new Set<AppErrorListener>();

export function reportError(message: string, id?: string): void {
  const error: AppError = {
    id: id ?? `err-${Date.now()}`,
    message,
    at: Date.now(),
  };
  listeners.forEach((listener) => listener(error));
}

export function onAppError(listener: AppErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}