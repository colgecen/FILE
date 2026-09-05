import { contextBridge, ipcRenderer } from 'electron';
import { APP_VERSION, type Api } from '../shared/api-types';

const api: Api = {
  version: APP_VERSION,
  glass: process.env['TRANSPARENT'] === '1',
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
  appExit: () => ipcRenderer.invoke('app:exit'),
  newWindow: () => ipcRenderer.invoke('app:new-window'),
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
};

export type WindowApi = typeof api;

contextBridge.exposeInMainWorld('api', api);