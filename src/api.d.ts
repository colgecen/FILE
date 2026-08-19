import type { WindowApi } from '../../electron/preload/index';

declare global {
  interface Window {
    readonly api: WindowApi;
  }
}

export {};
