import { app, BrowserWindow, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { registerAppHandlers } from './appHandlers';
import { registerAgentToolHandlers } from './agentTools';
import { registerAiLocalHandlers } from './aiLocal';
import { registerEmbeddedBrowser } from './embeddedBrowser';
import { registerDialogHandlers } from './dialogs';
import { registerFsHandlers } from './fsHandlers';
import { registerGitHandlers } from './gitHandlers';
import { registerTelemetry } from './telemetry';
import { attachFullscreenEvents, registerWindowHandlers, WINDOW_CHROME } from './windowHandlers';
import { registerAiNetHandlers } from './aiNet';
import { registerAiKeyHandlers, resolveApiKey } from './aiKeys';
import { readLocalApiKey, registerOpencodeLocalHandlers } from './opencodeLocal';
import { createPtyManager, type PtySpawnFn } from './pty/manager';
import { registerPtyIpc } from './pty/ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCENT = '#00D2FF';
const BG_BASE = '#000000';
const DEV_RENDERER_URL = 'http://localhost:5173';

const TRANSPARENT = process.env['TRANSPARENT'] === '1';

// Haswell-era drivers on this class of machine intermittently fail to spawn the GPU
// process (error_code=1002), which is fatal for Electron. Compositing a text editor in
// software costs nothing; opt back in with FILE_GPU=1 if the GPU path is healthy.
if (process.env['FILE_GPU'] !== '1') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// Uygulama içi tarayıcı görünümü (WebContentsView) pencereye çocuk olarak çizilir; Chromium
// bu görünümü gizli/occluded sayıp render'ı/input'u geciktirebiliyor; bunu kapat.
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

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
    icon: nativeImage.createFromPath(join(app.getAppPath(), 'public', 'FILE.png')),
    autoHideMenuBar: true,
    transparent: TRANSPARENT,
    ...WINDOW_CHROME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.cjs'),
    },
  });

  if (mainWindow !== null) {
    attachFullscreenEvents(mainWindow);
  }

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
  registerAgentToolHandlers();
  registerAppHandlers(getWindow);
  registerEmbeddedBrowser(getWindow, (state) => {
    const win = getWindow();
    if (win !== null && !win.isDestroyed()) {
      win.webContents.send('browser:state', state);
    }
  });
  registerTelemetry(getWindow);
  registerWindowHandlers(getWindow);
  registerAiKeyHandlers();
  registerOpencodeLocalHandlers();
  registerAiLocalHandlers(getWindow);
  registerAiNetHandlers(async (provider, keyEnv, override) => {
    const key = await resolveApiKey(provider, keyEnv, override);
    if (key !== null) return key;
    // opencode CLI oturumu açıksa anahtarı yerel auth dosyasından al.
    if (provider === 'opencode') return readLocalApiKey('opencode');
    return null;
  });
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
