const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

// Start the backend server and uIOhook
require('./index.js'); // Assuming index.js handles all setup side-effects

let mainWindow;
let configWindow;
let tray = null;
let isQuitting = false;

function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 765,
    height: 375,
    useContentSize: true,
    resizable: false,
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: true,
    title: "GlassKeys Preview",
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icon.png')
  });

  // Load with mode=desktop to distinguish from OBS Browser Source
  mainWindow.loadURL('http://localhost:3001/?mode=desktop');

  // Prevent app from quitting when closing window, minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createConfigWindow() {
  if (configWindow) {
    if (configWindow.isMinimized()) configWindow.restore();
    configWindow.focus();
    return;
  }

  configWindow = new BrowserWindow({
    width: 800, // Landscape width
    height: 600, // Landscape height
    minWidth: 600,
    minHeight: 600,
    maxWidth: 800,
    maxHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: "GlassKeys Configuration",
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icon.png')
  });

  configWindow.loadFile(path.join(__dirname, 'public', 'config.html'));

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'public', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);
  tray.setToolTip('GlassKeys Overlay');

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Preview Overlay', 
      click: () => {
        if (!mainWindow) createMainWindow();
        else mainWindow.show();
      }
    },
    { 
      label: 'Configuration', 
      click: () => createConfigWindow() 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
      if (!mainWindow) createMainWindow();
      else mainWindow.show();
  });
}

// Window Resize Handler
ipcMain.on('resize-window', (event, { width, height }) => {
    if (mainWindow) {
        // useContentSize was set to true on creation, so setContentSize sets the viewport area
        mainWindow.setContentSize(width, height);
    }
});

app.whenReady().then(() => {
  createMainWindow();
  createConfigWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Do nothing, keep running in tray unless explicit quit
  if (process.platform === 'darwin') {
      // Mac behavior usually quits if no windows, but for tray apps we might keep running
  }
});
