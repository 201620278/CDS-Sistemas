const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  app: 'mercadao-da-economia'
});
