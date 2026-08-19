import { ipcMain, type BrowserWindow } from 'electron';
import { cpus, freemem, totalmem } from 'node:os';
import type { TelemetrySnapshot } from '../shared/api-types';

const INTERVAL_MS = 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastCpuTimes: { idle: number; total: number } | null = null;

function cpuPercent(): number {
  const samples = cpus();
  let idle = 0;
  let total = 0;
  for (const sample of samples) {
    for (const times of Object.values(sample.times)) {
      total += times;
    }
    idle += sample.times.idle;
  }
  const now = { idle, total };
  if (lastCpuTimes === null) {
    lastCpuTimes = now;
    return 0;
  }
  const idleDelta = now.idle - lastCpuTimes.idle;
  const totalDelta = now.total - lastCpuTimes.total;
  lastCpuTimes = now;
  if (totalDelta <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)));
}

function snapshot(): TelemetrySnapshot {
  const memTotalMb = Math.round(totalmem() / (1024 * 1024));
  const memUsedMb = Math.round((totalmem() - freemem()) / (1024 * 1024));
  return {
    cpuPercent: cpuPercent(),
    memUsedMb,
    memTotalMb,
    platform: process.platform,
  };
}

function broadcast(getWindow: () => BrowserWindow | null): void {
  const window = getWindow();
  if (window && !window.isDestroyed()) {
    window.webContents.send('sys:metrics', snapshot());
  }
}

export function registerTelemetry(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('sys:start', async (): Promise<void> => {
    if (intervalId !== null) return;
    lastCpuTimes = null;
    intervalId = setInterval(() => broadcast(getWindow), INTERVAL_MS);
  });

  ipcMain.handle('sys:stop', async (): Promise<void> => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });
}