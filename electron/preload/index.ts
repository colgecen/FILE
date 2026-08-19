import { contextBridge, ipcRenderer } from 'electron';
import { APP_VERSION, type Api } from '../shared/api-types';

const api: Api = {
  version: APP_VERSION,
  glass: process.env['TRANSPARENT'] === '1',
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:write-file', path, content),
  readDir: (path) => ipcRenderer.invoke('fs:read-dir', path),
  gitBranch: (path) => ipcRenderer.invoke('git:branch', path),
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
  appExit: () => ipcRenderer.invoke('app:exit'),
};

export type WindowApi = typeof api;

contextBridge.exposeInMainWorld('api', api);