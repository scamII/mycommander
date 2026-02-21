const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileAPI', {
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  getCurrentPath: () => ipcRenderer.invoke('get-current-path'),
  navigateUp: (currentPath) => ipcRenderer.invoke('navigate-up', currentPath),
  createDirectory: (dirPath, name) => ipcRenderer.invoke('create-directory', dirPath, name),
  deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
  renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', oldPath, newName),
  copyItem: (sourcePath, destPath) => ipcRenderer.invoke('copy-item', sourcePath, destPath),
  moveItem: (sourcePath, destPath) => ipcRenderer.invoke('move-item', sourcePath, destPath),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  exitApp: () => ipcRenderer.invoke('exit-app'),
});
