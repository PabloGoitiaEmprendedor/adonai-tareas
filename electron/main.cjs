const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let miniWindow;

// ── Speech Recognition & Mic Flags ──────────────────────────────────────────
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// ── Single Instance Lock & Protocol Registration ────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
    
    // Protocol handler for Windows/Linux
    // find the custom protocol URL in the command line arguments.
    const url = commandLine.find(arg => arg.startsWith('adonai-tasks://'));
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle deep link on macOS
  app.on('open-url', (event, url) => {
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
  // silent
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Adonai — Productividad inteligente',
    backgroundColor: process.platform === 'darwin' ? '#18181B' : '#F8F9FA',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      enableBlinkFeatures: 'SpeechRecognition',
    },
    icon: path.join(__dirname, app.isPackaged ? '../dist/favicon.ico' : '../public/favicon.ico'),
  });

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html')
    : path.join(__dirname, '..', 'dist', 'index.html');

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(indexPath).catch(err => {
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
      webSecurity: false,
      enableBlinkFeatures: 'SpeechRecognition',
    },
    icon: path.join(__dirname, app.isPackaged ? '../dist/favicon.ico' : '../public/favicon.ico'),
  });

  // Mini window starts hidden — renderer signals when session is ready
  let miniShown = false;

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html')
    : path.join(__dirname, '..', 'dist', 'index.html');
  if (!app.isPackaged) {
    miniWindow.loadURL('http://localhost:8080/#/mini');
  } else {
    miniWindow.loadFile(indexPath, { hash: 'mini' }).catch(err => {
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

ipcMain.on('sync-data', () => {
  if (mainWindow) mainWindow.webContents.send('invalidate-queries');
  if (miniWindow) miniWindow.webContents.send('invalidate-queries');
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
