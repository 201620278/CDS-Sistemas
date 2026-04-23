const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;
const PORT = 3030;

function getBackendEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'backend', 'server.js');
  }

  return path.join(__dirname, 'backend', 'server.js');
}

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function tryConnect() {
      http
        .get(url, (res) => {
          res.resume();
          resolve(true);
        })
        .on('error', () => {
          if (Date.now() - start >= timeout) {
            reject(new Error(`Backend não respondeu a tempo: ${url}`));
            return;
          }

          setTimeout(tryConnect, 1000);
        });
    }

    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.maximize();
  mainWindow.loadURL(`http://localhost:${PORT}/login`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Falha ao carregar a janela:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'dados');
  const backendEntry = getBackendEntry();

  console.log('Iniciando backend em:', backendEntry);
  console.log('Banco em:', dbDir);
  console.log('ExecPath:', process.execPath);
  console.log('ResourcesPath:', process.resourcesPath);

  backendProcess = spawn(process.execPath, [backendEntry], {
    cwd: path.dirname(backendEntry),
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      DB_DIR: dbDir,
      PORT: String(PORT)
    },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Erro ao iniciar backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log('Backend encerrado com código:', code);
  });
}

app.whenReady().then(async () => {
  try {
    if (app.isPackaged) {
      startBackend();
      await waitForServer(`http://localhost:${PORT}/login`, 30000);
    }

    createWindow();
  } catch (error) {
    console.error('Erro ao iniciar aplicação:', error);
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});