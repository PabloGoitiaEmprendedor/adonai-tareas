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
    // DevTools desactivado — no exponer código fuente
  } else {
    mainWindow.loadFile(indexPath);
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

// IPC for the widget — transparent:true + show() inmediato = visible sin fondo extra
ipcMain.on('toggle-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
    miniWindow = null;
  } else {
    miniWindow = new BrowserWindow({
      width: 360,
      height: 540,         // Fijo siempre — no redimensionar (evita desaparición)
      frame: false,
      transparent: true,   // Zonas vacías son invisibles y click-through
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
        webSecurity: false, // Igual que ventana principal — necesario para Supabase
      },
    });

    // Mostrar de inmediato (sin esperar ready-to-show) — patrón seguro
    miniWindow.show();
    miniWindow.center();

    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (!app.isPackaged) {
      miniWindow.loadURL('http://localhost:8080/#/mini');
    } else {
      miniWindow.loadFile(indexPath, { hash: 'mini' });
    }

    miniWindow.on('closed', () => {
      miniWindow = null;
      if (mainWindow) {
        mainWindow.webContents.send('mini-window-closed', true);
      }
    });
  }
});

// resize-mini-window — NO se usa (ventana fija para evitar desaparición)
// Se deja registrado para no romper el preload.cjs
ipcMain.on('resize-mini-window', () => {});

// IPC para mover la ventana por delta (arrastre manual desde pill colapsada)
ipcMain.on('move-mini-window', (event, dx, dy) => {
  if (miniWindow) {
    const bounds = miniWindow.getBounds();
    miniWindow.setPosition(bounds.x + dx, bounds.y + dy);
  }
});

// IPC para sincronizar datos entre ventanas
ipcMain.on('sync-data', () => {
  if (mainWindow) mainWindow.webContents.send('invalidate-queries');
  if (miniWindow) miniWindow.webContents.send('invalidate-queries');
});
