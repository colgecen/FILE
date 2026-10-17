import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

const api = {
  version: '0.1.0',
  glass: false,
  platform: 'linux',
  openFile: vi.fn().mockResolvedValue(null),
  openFolder: vi.fn().mockResolvedValue(null),
  readFile: vi.fn().mockResolvedValue(null),
  writeFile: vi.fn().mockResolvedValue({ ok: true, path: '' }),
  readDir: vi.fn().mockResolvedValue([]),
  gitBranch: vi.fn().mockResolvedValue(null),
  sysStart: vi.fn().mockResolvedValue(undefined),
  sysStop: vi.fn().mockResolvedValue(undefined),
  onMetrics: vi.fn(() => () => undefined),
  winMinimize: vi.fn().mockResolvedValue(true),
  winToggleMaximize: vi.fn().mockResolvedValue(true),
  appExit: vi.fn().mockResolvedValue(undefined),
  openInBrowser: vi.fn().mockResolvedValue('default'),
  onWindowFullscreen: vi.fn(() => () => undefined),
  onZenExternal: vi.fn(() => () => undefined),
  onEnvKey: vi.fn(() => () => undefined),
  zenEmbed: vi.fn().mockResolvedValue(true),
  zenLayout: vi.fn().mockResolvedValue(true),
  zenShow: vi.fn().mockResolvedValue(true),
  zenHide: vi.fn().mockResolvedValue(true),
  zenClose: vi.fn().mockResolvedValue(true),
  browserAdd: vi.fn().mockResolvedValue(true),
  browserActivate: vi.fn().mockResolvedValue(true),
  browserRemove: vi.fn().mockResolvedValue(true),
  browserNavigate: vi.fn().mockResolvedValue(true),
  browserBack: vi.fn().mockResolvedValue(true),
  browserForward: vi.fn().mockResolvedValue(true),
  browserReload: vi.fn().mockResolvedValue(true),
  browserLayout: vi.fn().mockResolvedValue(true),
  browserState: vi.fn().mockResolvedValue(null),
  browserOpenExternal: vi.fn().mockResolvedValue(true),
  onBrowserState: vi.fn(() => () => undefined),
  aiPing: vi.fn().mockResolvedValue({ ok: false, error: 'mock' }),
  aiModels: vi.fn().mockResolvedValue({ ok: true, models: [] }),
  aiLocalModels: vi.fn().mockResolvedValue({ ok: true, models: [] }),
  aiOpencodeModels: vi.fn().mockResolvedValue({ ok: false, models: [], error: 'mock' }),
  aiOllamaTags: vi.fn().mockResolvedValue({ ok: true, models: [] }),
  aiChatStart: vi.fn().mockResolvedValue({ started: true }),
  aiChatAbort: vi.fn().mockResolvedValue(undefined),
  onAiChatToken: vi.fn(() => () => undefined),
  onAiChatDone: vi.fn(() => () => undefined),
  onAiChatError: vi.fn(() => () => undefined),
  aiOpencodeChat: vi.fn().mockResolvedValue({ started: true }),
  onAiCliSession: vi.fn(() => () => undefined),
  aiKeyHas: vi.fn().mockResolvedValue({ present: false }),
  aiKeySet: vi.fn().mockResolvedValue({ ok: true }),
  aiKeyDelete: vi.fn().mockResolvedValue({ ok: true }),
  aiEnvScan: vi.fn().mockResolvedValue([]),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', { value: api, configurable: true });
}

afterEach(cleanup);