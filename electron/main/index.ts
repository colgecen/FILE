import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { registerAppHandlers } from './appHandlers';
import { registerDialogHandlers } from './dialogs';
import { registerFsHandlers } from './fsHandlers';
import { registerGitHandlers } from './gitHandlers';
import { registerTelemetry } from './telemetry';
import { registerWindowHandlers } from './windowHandlers';
import { createPtyManager, type PtySpawnFn } from './pty/manager';
import { registerPtyIpc } from './pty/ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCENT = '#00D2FF';
const BG_BASE = '#000000';
const DEV_RENDERER_URL = 'http://localhost:5173';

const TRANSPARENT = process.env['TRANSPARENT'] === '1';

let mainWindow: BrowserWindow | null = null;
const ptyManager = createPtyManager(spawn as unknown as PtySpawnFn, join(__dirname, 'pty-helper.js'));

function resolveRendererEntry(): { url?: string; file?: string } {
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    return { url: process.env['ELECTRON_RENDERER_URL'] };
  }
  return { file: join(__dirname, '../renderer/index.html') };
}

function createMainWindow(): void {
  if (mainWindow !== null) return;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: TRANSPARENT ? '#00000000' : BG_BASE,
    title: 'File',
    autoHideMenuBar: true,
    transparent: TRANSPARENT,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.cjs'),
    },
  });

  mainWindow.on('closed', (): void => {
    mainWindow = null;
  });

  const entry = resolveRendererEntry();
  if (entry.url !== undefined) {
    void mainWindow.loadURL(entry.url);
  } else if (entry.file !== undefined) {
    void mainWindow.loadFile(entry.file);
  }

  void ACCENT;
  void DEV_RENDERER_URL;
}

void app.whenReady().then((): void => {
  const getWindow = (): BrowserWindow | null => mainWindow;
  registerDialogHandlers(getWindow);
  registerFsHandlers();
  registerGitHandlers();
  registerAppHandlers(getWindow);
  registerTelemetry(getWindow);
  registerWindowHandlers(getWindow);
  registerPtyIpc(getWindow, ptyManager);
  ptyManager.start();

  createMainWindow();

  app.on('activate', (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    ptyManager.dispose();
    app.quit();
  }
});
