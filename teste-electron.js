const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  console.log('Electron iniciou com script isolado');

  const win = new BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadURL('data:text/html,<h1>Teste Electron OK</h1>');
});