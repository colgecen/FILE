import { WebContentsView, ipcMain, shell, type BrowserWindow } from 'electron';

export type EmbeddedState = {
  readonly envId: string;
  readonly url: string;
  readonly title: string;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
};

type Layout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const HOME_URL = 'https://www.google.com';

const views = new Map<string, WebContentsView>();
let layout: Layout | null = null;
let activeView: WebContentsView | null = null;
let getWindow: () => BrowserWindow | null = () => null;
let push: ((state: EmbeddedState) => void) | null = null;

function stateOf(envId: string): EmbeddedState | null {
  const view = views.get(envId);
  if (view === undefined) return null;
  const wc = view.webContents;
  return {
    envId,
    url: wc.getURL(),
    title: wc.getTitle(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
  };
}

function bind(envId: string, view: WebContentsView): void {
  const wc = view.webContents;
  const emit = (): void => {
    const state = stateOf(envId);
    if (state !== null && push !== null) push(state);
  };
  wc.on('did-navigate', emit);
  wc.on('did-navigate-in-page', emit);
  wc.on('page-title-updated', emit);
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void wc.loadURL(url);
    return { action: 'deny' };
  });
  wc.on('render-process-gone', () => {
    if (activeView === view) view.setVisible(false);
  });
}

function show(envId: string | null): void {
  const win = getWindow();
  if (win === null) return;
  const next = envId === null ? null : views.get(envId) ?? null;
  if (activeView !== null && activeView !== next) {
    activeView.setVisible(false);
  }
  activeView = next;
  if (activeView !== null && layout !== null && layout.width > 1 && layout.height > 1) {
    activeView.setBounds(layout);
    activeView.setVisible(true);
  } else if (activeView !== null) {
    activeView.setVisible(false);
  }
}

function applyLayout(): void {
  if (activeView !== null && layout !== null && layout.width > 1 && layout.height > 1) {
    activeView.setBounds(layout);
    activeView.setVisible(true);
  }
}

export function registerEmbeddedBrowser(
  getWin: () => BrowserWindow | null,
  pushState: (state: EmbeddedState) => void,
): void {
  getWindow = getWin;
  push = pushState;

  ipcMain.handle('browser:add', (_event, envId: string, url?: string): Promise<boolean> => {
    const id = String(envId);
    if (!views.has(id)) {
      const view = new WebContentsView({
        webPreferences: { sandbox: true, contextIsolation: true, partition: `persist:${id}` },
      });
      bind(id, view);
      getWindow()?.contentView.addChildView(view);
      view.setVisible(false);
      views.set(id, view);
      // Yeni sekmede: env browserUrl'i varsa onu aç, yoksa başlangıç sayfası.
      const target = typeof url === 'string' ? url.trim() : '';
      void view.webContents.loadURL(target.length > 0 ? target : HOME_URL);
    }
    show(id);
    return Promise.resolve(true);
  });

  ipcMain.handle('browser:activate', (_event, envId: string | null): boolean => {
    show(envId === null ? null : String(envId));
    return true;
  });

  ipcMain.handle('browser:remove', (_event, envId: string): boolean => {
    const id = String(envId);
    const view = views.get(id);
    if (view === undefined) return false;
    if (activeView === view) activeView = null;
    getWindow()?.contentView.removeChildView(view);
    view.webContents.close();
    views.delete(id);
    return true;
  });

  ipcMain.handle('browser:navigate', (_event, envId: string, url: string): boolean => {
    const view = views.get(String(envId));
    if (view === undefined) return false;
    const target = String(url).trim();
    if (target.length === 0) return false;
    void view.webContents.loadURL(target);
    return true;
  });

  ipcMain.handle('browser:back', (_event, envId: string): boolean => {
    const view = views.get(String(envId));
    if (view === undefined || !view.webContents.navigationHistory.canGoBack()) return false;
    view.webContents.navigationHistory.goBack();
    return true;
  });

  ipcMain.handle('browser:forward', (_event, envId: string): boolean => {
    const view = views.get(String(envId));
    if (view === undefined || !view.webContents.navigationHistory.canGoForward()) return false;
    view.webContents.navigationHistory.goForward();
    return true;
  });

  ipcMain.handle('browser:reload', (_event, envId: string): boolean => {
    views.get(String(envId))?.webContents.reload();
    return true;
  });

  ipcMain.handle('browser:layout', (_event, next: unknown): boolean => {
    if (typeof next !== 'object' || next === null) return false;
    const raw = next as Partial<Layout>;
    if (
      typeof raw.x !== 'number' ||
      typeof raw.y !== 'number' ||
      typeof raw.width !== 'number' ||
      typeof raw.height !== 'number'
    ) {
      return false;
    }
    layout = {
      x: Math.round(raw.x),
      y: Math.round(raw.y),
      width: Math.round(raw.width),
      height: Math.round(raw.height),
    };
    applyLayout();
    return true;
  });

  ipcMain.handle('browser:state', (_event, envId: string): EmbeddedState | null => stateOf(String(envId)));

  ipcMain.handle('browser:open-external', async (_event, url: string): Promise<boolean> => {
    const target = String(url ?? '').trim();
    if (!/^https?:\/\//i.test(target)) return false;
    await shell.openExternal(target);
    return true;
  });
}
