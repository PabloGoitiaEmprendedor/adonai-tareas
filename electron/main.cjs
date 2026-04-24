const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;
let miniWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#F5F5E9', // exact cream color
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false, // Permite cargar scripts locales sin bloqueos
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools(); // Always open DevTools in dev mode
  } else {
    mainWindow.loadFile(indexPath);
    mainWindow.webContents.openDevTools(); // ALWAYS open DevTools temporarily to debug
  }

  // Interceptar logs de la ventana de React
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER ERROR/LOG]: ${message} (en línea ${line})`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  // External links handle
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC for the widget
ipcMain.on('toggle-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
    miniWindow = null;
  } else {
    miniWindow = new BrowserWindow({
      width: 360,
      height: 520,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (!app.isPackaged) {
      miniWindow.loadURL('http://localhost:8080/#/mini');
    } else {
      miniWindow.loadFile(indexPath, { hash: 'mini' });
    }
  }
});
