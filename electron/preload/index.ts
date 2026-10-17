import { contextBridge, ipcRenderer } from 'electron';
export type { EmbeddedState, EmbeddedLayout } from '../shared/api-types';
import { APP_VERSION, type Api } from '../shared/api-types';

const api: Api = {
  version: APP_VERSION,
  glass: process.env['TRANSPARENT'] === '1',
  platform: process.platform,
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  saveFileAs: (defaultPath) => ipcRenderer.invoke('dialog:save-as', defaultPath),
  readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:write-file', path, content),
  readDir: (path) => ipcRenderer.invoke('fs:read-dir', path),
  gitBranch: (path) => ipcRenderer.invoke('git:branch', path),
  gitStatus: (path) => ipcRenderer.invoke('git:status', path),
  gitDiff: (path, file) => ipcRenderer.invoke('git:diff', path, file),
  gitLog: (path, limit) => ipcRenderer.invoke('git:log', path, limit),
  gitCommit: (path, message) => ipcRenderer.invoke('git:commit', path, message),
  gitPush: (path) => ipcRenderer.invoke('git:push', path),
  gitPull: (path) => ipcRenderer.invoke('git:pull', path),
  gitCheckout: (path, branch) => ipcRenderer.invoke('git:checkout', path, branch),
  gitAdd: (path, files) => ipcRenderer.invoke('git:add', path, files),
  gitRestore: (path, files) => ipcRenderer.invoke('git:restore', path, files),
  sysStart: () => ipcRenderer.invoke('sys:start'),
  sysStop: () => ipcRenderer.invoke('sys:stop'),
  onMetrics: (listener) => {
    const handler = (_event: unknown, snapshot: Parameters<typeof listener>[0]): void => {
      listener(snapshot);
    };
    ipcRenderer.on('sys:metrics', handler);
    return () => {
      ipcRenderer.removeListener('sys:metrics', handler);
    };
  },
  setFullscreen: (enabled) => ipcRenderer.invoke('window:set-fullscreen', enabled),
  onWindowFullscreen: (listener) => {
    const handler = (_event: unknown, fullscreen: boolean): void => {
      listener(fullscreen);
    };
    ipcRenderer.on('window:fullscreen', handler);
    return () => {
      ipcRenderer.removeListener('window:fullscreen', handler);
    };
  },
  winMinimize: () => ipcRenderer.invoke('window:minimize'),
  winToggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  appExit: () => ipcRenderer.invoke('app:exit'),
  newWindow: () => ipcRenderer.invoke('app:new-window'),
  openInBrowser: (url, browser) => ipcRenderer.invoke('app:open-browser', url, browser),
  browserAdd: (envId) => ipcRenderer.invoke('browser:add', envId),
  browserActivate: (envId) => ipcRenderer.invoke('browser:activate', envId),
  browserRemove: (envId) => ipcRenderer.invoke('browser:remove', envId),
  browserNavigate: (envId, url) => ipcRenderer.invoke('browser:navigate', envId, url),
  browserBack: (envId) => ipcRenderer.invoke('browser:back', envId),
  browserForward: (envId) => ipcRenderer.invoke('browser:forward', envId),
  browserReload: (envId) => ipcRenderer.invoke('browser:reload', envId),
  browserLayout: (layout) => ipcRenderer.invoke('browser:layout', layout),
  browserState: (envId) => ipcRenderer.invoke('browser:state', envId),
  browserOpenExternal: (url) => ipcRenderer.invoke('browser:open-external', url),
  onBrowserState: (listener) => {
    const handler = (_event: unknown, state: Parameters<typeof listener>[0]): void => {
      listener(state);
    };
    ipcRenderer.on('browser:state', handler);
    return () => {
      ipcRenderer.removeListener('browser:state', handler);
    };
  },
  ptySpawn: (options) => ipcRenderer.invoke('pty:spawn', options),
  ptyWrite: (id, data) => ipcRenderer.invoke('pty:write', id, data),
  ptyResize: (id, cols, rows) => ipcRenderer.invoke('pty:resize', id, cols, rows),
  ptyKill: (id) => ipcRenderer.invoke('pty:kill', id),
  onPtyData: (listener) => {
    const handler = (_event: unknown, id: string, data: string): void => {
      listener(id, data);
    };
    ipcRenderer.on('pty:data', handler);
    return () => {
      ipcRenderer.removeListener('pty:data', handler);
    };
  },
  onPtyExit: (listener) => {
    const handler = (_event: unknown, id: string, exitCode: number): void => {
      listener(id, exitCode);
    };
    ipcRenderer.on('pty:exit', handler);
    return () => {
      ipcRenderer.removeListener('pty:exit', handler);
    };
  },
  aiPing: (baseUrl) => ipcRenderer.invoke('ai:ping', baseUrl),
  aiModels: (args) => ipcRenderer.invoke('ai:models', args),
  aiLocalModels: (provider) => ipcRenderer.invoke('ai:models:local', provider),
  aiOllamaTags: (origin) => ipcRenderer.invoke('ai:ollama:tags', origin),
  aiChatStart: (args) => ipcRenderer.invoke('ai:chat:start', args),
  aiChatAbort: (requestId) => ipcRenderer.invoke('ai:chat:abort', { requestId }),
  onAiChatToken: (listener) => {
    const handler = (_event: unknown, event: Parameters<typeof listener>[0]): void => {
      listener(event);
    };
    ipcRenderer.on('ai:chat:token', handler);
    return () => {
      ipcRenderer.removeListener('ai:chat:token', handler);
    };
  },
  onAiChatDone: (listener) => {
    const handler = (_event: unknown, event: Parameters<typeof listener>[0]): void => {
      listener(event);
    };
    ipcRenderer.on('ai:chat:done', handler);
    return () => {
      ipcRenderer.removeListener('ai:chat:done', handler);
    };
  },
  onAiChatError: (listener) => {
    const handler = (_event: unknown, event: Parameters<typeof listener>[0]): void => {
      listener(event);
    };
    ipcRenderer.on('ai:chat:error', handler);
    return () => {
      ipcRenderer.removeListener('ai:chat:error', handler);
    };
  },
  aiOpencodeModels: () => ipcRenderer.invoke('ai:opencode:models'),
  aiOpencodeChat: (args) => ipcRenderer.invoke('ai:opencode:chat', args),
  onAiCliSession: (listener) => {
    const handler = (_event: unknown, event: Parameters<typeof listener>[0]): void => {
      listener(event);
    };
    ipcRenderer.on('ai:cli:session', handler);
    return () => {
      ipcRenderer.removeListener('ai:cli:session', handler);
    };
  },
  aiKeyHas: (provider) => ipcRenderer.invoke('ai:key:has', provider),
  aiKeySet: (args) => ipcRenderer.invoke('ai:key:set', args),
  aiKeyDelete: (args) => ipcRenderer.invoke('ai:key:delete', args),
  aiEnvScan: (candidates) => ipcRenderer.invoke('ai:env:scan', candidates),
};

export type WindowApi = typeof api;

contextBridge.exposeInMainWorld('api', api);