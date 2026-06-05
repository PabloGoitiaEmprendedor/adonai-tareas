const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, MenuItem, globalShortcut, screen, clipboard, Tray, Notification } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { autoUpdater } = require('electron-updater');
const APP_USER_MODEL_ID = 'com.adonai.tasks';

app.setName('Adonai');
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

// ── Logging System ──────────────────────────────────────────────────────────
const logPath = path.join(app.getPath('userData'), 'adonai-app.log');
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

logToFile('--- App starting ---');
logToFile(`App Version: ${app.getVersion()}`);
logToFile(`Platform: ${process.platform}`);
logToFile(`Arch: ${process.arch}`);

let mainWindow;
let miniWindow;
let bubbleWindow;
let quickTaskWindow;
let tray = null;
let isQuitting = false;

process.on('uncaughtException', (error) => {
  logToFile(`CRITICAL: Uncaught Exception: ${error.stack || error}`);
  dialog.showErrorBox('Error en el proceso principal', error.message || 'Error desconocido');
});

process.on('unhandledRejection', (reason) => {
  logToFile(`CRITICAL: Unhandled Rejection: ${reason}`);
});

app.on('before-quit', () => {
  isQuitting = true;
});

// ── Speech Recognition & Mic Flags ──────────────────────────────────────────
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// GPU and Performance Optimizations
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');

// ── Single Instance Lock & Protocol Registration ────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logToFile('Second instance detected. Quitting.');
  app.quit();
} else {
  logToFile('Lock acquired.');
  Menu.setApplicationMenu(null);
  app.on('second-instance', (event, commandLine) => {
    logToFile('Second instance event received.');
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      logToFile('Focusing existing main window.');
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      logToFile('No main window found. Creating one.');
      createMainWindow();
    }
    
    // Protocol handler for Windows/Linux
    // find the custom protocol URL in the command line arguments.
    const url = commandLine.find(arg => arg.startsWith('adonai-tasks://'));
    if (url) {
      logToFile(`Handling deep link from second instance: ${url}`);
      handleDeepLink(url);
    }
  });

  // Handle deep link on macOS
  app.on('open-url', (event, url) => {
    logToFile(`Handling open-url (macOS): ${url}`);
    event.preventDefault();
    handleDeepLink(url);
  });
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('adonai-tasks', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('adonai-tasks');
}

function handleDeepLink(url) {
  if (!url) return;
  console.log("Processing deep link:", url);
  // Send to renderer
  if (mainWindow) {
    mainWindow.webContents.send('on-deep-link', url);
  } else {
    // If window not ready, wait and try again or store it
    app.whenReady().then(() => {
       if (mainWindow) mainWindow.webContents.send('on-deep-link', url);
    });
  }
}

// ── Window State Management ────────────────────────────────────────────────
function getExistingPath(candidates) {
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
}

function getAppIconPath() {
  const baseDir = path.join(__dirname, '..');
  const candidates = process.platform === 'win32'
    ? [
        path.join(baseDir, 'build', 'icon.ico'),
        path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'icon.png'),
        path.join(baseDir, 'build', 'icon.png'),
        path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'logo.png'),
      ]
    : [
        path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'icon.png'),
        path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'logo.png'),
        path.join(baseDir, 'build', 'icon.png'),
      ];

  return getExistingPath(candidates) || path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'icon.png');
}

function getAppPngIconPath() {
  const baseDir = path.join(__dirname, '..');
  const candidates = [
    path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'logo.png'),
    path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'icon.png'),
    path.join(baseDir, 'build', 'icon.png'),
  ];

  return getExistingPath(candidates) || path.join(baseDir, app.isPackaged ? 'dist' : 'public', 'icon.png');
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }

  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function createTray() {
  if (tray) return;

  tray = new Tray(getAppIconPath());
  tray.setToolTip('Adonai - recordatorios activos');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Adonai', click: showMainWindow },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

const configPath = path.join(app.getPath('userData'), 'window-state.json');
const authStoragePath = path.join(app.getPath('userData'), 'supabase-auth.json');
const authStorageBackupPath = `${authStoragePath}.bak`;
const authStorageTempPath = `${authStoragePath}.tmp`;

function readAuthStorage() {
  const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Auth storage is not an object');
    }
    return parsed;
  };

  try {
    return readJsonFile(authStoragePath) || {};
  } catch (e) {
    console.error('Failed to read auth storage, trying backup', e);
    logToFile(`Failed to read auth storage, trying backup: ${e.message || e}`);
  }

  try {
    const backup = readJsonFile(authStorageBackupPath);
    if (backup) {
      writeAuthStorage(backup);
      return backup;
    }
  } catch (e) {
    console.error('Failed to read auth storage backup', e);
    logToFile(`Failed to read auth storage backup: ${e.message || e}`);
  }

  return {};
}

function writeAuthStorage(store) {
  try {
    const next = JSON.stringify(store);
    fs.writeFileSync(authStorageTempPath, next, 'utf8');

    if (fs.existsSync(authStoragePath)) {
      fs.copyFileSync(authStoragePath, authStorageBackupPath);
      fs.rmSync(authStoragePath, { force: true });
    }

    fs.renameSync(authStorageTempPath, authStoragePath);
  } catch (e) {
    console.error('Failed to write auth storage', e);
    logToFile(`Failed to write auth storage: ${e.message || e}`);
    try {
      fs.writeFileSync(authStoragePath, JSON.stringify(store), 'utf8');
    } catch (fallbackError) {
      console.error('Failed fallback auth storage write', fallbackError);
      logToFile(`Failed fallback auth storage write: ${fallbackError.message || fallbackError}`);
    }
  } finally {
    try {
      if (fs.existsSync(authStorageTempPath)) fs.rmSync(authStorageTempPath, { force: true });
    } catch (_) {}
  }
}

function saveWindowState(state) {
  try {
    const existing = loadWindowState() || {};
    const newState = { ...existing, ...state };
    fs.writeFileSync(configPath, JSON.stringify(newState));
  } catch (e) {
    console.error('Failed to save window state', e);
  }
}

function loadWindowState() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    // console.error('Failed to load window state', e);
  }
  return null;
}

// ── Auto-start on boot (Default to true on first run) ───────────────────────
const savedState = loadWindowState();
if (!savedState || savedState.autoStartSet === undefined) {
  logToFile('First run: Enabling auto-start by default');
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
    args: ['--autostart'],
  });
  saveWindowState({ autoStartSet: true });
}

// ── Auto-updater config ─────────────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.autoRunAppAfterInstall = true;

// Explicit feed URL for GitHub
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'PabloGoitiaEmprendedor',
  repo: 'adonai-tareas',
});

function sendUpdateReady(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-ready', data);
  }
}

autoUpdater.on('checking-for-update', () => {
  logToFile('Auto-updater: checking for update...');
});

autoUpdater.on('update-available', (info) => {
  logToFile(`Auto-updater: update available (v${info?.version})`);
});

autoUpdater.on('download-progress', (progress) => {
  logToFile(`Auto-updater: download progress ${Math.round(progress?.percent || 0)}%`);
});

let downloadedUpdateVersion = null;

autoUpdater.on('update-downloaded', (info) => {
  downloadedUpdateVersion = info?.version || null;
  logToFile('Auto-updater: update downloaded, waiting for user restart');
  sendUpdateReady({ version: downloadedUpdateVersion });
});

autoUpdater.on('update-not-available', () => {
  logToFile('Auto-updater: no update available');
});

autoUpdater.on('error', (err) => {
  logToFile(`Auto-updater error: ${err?.message || err}`);
});

// ── Custom silent update mechanism ────────────────────────────────────────────
const GITHUB_REPO = 'PabloGoitiaEmprendedor/adonai-tareas';
let downloadedUpdatePath = null;
let updateDownloadPromise = null;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Adonai-App' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetchJSON(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const partialPath = `${destPath}.download`;
    const cleanupPartial = () => {
      try {
        if (fs.existsSync(partialPath)) fs.rmSync(partialPath, { force: true });
      } catch (_) {}
    };

    const requestDownload = (downloadUrl) => {
      const mod = downloadUrl.startsWith('https') ? https : require('http');
      mod.get(downloadUrl, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          requestDownload(new URL(res.headers.location, downloadUrl).toString());
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          cleanupPartial();
          reject(new Error(`Installer download failed with HTTP ${res.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(partialPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            try {
              if (fs.existsSync(destPath)) fs.rmSync(destPath, { force: true });
              fs.renameSync(partialPath, destPath);
              resolve(destPath);
            } catch (error) {
              cleanupPartial();
              reject(error);
            }
          });
        });
        file.on('error', (error) => {
          cleanupPartial();
          reject(error);
        });
      }).on('error', (error) => {
        cleanupPartial();
        reject(error);
      });
    };

    cleanupPartial();
    requestDownload(url);
  });
}

function isNewerVersion(latest, current) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] ?? 0;
    const b = c[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

async function checkAndDownloadUpdate() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  if (updateDownloadPromise) return updateDownloadPromise;

  updateDownloadPromise = (async () => {
    try {
      const currentVersion = app.getVersion();
      const data = await fetchJSON(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      const latestTag = data.tag_name?.replace(/^v/, '') || '';
      if (!latestTag || latestTag === currentVersion) return;
      if (!isNewerVersion(latestTag, currentVersion)) return;

      logToFile(`[CustomUpdate] New version found: v${currentVersion} -> v${latestTag}`);
      const asset = data.assets?.find(a => a.name === 'Adonai-Setup.exe');
      if (!asset) {
        logToFile('[CustomUpdate] No installer asset found');
        return;
      }

      const tempPath = path.join(app.getPath('temp'), `Adonai-Setup-${latestTag}.exe`);
      const completeMarkerPath = `${tempPath}.complete`;
      const hasCompleteInstaller =
        fs.existsSync(tempPath)
        && fs.existsSync(completeMarkerPath)
        && fs.statSync(tempPath).size > 0;

      if (!hasCompleteInstaller) {
        logToFile(`[CustomUpdate] Downloading silently from: ${asset.browser_download_url}`);
        await downloadFile(asset.browser_download_url, tempPath);
        fs.writeFileSync(completeMarkerPath, latestTag, 'utf8');
      }

      downloadedUpdatePath = tempPath;
      downloadedUpdateVersion = latestTag;
      logToFile(`[CustomUpdate] Download complete: ${tempPath}`);
      sendUpdateReady({ version: latestTag });
    } catch (err) {
      logToFile(`[CustomUpdate] Error: ${err.message}`);
    } finally {
      updateDownloadPromise = null;
    }
  })();

  return updateDownloadPromise;
}

function installUpdate() {
  if (process.platform !== 'win32') {
    autoUpdater.quitAndInstall(true, true);
    return;
  }

  if (!downloadedUpdatePath || !fs.existsSync(downloadedUpdatePath)) return;
  logToFile(`[CustomUpdate] Launching installer: ${downloadedUpdatePath}`);
  const child = spawn(downloadedUpdatePath, ['--updated', '/S', '--force-run'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  app.quit();
}

function checkForUpdatesSilently() {
  if (!app.isPackaged) return;
  if (process.platform === 'win32') {
    checkAndDownloadUpdate();
    return;
  }
  autoUpdater.checkForUpdates();
}

function createMainWindow(options = {}) {
  const startHidden = Boolean(options.startHidden);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Adonai — Productividad inteligente',
    backgroundColor: process.platform === 'darwin' ? '#18181B' : '#F8F9FA',
    show: false,
    autoHideMenuBar: true,
    paintWhenInitiallyHidden: true,
    frame: false,
    titleBarStyle: 'hidden', // Native buttons on Mac, custom on Windows
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      enableBlinkFeatures: 'SpeechRecognition',
      backgroundThrottling: false,
    },
    icon: getAppIconPath(),
  });
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  logToFile(`Loading main window: ${indexPath}`);

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      logToFile(`Failed to load dev URL: ${err}`);
    });
  } else {
    mainWindow.loadFile(indexPath).catch(err => {
      logToFile(`Failed to load index.html: ${err}`);
      console.error('Failed to load index.html:', err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!startHidden) mainWindow.show();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Validate position is within any display; return centered fallback if not
function clampMiniToDisplay(x, y) {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  const COLLAPSED_W = 100;
  const COLLAPSED_H = 52;
  const EXPANDED_W = 340;
  const EXPANDED_H = 520;
  const PANEL_W = Math.max(COLLAPSED_W, EXPANDED_W);
  const PANEL_H = Math.max(COLLAPSED_H, EXPANDED_H);

  for (const display of displays) {
    const wa = display.workArea;
    if (x >= wa.x && y >= wa.y && x + COLLAPSED_W <= wa.x + wa.width && y + COLLAPSED_H <= wa.y + wa.height) {
      return { x, y };
    }
  }

  // Not in any display — center on primary
  const primary = screen.getPrimaryDisplay();
  const wa = primary.workArea;
  return {
    x: Math.round(wa.x + wa.width / 2 - COLLAPSED_W / 2),
    y: Math.round(wa.y + wa.height / 2 - COLLAPSED_H / 2),
  };
}

function createMiniWindow() {
  if (miniWindow) return;
  const state = loadWindowState();
  const miniState = state?.mini || {};
  const { screen } = require('electron');

  const rawX = miniState.x;
  const rawY = miniState.y;
  const safePos = clampMiniToDisplay(rawX ?? 0, rawY ?? 0);

  miniWindow = new BrowserWindow({
    width: miniState.width || 100,
    height: miniState.height || 52,
    x: safePos.x,
    y: safePos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    autoHideMenuBar: true,
    // Performance and fluidity
    paintWhenInitiallyHidden: true,
    acceptFirstMouse: true,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      enableBlinkFeatures: 'SpeechRecognition',
      backgroundThrottling: false, // Keep it fluid even when not focused
      offscreen: false,
    },
    icon: getAppIconPath(),
  });

  // Mini window starts hidden — renderer signals when session is ready
  let miniShown = false;

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  logToFile(`Loading mini window: ${indexPath}`);

  if (!app.isPackaged) {
    miniWindow.loadURL('http://localhost:5173/#/mini').catch(err => {
      logToFile(`Failed to load mini dev URL: ${err}`);
    });
  } else {
    miniWindow.loadFile(indexPath, { hash: 'mini' }).catch(err => {
      logToFile(`Mini window failed to load: ${err}`);
      console.error('Mini window failed to load:', err);
    });
  }

  miniWindow.on('closed', () => {
    miniWindow = null;
    if (mainWindow) {
      mainWindow.webContents.send('mini-window-closed', true);
    }
  });
}

app.whenReady().then(() => {
  // ── Grant microphone permissions automatically for Electron ──
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'microphone', 'audioCapture'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Also handle permission checks (Chromium 93+)
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'microphone', 'audioCapture'];
    return allowedPermissions.includes(permission);
  });

  // Use the production website as origin for analytics requests emitted from file:// desktop windows.
  const analyticsFilter = {
    urls: [
      'https://*.clarity.ms/*',
      'https://www.googletagmanager.com/*',
      'https://*.google-analytics.com/*',
    ],
  };
  session.defaultSession.webRequest.onBeforeSendHeaders(analyticsFilter, (details, callback) => {
    details.requestHeaders['Origin'] = 'https://webadonai.com';
    details.requestHeaders['Referer'] = 'https://webadonai.com/';
    callback({ requestHeaders: details.requestHeaders });
  });

  // Enable spell-checker context menu globally for all web contents
  app.on('web-contents-created', (event, contents) => {
    contents.on('context-menu', (event, params) => {
      const menu = new Menu();

      // Add each spelling suggestion
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => contents.replaceMisspelling(suggestion)
        }));
      }

      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menu.append(
          new MenuItem({
            label: 'Añadir al diccionario',
            click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          })
        );
      }

      if (menu.items.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }));
      }
      
      // Add basic copy/paste
      if (params.editFlags.canCut) menu.append(new MenuItem({ role: 'cut', label: 'Cortar' }));
      if (params.editFlags.canCopy) menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }));
      if (params.editFlags.canPaste) menu.append(new MenuItem({ role: 'paste', label: 'Pegar' }));

      // Only popup if there's something to show (text selected or misspelled word or editable area)
      if (menu.items.length > 0 && params.isEditable) {
        menu.popup();
      }
    });
  });

  const isAutostart = process.argv.includes('--autostart');
  createTray();
  
  // Check for deep link URL in process.argv on initial launch
  const deepLinkArg = process.argv.find(arg => arg.startsWith('adonai-tasks://'));
  
  createMainWindow({ startHidden: isAutostart });
  
  // Auto-open floating mini window on startup
  createMiniWindow();

  // If launched via deep link, send it to renderer once window is ready
  if (deepLinkArg) {
    const sendDeepLink = () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('on-deep-link', deepLinkArg);
      }
    };
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', sendDeepLink);
    }
  }

  // Check for updates immediately on startup, then every 30 minutes
  if (app.isPackaged) {
    checkForUpdatesSilently();
    setInterval(checkForUpdatesSilently, 1000 * 60 * 30);
  }
});

app.on('window-all-closed', () => {
  if (isQuitting || !tray) {
    if (process.platform !== 'darwin') app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }
  createMainWindow();
});

// ── Mini window toggle ──
ipcMain.on('toggle-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
    miniWindow = null;
  } else {
    createMiniWindow();
  }
});

// ── Mini window ready (show when session is authenticated) ──
ipcMain.on('mini-ready', (event, { hasSession }) => {
  if (!miniWindow) return;
  if (hasSession && !miniWindow.isVisible()) {
    miniWindow.show();
  } else if (!hasSession && miniWindow.isVisible()) {
    miniWindow.hide();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(ignore, options);
});

// High-performance dragging: follow the mouse from Main process
let isDraggingMini = false;
let dragOffset = { x: 0, y: 0 };
let dragInterval = null;

ipcMain.on('mini-start-drag', (event) => {
  if (!miniWindow || isDraggingMini) return;
  
  const { x, y } = screen.getCursorScreenPoint();
  const bounds = miniWindow.getBounds();
  
  dragOffset = {
    x: x - bounds.x,
    y: y - bounds.y
  };
  
  isDraggingMini = true;
  
  if (dragInterval) clearInterval(dragInterval);
  dragInterval = setInterval(() => {
    if (!isDraggingMini || !miniWindow) {
      clearInterval(dragInterval);
      return;
    }
    
    const cursor = screen.getCursorScreenPoint();
    const newX = cursor.x - dragOffset.x;
    const newY = cursor.y - dragOffset.y;
    
    miniWindow.setPosition(Math.round(newX), Math.round(newY));
  }, 16); // ~60fps
});

ipcMain.on('mini-stop-drag', () => {
  isDraggingMini = false;
  if (dragInterval) clearInterval(dragInterval);
  
  if (miniWindow) {
    const b = miniWindow.getBounds();
    saveWindowState({
      mini: {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height
      }
    });
  }
});

// Original move-mini-window kept for compatibility if needed
ipcMain.on('move-mini-window', (event, dx, dy) => {
  if (!miniWindow) return;
  const bounds = miniWindow.getBounds();
  const newX = bounds.x + dx;
  const newY = bounds.y + dy;
  miniWindow.setPosition(newX, newY);
  
  // Save position
  saveWindowState({
    mini: {
      x: newX,
      y: newY,
      width: bounds.width,
      height: bounds.height
    }
  });
});

// Return position + screen work area so renderer decides expand direction
ipcMain.handle('get-mini-position', () => {
  if (!miniWindow) return null;
  const { screen } = require('electron');
  const bounds = miniWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const wa = display.workArea;
  return {
    x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height,
    screenX: wa.x, screenY: wa.y, screenW: wa.width, screenH: wa.height,
  };
});

// Set window bounds (position + size) — used for expand/collapse
ipcMain.on('set-mini-bounds', (event, b) => {
  if (!miniWindow) return;
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  let safeX = Math.round(b.x);
  let safeY = Math.round(b.y);
  const COLLAPSED_W = 100;

  for (const display of displays) {
    const wa = display.workArea;
    if (safeX >= wa.x - COLLAPSED_W + 10 && safeY >= wa.y - 20 && safeX <= wa.x + wa.width - 10 && safeY <= wa.y + wa.height - 20) {
      break;
    }
  }

  miniWindow.setBounds({
    x: safeX, y: safeY,
    width: Math.round(b.w), height: Math.round(b.h),
  });

  // Save state (mostly for size changes if any, but also position)
  saveWindowState({
    mini: {
      x: safeX,
      y: safeY,
      width: Math.round(b.w),
      height: Math.round(b.h)
    }
  });
});

let syncTimeout;
ipcMain.on('sync-data', () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('invalidate-queries');
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send('invalidate-queries');
  }, 200);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-ready-update', () => {
  if (!downloadedUpdateVersion) return null;
  return { version: downloadedUpdateVersion };
});

ipcMain.on('open-external', (event, url) => {
  const safeUrl = normalizeExternalUrl(url);
  if (!safeUrl) return;
  shell.openExternal(safeUrl);
});

ipcMain.on('restart-app', () => {
  installUpdate();
});

ipcMain.on('install-update', () => {
  logToFile('[CustomUpdate] Install triggered by user');
  installUpdate();
});

ipcMain.on('check-for-updates', () => {
  logToFile('Manual update check triggered by user');
  checkForUpdatesSilently();
});

ipcMain.on('log-message', (event, msg) => {
  console.log(`[RendererLog] ${msg}`);
});

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win === mainWindow) {
    win.hide();
    return;
  }
  win.close();
});

// ── Auto-start Settings ─────────────────────────────────────────────────────
ipcMain.handle('get-auto-start', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.on('set-auto-start', (event, openAtLogin) => {
  logToFile(`Setting auto-start to: ${openAtLogin}`);
  app.setLoginItemSettings({
    openAtLogin,
    path: app.getPath('exe'),
    args: ['--autostart'],
  });
  saveWindowState({ autoStartSet: true }); // Mark as explicitly set or at least initialized
});

ipcMain.handle('auth-storage-get', (_event, key) => {
  const store = readAuthStorage();
  return store[key] ?? null;
});

ipcMain.handle('auth-storage-set', (_event, key, value) => {
  const store = readAuthStorage();
  store[key] = value;
  writeAuthStorage(store);
  return true;
});

ipcMain.handle('auth-storage-remove', (_event, key) => {
  const store = readAuthStorage();
  delete store[key];
  writeAuthStorage(store);
  return true;
});

ipcMain.handle('auth-storage-clear', () => {
  writeAuthStorage({});
  return true;
});

// ── Universal Task Capture ──────────────────────────────────────────────────

function createSelectionBubbleWindow() {
  if (bubbleWindow) return;

  bubbleWindow = new BrowserWindow({
    width: 220,
    height: 80,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  logToFile(`Loading bubble window: ${indexPath}`);

  if (!app.isPackaged) {
    bubbleWindow.loadURL('http://localhost:5173/#/selection-bubble').catch(err => {
      logToFile(`Failed to load bubble dev URL: ${err}`);
    });
  } else {
    bubbleWindow.loadFile(indexPath, { hash: 'selection-bubble' }).catch(err => {
      logToFile(`Failed to load bubble window: ${err}`);
    });
  }
}

function createQuickTaskWindow(initialText = '') {
  if (quickTaskWindow) {
    quickTaskWindow.focus();
    quickTaskWindow.webContents.send('set-quick-task-text', { text: initialText });
    return;
  }

  const { x, y } = screen.getCursorScreenPoint();

  quickTaskWindow = new BrowserWindow({
    width: 400,
    height: 300,
    x: Math.max(0, x - 200),
    y: Math.max(0, y - 150),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  logToFile(`Loading quick task window: ${indexPath}`);

  if (!app.isPackaged) {
    quickTaskWindow.loadURL(`http://localhost:5173/#/quick-task?text=${encodeURIComponent(initialText)}`).catch(err => {
      logToFile(`Failed to load quick-task dev URL: ${err}`);
    });
  } else {
    quickTaskWindow.loadFile(indexPath, { 
      hash: 'quick-task',
      query: { text: initialText }
    }).catch(err => {
      logToFile(`Failed to load quick-task window: ${err}`);
    });
  }

  quickTaskWindow.on('closed', () => {
    quickTaskWindow = null;
  });
}

function captureSelection() {
  const oldClipboard = clipboard.readText();
  
  const command = process.platform === 'win32'
    ? 'powershell -command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys(\'^c\')"'
    : 'osascript -e \'tell application "System Events" to keystroke "c" using command down\'';

  exec(command, (error) => {
    if (error) {
      console.error('Failed to send copy command', error);
      return;
    }

    setTimeout(() => {
      const newText = clipboard.readText();
      if (newText && newText !== oldClipboard) {
        const { x, y } = screen.getCursorScreenPoint();
        
        if (!bubbleWindow) createSelectionBubbleWindow();
        
        bubbleWindow.setPosition(x + 10, y + 10);
        bubbleWindow.show();
        bubbleWindow.webContents.send('capture-selection', { text: newText });
      }
    }, 200);
  });
}

app.whenReady().then(() => {
  createSelectionBubbleWindow();
  globalShortcut.register('Alt+Space', () => {
    captureSelection();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('open-quick-task', (event, data) => {
  if (bubbleWindow) bubbleWindow.hide();
  createQuickTaskWindow(data.text);
});

ipcMain.on('close-quick-task', () => {
  if (quickTaskWindow) quickTaskWindow.close();
});

let toastWindow = null;
let toastCloseTimer = null;
let pendingToastData = null;
const reminderTimers = new Map();
const firedReminderKeys = new Set();
const MAX_TIMER_DELAY_MS = 2_147_483_647;
const STALE_REMINDER_GRACE_MS = 15 * 60 * 1000;

function playReminderBeep() {
  try {
    shell.beep();
  } catch (error) {
    logToFile(`[Reminder] Failed to play beep: ${error?.message || error}`);
  }
}

function clearScheduledReminder(id) {
  const key = String(id || '');
  const entry = reminderTimers.get(key);
  if (entry?.timer) clearTimeout(entry.timer);
  reminderTimers.delete(key);
}

function showToastWindow(data) {
  if (!toastWindow || toastWindow.isDestroyed()) return;

  pendingToastData = data;

  toastWindow.setBounds(getToastBounds());
  toastWindow.setOpacity(1);
  toastWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  toastWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  toastWindow.show();
  toastWindow.focus();
  toastWindow.moveTop();

  if (!toastWindow.webContents.isLoading()) {
    toastWindow.webContents.send('custom-toast-data', data);
  }

  logToFile(`[Toast] show visible=${toastWindow.isVisible()} focused=${toastWindow.isFocused()} bounds=${JSON.stringify(toastWindow.getBounds())}`);

  if (toastCloseTimer) clearTimeout(toastCloseTimer);
  toastCloseTimer = null;
  if (data?.persist !== true) {
    toastCloseTimer = setTimeout(() => {
      if (toastWindow && !toastWindow.isDestroyed()) toastWindow.close();
    }, Math.max(3500, Math.min(Number(data?.durationMs) || 6500, 10000)));
  }
}

function showNativeReminderFallback(data) {
  if (!Notification.isSupported()) return;

  const title = String(data?.title || 'Recordatorio');
  const cleanTitle = title.replace(/^Tarea:\s*/i, '').replace(/^Recordatorio:\s*/i, '').trim() || 'tu evento';

  new Notification({
    title: 'Adonai',
    body: `Pablo, es hora de ${cleanTitle}`,
    silent: false,
    icon: getAppIconPath(),
  }).show();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getReminderDisplayText(data) {
  const title = String(data?.title || 'tu evento')
    .replace(/^Tarea:\s*/i, '')
    .replace(/^Recordatorio:\s*/i, '')
    .trim() || 'tu evento';

  return `Pablo, es hora de ${title}`;
}

function getToastLogoDataUrl() {
  const candidates = [
    getAppPngIconPath(),
    path.join(__dirname, '..', app.isPackaged ? 'dist' : 'public', 'logo.png'),
    path.join(__dirname, '..', 'build', 'icon.png'),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const image = fs.readFileSync(candidate);
      return `data:image/png;base64,${image.toString('base64')}`;
    } catch {
      // Try the next bundled logo candidate.
    }
  }

  return '';
}

function normalizeExternalUrl(value) {
  const rawUrl = String(value || '').trim();
  if (!rawUrl) return '';

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function getToastHtml(data) {
  const message = escapeHtml(getReminderDisplayText(data));
  const reminderLink = normalizeExternalUrl(data?.link || data?.url);
  const logoSrc = getToastLogoDataUrl();
  const logoMarkup = logoSrc
    ? `<div class="logo-shell"><img src="${escapeHtml(logoSrc)}" alt="Adonai" /></div>`
    : '';
  const linkMarkup = reminderLink
    ? `<button class="link-action" aria-label="Abrir link del evento" title="Abrir link" data-url="${escapeHtml(reminderLink)}" onclick="openReminderLink(this.dataset.url)">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.6 13.4a1.4 1.4 0 0 0 2 2l4.7-4.7a3.5 3.5 0 0 0-5-5l-.9.9a1.1 1.1 0 0 0 1.6 1.6l.9-.9a1.3 1.3 0 0 1 1.8 1.8L11 13.8a1.4 1.4 0 0 0-.4-.4Z" fill="currentColor"/>
          <path d="M13.4 10.6a1.4 1.4 0 0 0-2-2l-4.7 4.7a3.5 3.5 0 1 0 5 5l.9-.9a1.1 1.1 0 0 0-1.6-1.6l-.9.9a1.3 1.3 0 1 1-1.8-1.8L13 10.2c.1.1.3.3.4.4Z" fill="currentColor"/>
        </svg>
      </button>`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:;" />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      box-sizing: border-box;
    }
    .toast {
      position: relative;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 ${reminderLink ? '76px' : '44px'} 0 14px;
      border-radius: 26px;
      color: #111827;
      background: #ffffff;
      border: 1px solid rgba(17,24,39,0.08);
      box-shadow: 0 18px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.72);
      animation: enter 220ms cubic-bezier(.16, 1, .3, 1) both;
    }
    .toast::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(to bottom, #ffffff, #f8fafc);
      pointer-events: none;
    }
    .logo-shell {
      position: relative;
      z-index: 1;
      flex: 0 0 42px;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: #f6f7fb;
      box-shadow: 0 8px 24px rgba(17,24,39,.12), inset 0 1px 0 rgba(255,255,255,.85);
      overflow: hidden;
    }
    .logo-shell img {
      width: 32px;
      height: 32px;
      object-fit: contain;
      display: block;
      border-radius: 9px;
    }
    .message {
      position: relative;
      z-index: 1;
      min-width: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 15px;
      line-height: 1.24;
      font-weight: 650;
      letter-spacing: -0.02em;
    }
    .link-action,
    .close {
      position: absolute;
      z-index: 2;
      top: 12px;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: 999px;
      background: rgba(0,0,0,.055);
      color: rgba(0,0,0,.46);
      cursor: default;
      font-size: 16px;
      line-height: 24px;
      padding: 0;
    }
    .link-action {
      right: 42px;
      display: grid;
      place-items: center;
    }
    .link-action svg {
      width: 13px;
      height: 13px;
      display: block;
    }
    .close {
      right: 12px;
    }
    .link-action:hover,
    .close:hover {
      background: rgba(0,0,0,.1);
      color: rgba(0,0,0,.72);
    }
    @keyframes enter {
      from { opacity: 0; transform: translateY(-16px) scale(.985); filter: blur(6px); }
      to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
  </style>
</head>
<body>
  <div class="toast">
    ${logoMarkup}
    <div class="message">${message}</div>
    ${linkMarkup}
    <button class="close" aria-label="Cerrar" onclick="closeReminderToast()">&#215;</button>
  </div>
  <script>
    function closeReminderToast() {
      try { window.electronAPI?.closeToast?.(); } catch (_) {}
      try { window.close(); } catch (_) {}
    }

    function openReminderLink(url) {
      try {
        if (url) window.electronAPI?.openExternal?.(url);
      } catch (_) {}
      closeReminderToast();
    }

    (() => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
        master.connect(ctx.destination);
        [880, 1175].forEach((frequency, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startAt = now + index * 0.09;
          const stopAt = startAt + 0.28;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, startAt);
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.16 : 0.12, startAt + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
          osc.connect(gain);
          gain.connect(master);
          osc.start(startAt);
          osc.stop(stopAt + 0.03);
        });
        setTimeout(() => ctx.close(), 650);
      } catch (_) {}
    })();
  </script>
</body>
</html>`;
}

function loadToastWindow(data) {
  if (!toastWindow || toastWindow.isDestroyed()) return;

  pendingToastData = data;

  const revealToast = () => {
    if (pendingToastData) showToastWindow(pendingToastData);
  };

  toastWindow.webContents.once('dom-ready', revealToast);
  toastWindow.webContents.once('did-finish-load', revealToast);
  toastWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return;
    logToFile(`Failed to load toast window: ${errorCode} ${errorDescription}`);
    showNativeReminderFallback(data);
  });

  const toastUrl = `data:text/html;charset=utf-8,${encodeURIComponent(getToastHtml(data))}`;

  showToastWindow(data);
  toastWindow.loadURL(toastUrl)
    .then(revealToast)
    .catch((error) => {
      if (String(error?.message || error).includes('ERR_ABORTED')) return;
      logToFile(`Failed to load toast window: ${error}`);
      showNativeReminderFallback(data);
    });
}

function getToastBounds() {
  const display = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const { workArea } = display;
  const toastWidth = 390;
  const toastHeight = 96;

  return {
    width: toastWidth,
    height: toastHeight,
    x: Math.round(workArea.x + workArea.width - toastWidth - 22),
    y: Math.round(workArea.y + 22),
  };
}

function closeToastWindow() {
  if (toastCloseTimer) clearTimeout(toastCloseTimer);
  toastCloseTimer = null;
  pendingToastData = null;

  if (toastWindow && !toastWindow.isDestroyed()) {
    toastWindow.close();
  }
}

function createToastWindow(data) {
  pendingToastData = data;

  if (toastWindow && !toastWindow.isDestroyed()) {
    loadToastWindow(data);
    return;
  }

  const bounds = getToastBounds();

  toastWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    hasShadow: false,
    paintWhenInitiallyHidden: true,
    acceptFirstMouse: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  loadToastWindow(data);

  toastWindow.on('closed', () => {
    if (toastCloseTimer) clearTimeout(toastCloseTimer);
    toastCloseTimer = null;
    pendingToastData = null;
    toastWindow = null;
  });
}

function scheduleDesktopReminder(data) {
  const id = String(data?.id || '').trim();
  if (!id) return false;

  if (data?.enabled === false) {
    clearScheduledReminder(id);
    return false;
  }
  if (firedReminderKeys.has(id)) return false;

  const fireAt = Date.parse(data?.fireAt || data?.reminderAt || '');
  if (!Number.isFinite(fireAt)) {
    clearScheduledReminder(id);
    return false;
  }

  const delayMs = fireAt - Date.now();
  if (delayMs < -STALE_REMINDER_GRACE_MS) return false;

  const existing = reminderTimers.get(id);
  if (existing?.fireAt === fireAt) return true;

  clearScheduledReminder(id);

  const toastData = {
    title: String(data?.title || 'Recordatorio'),
    body: String(data?.body || ''),
    type: data?.type || 'info',
    link: normalizeExternalUrl(data?.link || data?.url),
    persist: true,
    durationMs: Number(data?.durationMs) || 7000,
  };

  const fire = () => {
    if (firedReminderKeys.has(id)) return;

    firedReminderKeys.add(id);
    reminderTimers.delete(id);
    playReminderBeep();
    createToastWindow(toastData);
    logToFile(`[Reminder] Fired desktop reminder: ${id}`);
  };

  if (delayMs <= 0) {
    fire();
    return true;
  }

  const timer = setTimeout(() => {
    if (fireAt - Date.now() > 0) {
      scheduleDesktopReminder(data);
      return;
    }
    fire();
  }, Math.min(delayMs, MAX_TIMER_DELAY_MS));

  reminderTimers.set(id, { timer, fireAt });
  logToFile(`[Reminder] Scheduled desktop reminder: ${id} at ${new Date(fireAt).toISOString()}`);
  return true;
}

ipcMain.on('show-notification', (event, data) => {
  playReminderBeep();
  createToastWindow(data);
});

ipcMain.on('schedule-reminder', (event, data) => {
  scheduleDesktopReminder(data);
});

ipcMain.on('cancel-reminder', (event, id) => {
  clearScheduledReminder(id);
});

ipcMain.on('close-toast', () => {
  closeToastWindow();
});

ipcMain.on('toast-ready', (event) => {
  if (!toastWindow || event.sender !== toastWindow.webContents || !pendingToastData) return;
  showToastWindow(pendingToastData);
});
