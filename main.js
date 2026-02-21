const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,  // Скрыть меню
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработчики IPC для работы с файловой системой
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items.map(item => ({
      name: item.name,
      path: path.join(dirPath, item.name),
      isDirectory: item.isDirectory(),
    }));
  } catch (error) {
    throw new Error(`Ошибка чтения директории: ${error.message}`);
  }
});

ipcMain.handle('get-current-path', () => {
  return process.platform === 'win32' 
    ? path.parse(process.cwd()).root 
    : '/';
});

ipcMain.handle('navigate-up', (event, currentPath) => {
  return path.dirname(currentPath);
});

ipcMain.handle('create-directory', (event, dirPath, name) => {
  const newPath = path.join(dirPath, name);
  fs.mkdirSync(newPath);
  return newPath;
});

ipcMain.handle('show-input-dialog', async (event, title, defaultValue) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'none',
    title: title,
    message: title,
    buttons: ['Отмена', 'OK'],
    defaultId: 1,
    cancelId: 0,
  });
  
  if (result.response === 0) {
    return { cancelled: true, value: '' };
  }
  
  // Для простоты возвращаем default - в реальном приложении нужен кастомный диалог
  return { cancelled: false, value: defaultValue };
});

ipcMain.handle('delete-item', (event, itemPath) => {
  const stats = fs.statSync(itemPath);
  if (stats.isDirectory()) {
    fs.rmSync(itemPath, { recursive: true });
  } else {
    fs.unlinkSync(itemPath);
  }
});

ipcMain.handle('rename-item', (event, oldPath, newName) => {
  const newPath = path.join(path.dirname(oldPath), newName);
  fs.renameSync(oldPath, newPath);
  return newPath;
});

ipcMain.handle('copy-item', (event, sourcePath, destPath) => {
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(sourcePath, destPath);
  }
});

ipcMain.handle('move-item', (event, sourcePath, destPath) => {
  fs.renameSync(sourcePath, destPath);
});

ipcMain.handle('exit-app', () => {
  app.quit();
});

ipcMain.handle('get-file-info', (event, filePath) => {
  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    modified: stats.mtime,
    created: stats.birthtime,
    isDirectory: stats.isDirectory(),
  };
});
