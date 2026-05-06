const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, MenuItem, globalShortcut, screen, clipboard } = require('electron');
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

// ── Auto-start on boot ──────────────────────────────────────────────────────
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe'),
  args: ['--autostart'],
});

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
  sendToAllWindows('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes || '',
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendToAllWindows('update-download-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', (info) => {
  sendToAllWindows('update-downloaded', null);
  // Auto-install after 10 seconds if user hasn't restarted yet
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      autoUpdater.quitAndInstall(false, true);
    }
  }, 10000);
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
    mainWindow.loadURL('http://localhost:8080').catch(err => {
      logToFile(`Failed to load dev URL: ${err}`);
    });
  } else {
    mainWindow.loadFile(indexPath).catch(err => {
      logToFile(`Failed to load index.html: ${err}`);
      console.error('Failed to load index.html:', err);
    });
    autoUpdater.checkForUpdatesAndNotify();
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
    show: false, // Hidden until renderer signals ready
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      enableBlinkFeatures: 'SpeechRecognition',
    },
    icon: path.join(__dirname, '..', app.isPackaged ? 'dist' : 'public', 'icon.png'),
  });

  // Mini window starts hidden — renderer signals when session is ready
  let miniShown = false;

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  logToFile(`Loading mini window: ${indexPath}`);

  if (!app.isPackaged) {
    miniWindow.loadURL('http://localhost:8080/#/mini').catch(err => {
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

  // Spoof Origin and Referer for Microsoft Clarity to allow tracking from the desktop app
  const filter = { urls: ['https://*.clarity.ms/*'] };
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['Origin'] = 'https://adonaitasks.com';
    details.requestHeaders['Referer'] = 'https://adonaitasks.com/';
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

// Free movement — no clamping, user puts the pill wherever they want
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
    bubbleWindow.loadURL('http://localhost:8080/#/selection-bubble').catch(err => {
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
    quickTaskWindow.loadURL(`http://localhost:8080/#/quick-task?text=${encodeURIComponent(initialText)}`).catch(err => {
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
