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

contextBridge.exposeInMainWorld('sftpAPI', {
  connect: (config) => ipcRenderer.invoke('sftp-connect', config),
  disconnect: (connId) => ipcRenderer.invoke('sftp-disconnect', connId),
  readDirectory: (connId, dirPath) => ipcRenderer.invoke('sftp-read-directory', connId, dirPath),
  createDirectory: (connId, dirPath) => ipcRenderer.invoke('sftp-create-directory', connId, dirPath),
  delete: (connId, itemPath) => ipcRenderer.invoke('sftp-delete', connId, itemPath),
  getCurrentPath: () => ipcRenderer.invoke('sftp-get-current-path'),
});
