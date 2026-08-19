import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const api = {
  version: '0.1.0',
  glass: false,
  openFile: vi.fn().mockResolvedValue(null),
  openFolder: vi.fn().mockResolvedValue(null),
  readFile: vi.fn().mockResolvedValue(null),
  writeFile: vi.fn().mockResolvedValue({ ok: true, path: '' }),
  readDir: vi.fn().mockResolvedValue([]),
  gitBranch: vi.fn().mockResolvedValue(null),
  sysStart: vi.fn().mockResolvedValue(undefined),
  sysStop: vi.fn().mockResolvedValue(undefined),
  onMetrics: vi.fn(() => () => undefined),
  appExit: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, 'api', { value: api, configurable: true });