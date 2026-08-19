import { contextBridge } from 'electron';
import { API_PLACEHOLDER } from '../shared/api-types.ts';

const api = {
  ...API_PLACEHOLDER,
};

export type WindowApi = typeof api;

contextBridge.exposeInMainWorld('api', api);
