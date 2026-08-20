import type { AIStatus, AIPhase } from './types';

export function statusLabel(status: AIStatus): string {
  switch (status) {
    case 'idle':
      return 'Boşta';
    case 'loading':
      return 'Yükleniyor';
    case 'computing':
      return 'Hesaplanıyor';
    case 'error':
      return 'Hata';
  }
}

export function phaseLabel(phase: AIPhase): string {
  switch (phase) {
    case 'idle':
      return 'Hazır';
    case 'downloading':
      return 'İndiriliyor';
    case 'loading-model':
      return 'Model yükleniyor';
    case 'generating':
      return 'Üretiliyor';
  }
}

export function progressPercent(loaded: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((loaded / total) * 100));
}

export function tokenSpeedText(tokensPerSecond: number): string {
  return `${tokensPerSecond.toFixed(1)} tok/s`;
}