const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readPNGMetadata: (path) => ipcRenderer.invoke('read-png-metadata', path),
  sortFile: (path, folder) => ipcRenderer.invoke('sort-file', path, folder),
  selectFolder: () => ipcRenderer.invoke('select-folder')
});
