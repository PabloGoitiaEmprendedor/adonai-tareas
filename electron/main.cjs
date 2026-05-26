const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, MenuItem, globalShortcut, screen, clipboard, Notification } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

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

process.on('uncaughtException', (error) => {
  logToFile(`CRITICAL: Uncaught Exception: ${error.stack || error}`);
  dialog.showErrorBox('Error en el proceso principal', error.message || 'Error desconocido');
});

process.on('unhandledRejection', (reason) => {
  logToFile(`CRITICAL: Unhandled Rejection: ${reason}`);
});

let mainWindow;
let miniWindow;
let bubbleWindow;
let quickTaskWindow;

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
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.autoRunAppAfterInstall = true;

function sendToAllWindows(channel, data) {
  if (mainWindow) mainWindow.webContents.send(channel, data);
  if (miniWindow) miniWindow.webContents.send(channel, data);
}

autoUpdater.on('checking-for-update', () => {
  // silent
});

autoUpdater.on('update-available', (info) => {
  // silent auto-download
});

autoUpdater.on('download-progress', () => {
  // silent
});

autoUpdater.on('update-downloaded', () => {
  // silent – will install on next app quit (autoInstallOnAppQuit = true)
});

autoUpdater.on('update-not-available', () => {
  // silent
});

autoUpdater.on('error', (err) => {
  logToFile(`Auto-updater error: ${err}`);
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Adonai — Productividad inteligente',
    backgroundColor: process.platform === 'darwin' ? '#18181B' : '#F8F9FA',
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden', // Native buttons on Mac, custom on Windows
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      enableBlinkFeatures: 'SpeechRecognition',
    },
    icon: path.join(__dirname, '..', app.isPackaged ? 'dist' : 'public', 'icon.png'),
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
    autoUpdater.checkForUpdates();
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Silent auto-updater (no UI notifications) ───────────────────────────────
// Note: The UI-facing update events are handled above via sendToAllWindows().
// The fallback auto-install is triggered by the first set of listeners.
// These are kept for logging only.

function broadcastToAll(channel, data) {
  if (mainWindow) mainWindow.webContents.send(channel, data);
  if (miniWindow) miniWindow.webContents.send(channel, data);
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
    icon: path.join(__dirname, '..', app.isPackaged ? 'dist' : 'public', 'icon.png'),
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
  
  // Check for deep link URL in process.argv on initial launch
  const deepLinkArg = process.argv.find(arg => arg.startsWith('adonai-tasks://'));
  
  if (!isAutostart) {
    createMainWindow();
  }
  
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

  setInterval(() => {
    if (app.isPackaged) autoUpdater.checkForUpdates();
  }, 1000 * 60 * 60 * 2);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall(false, true);
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
  if (win) win.close();
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
function createToastWindow(data) {
  if (toastWindow) {
    toastWindow.webContents.send('custom-toast-data', data);
    return;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const toastWidth = 380;
  const toastHeight = 140;

  toastWindow = new BrowserWindow({
    width: toastWidth,
    height: toastHeight,
    x: screenWidth - toastWidth - 20,
    y: screenHeight - toastHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}#/toast`
    : 'http://localhost:5173/#/toast';

  toastWindow.loadURL(startUrl);

  toastWindow.once('ready-to-show', () => {
    toastWindow.show();
    toastWindow.webContents.send('custom-toast-data', data);
  });

  // Auto-close after 5 seconds
  setTimeout(() => {
    if (toastWindow) {
      toastWindow.close();
      toastWindow = null;
    }
  }, 5000);
}

ipcMain.on('show-notification', (event, data) => {
  if (Notification.isSupported()) {
    new Notification({
      title: data?.title || 'Adonai',
      body: data?.body || '',
      icon: path.join(__dirname, '../build/icon.png'),
      silent: false,
    }).show();
    return;
  }
  createToastWindow(data);
});
