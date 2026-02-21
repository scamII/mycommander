const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('ssh2');

let mainWindow;
let sftpConnections = {};

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

// ==================== SSH/SFTP Обработчики ====================

ipcMain.handle('sftp-connect', async (event, config) => {
  return new Promise((resolve, reject) => {
    const connId = `conn_${Date.now()}`;
    const client = new Client();
    
    client.on('ready', () => {
      client.sftp((err, sftp) => {
        if (err) {
          client.end();
          reject({ error: err.message });
          return;
        }
        sftpConnections[connId] = { client, sftp };
        resolve({ connId, message: 'Подключено' });
      });
    });
    
    client.on('error', (err) => {
      reject({ error: `Ошибка: ${err.message}` });
    });
    
    client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
    });
  });
});

ipcMain.handle('sftp-disconnect', (event, connId) => {
  if (sftpConnections[connId]) {
    sftpConnections[connId].client.end();
    delete sftpConnections[connId];
    return { success: true };
  }
  return { success: false, error: 'Не найдено' };
});

ipcMain.handle('sftp-read-directory', async (event, connId, dirPath) => {
  return new Promise((resolve, reject) => {
    if (!sftpConnections[connId]) {
      reject({ error: 'Не подключено' });
      return;
    }
    
    sftpConnections[connId].sftp.readdir(dirPath, (err, list) => {
      if (err) {
        reject({ error: err.message });
        return;
      }
      resolve(list.map(item => ({
        name: item.filename,
        path: `${dirPath}/${item.filename}`,
        isDirectory: item.attrs.isDirectory(),
        size: item.attrs.size,
        modified: new Date(item.attrs.mtime * 1000),
      })));
    });
  });
});

ipcMain.handle('sftp-create-directory', async (event, connId, dirPath) => {
  return new Promise((resolve, reject) => {
    if (!sftpConnections[connId]) {
      reject({ error: 'Не подключено' });
      return;
    }
    sftpConnections[connId].sftp.mkdir(dirPath, { mode: 0o755 }, (err) => {
      if (err) reject({ error: err.message });
      else resolve({ success: true });
    });
  });
});

ipcMain.handle('sftp-delete', async (event, connId, itemPath) => {
  return new Promise((resolve, reject) => {
    if (!sftpConnections[connId]) {
      reject({ error: 'Не подключено' });
      return;
    }
    const sftp = sftpConnections[connId].sftp;
    sftp.stat(itemPath, (err, stats) => {
      if (err) { reject({ error: err.message }); return; }
      if (stats.isDirectory()) {
        sftp.rmdir(itemPath, (err) => err ? reject({ error: err.message }) : resolve({ success: true }));
      } else {
        sftp.unlink(itemPath, (err) => err ? reject({ error: err.message }) : resolve({ success: true }));
      }
    });
  });
});

ipcMain.handle('sftp-get-current-path', () => '/');

// SSH Terminal (Shell)
let sshShells = {};

ipcMain.handle('ssh-shell-connect', async (event, config) => {
  return new Promise((resolve, reject) => {
    const shellId = `shell_${Date.now()}`;
    const client = new Client();
    
    client.on('ready', () => {
      client.shell((err, stream) => {
        if (err) {
          client.end();
          reject({ error: err.message });
          return;
        }
        
        sshShells[shellId] = { client, stream };
        
        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
          // Отправляем данные в renderer через event
          mainWindow.webContents.send('ssh-shell-data', shellId, data.toString());
        });
        
        resolve({ shellId, message: 'Терминал подключён' });
      });
    });
    
    client.on('error', (err) => {
      reject({ error: `Ошибка: ${err.message}` });
    });
    
    client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
    });
  });
});

ipcMain.handle('ssh-shell-write', async (event, shellId, data) => {
  if (sshShells[shellId]) {
    sshShells[shellId].stream.write(data);
    return { success: true };
  }
  return { error: 'Терминал не найден' };
});

ipcMain.handle('ssh-shell-disconnect', async (event, shellId) => {
  if (sshShells[shellId]) {
    sshShells[shellId].client.end();
    delete sshShells[shellId];
    return { success: true };
  }
  return { error: 'Терминал не найден' };
});
