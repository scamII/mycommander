/**
 * MyCommander - Главный файл renderer процесса
 * Модульная архитектура
 */

import { modalManager } from './components/modal.js';
import { FileManager } from './components/file-panel.js';
import { KeyboardManager } from './components/keyboard.js';
import { sshManager } from './api/ssh.js';
import { escapeHtml } from './utils/html-utils.js';

// ==================== Состояние ====================

const state = {
  leftPath: '',
  rightPath: '',
  activePanel: 'left',
  isDarkTheme: true,
  showHiddenFiles: false,
};

// ==================== Инициализация ====================

async function init() {
  // Загрузка настроек
  loadSettings();

  // Получаем домашнюю директорию
  const homePath = await window.fileAPI.getCurrentPath();
  state.leftPath = homePath;
  state.rightPath = homePath;

  // Инициализация менеджеров
  initModals();
  initFileManagers();
  initKeyboard();
  initSsh();
  initTheme();

  // Первичная отрисовка
  updatePathInputs();
  updateActivePanel();
  updateStatusBar();

  // Загрузка панелей
  fileManagers.left.refresh(state.leftPath);
  fileManagers.right.refresh(state.rightPath);
}

// ==================== Файловые менеджеры ====================

let fileManagers = {};

function initFileManagers() {
  fileManagers = {
    left: new FileManager({
      panel: document.querySelector('.left-panel'),
      fileList: document.getElementById('left-file-list'),
      pathInput: document.getElementById('left-path'),
      statusElement: document.getElementById('status-left'),
      showHiddenFiles: state.showHiddenFiles,
      api: window.fileAPI,
      isSftp: false,
      onSelect: (item) => updateStatusBar(),
      onOpen: async (item) => {
        state.leftPath = item.path;
        updatePathInputs();
        await fileManagers.left.refresh(state.leftPath);
      },
    }),

    right: new FileManager({
      panel: document.querySelector('.right-panel'),
      fileList: document.getElementById('right-file-list'),
      pathInput: document.getElementById('right-path'),
      statusElement: document.getElementById('status-right'),
      showHiddenFiles: state.showHiddenFiles,
      api: window.fileAPI,
      isSftp: false,
      onSelect: (item) => updateStatusBar(),
      onOpen: async (item) => {
        if (state.sshMode && sshManager.isConnected()) {
          state.rightPath = item.path;
        } else {
          state.rightPath = item.path;
        }
        updatePathInputs();
        await fileManagers.right.refresh(state.rightPath);
      },
    }),
  };
}

// ==================== Модальные окна ====================

function initModals() {
  // Модальное окно создания папки
  modalManager.register('new-folder', {
    modal: document.getElementById('input-modal'),
    input: document.getElementById('modal-input'),
    okBtn: document.getElementById('modal-ok'),
    cancelBtn: document.getElementById('modal-cancel'),
    title: document.getElementById('modal-title'),
  });
  modalManager.setup('new-folder');

  // Модальное окно F5/F6
  modalManager.register('copy-move', {
    modal: document.getElementById('copy-move-modal'),
    input: document.getElementById('copy-move-dest'),
    okBtn: document.getElementById('copy-move-ok'),
    cancelBtn: document.getElementById('copy-move-cancel'),
    title: document.getElementById('copy-move-title'),
  });
  modalManager.setup('copy-move');

  // Модальное окно SSH
  modalManager.register('ssh', {
    modal: document.getElementById('ssh-modal'),
    input: document.getElementById('ssh-host'),
    okBtn: document.getElementById('ssh-ok'),
    cancelBtn: document.getElementById('ssh-cancel'),
    title: document.getElementById('ssh-title'),
  });
  modalManager.setup('ssh');
}

// ==================== Горячие клавиши ====================

let keyboardManager;

function initKeyboard() {
  keyboardManager = new KeyboardManager({
    inputElements: ['INPUT'],
  });

  // Глобальные клавиши (работают всегда)
  keyboardManager.register('F3', () => handleFuncButton('view'), true);
  keyboardManager.register('F4', () => handleFuncButton('edit'), true);
  keyboardManager.register('F5', () => handleFuncButton('copy'), true);
  keyboardManager.register('F6', () => handleFuncButton('move'), true);
  keyboardManager.register('F7', () => handleFuncButton('mkdir'), true);
  keyboardManager.register('F8', () => handleFuncButton('delete'), true);
  keyboardManager.register('F9', () => handleFuncButton('menu'), true);
  keyboardManager.register('F10', () => handleFuncButton('exit'), true);
  keyboardManager.register('Tab', handleTab, true);

  // Локальные клавиши (не работают в input)
  keyboardManager.register('Backspace', () => navigateUp(state.activePanel));
  keyboardManager.register('ArrowUp', () => navigateKeyboard('ArrowUp'));
  keyboardManager.register('ArrowDown', () => navigateKeyboard('ArrowDown'));

  keyboardManager.setup();
}

/**
 * Обработчик Tab - переключение между панелями
 */
function handleTab() {
  state.activePanel = state.activePanel === 'left' ? 'right' : 'left';
  updateActivePanel();
  updateStatusBar();
  return true;
}

// ==================== SSH ====================

function initSsh() {
  sshManager.loadSaved();

  sshManager.onConnect = (connId, host) => {
    state.sshMode = true;
    state.rightPath = '/';
    fileManagers.right.isSftp = true;
    fileManagers.right.sshConnId = connId;
    updatePathInputs();
    fileManagers.right.refresh(state.rightPath);
    showStatus(`Подключено к ${host}`);
  };

  sshManager.onDisconnect = () => {
    state.sshMode = false;
    fileManagers.right.isSftp = false;
    fileManagers.right.sshConnId = null;
    state.rightPath = await window.fileAPI.getCurrentPath();
    updatePathInputs();
    fileManagers.right.refresh(state.rightPath);
    showStatus('Отключено от SSH');
  };

  // Кнопка SSH
  document.getElementById('btn-ssh-connect').addEventListener('click', () => {
    if (sshManager.isConnected()) {
      if (confirm('Отключиться от SSH сервера?')) {
        sshManager.disconnect();
      }
    } else {
      modalManager.show('ssh', '🔗 Подключение к SSH/SFTP');
    }
  });

  // Обработчик подключения SSH
  modalManager.onOk('ssh', async () => {
    const config = {
      host: document.getElementById('ssh-host').value.trim(),
      port: parseInt(document.getElementById('ssh-port').value) || 22,
      username: document.getElementById('ssh-username').value.trim(),
      password: document.getElementById('ssh-password').value,
      saveConnection: document.getElementById('ssh-save-connection').checked,
    };

    if (!config.host || !config.username) {
      alert('Введите хост и имя пользователя');
      return;
    }

    try {
      await sshManager.connect(config);
    } catch (error) {
      alert(`Ошибка подключения: ${error.message}`);
    }
  });
}

// ==================== Тема ====================

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  state.isDarkTheme = savedTheme === 'dark';
  applyTheme();

  document.getElementById('btn-theme').addEventListener('click', () => {
    state.isDarkTheme = !state.isDarkTheme;
    applyTheme();
  });
}

function applyTheme() {
  const html = document.documentElement;
  if (state.isDarkTheme) {
    html.classList.add('dark');
    html.classList.remove('light');
    document.getElementById('theme-icon').textContent = '🌙';
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    document.getElementById('theme-icon').textContent = '☀️';
  }
  localStorage.setItem('theme', state.isDarkTheme ? 'dark' : 'light');
}

// ==================== Настройки ====================

function loadSettings() {
  try {
    const settings = localStorage.getItem('settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      state.showHiddenFiles = parsed.showHiddenFiles || false;
    }
  } catch (e) {
    console.error('Ошибка загрузки настроек:', e);
  }
}

// ==================== UI Функции ====================

function updatePathInputs() {
  document.getElementById('left-path').value = state.leftPath;
  document.getElementById('right-path').value = state.rightPath;
}

function updateActivePanel() {
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');

  if (state.activePanel === 'left') {
    leftPanel.classList.add('active');
    rightPanel.classList.remove('active');
  } else {
    rightPanel.classList.add('active');
    leftPanel.classList.remove('active');
  }
}

function updateStatusBar() {
  const panel = state.activePanel === 'left' ? fileManagers.left : fileManagers.right;
  const selected = panel.getSelected();

  const statusLeft = document.getElementById('status-left');
  const statusRight = document.getElementById('status-right');

  if (selected) {
    statusLeft.textContent = `Выбрано: ${selected.name}`;
  } else {
    statusLeft.textContent = `Путь: ${state[`${state.activePanel}Path`]}`;
  }

  statusRight.textContent = `${state.activePanel === 'left' ? 'Левая' : 'Правая'} панель | F3-F10 - действия`;
}

function showStatus(message) {
  document.getElementById('status-left').textContent = message;
  setTimeout(() => updateStatusBar(), 2000);
}

// ==================== Навигация ====================

async function navigateUp(panel) {
  const currentPath = state[`${panel}Path`];
  let newPath;

  if (panel === 'right' && sshManager.isConnected()) {
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    newPath = '/' + parts.join('/') || '/';
  } else {
    newPath = await window.fileAPI.navigateUp(currentPath);
  }

  state[`${panel}Path`] = newPath;
  updatePathInputs();
  await fileManagers[panel].refresh(newPath);
}

async function navigateKeyboard(key) {
  const panel = state.activePanel === 'left' ? fileManagers.left : fileManagers.right;
  const list = panel.fileList;
  const rows = Array.from(list.querySelectorAll('tbody tr'));
  const selected = panel.getSelected();

  let currentIndex = selected ? rows.findIndex(r => r.classList.contains('selected')) : -1;

  if (key === 'ArrowDown') {
    currentIndex = Math.min(currentIndex + 1, rows.length - 1);
  } else if (key === 'ArrowUp') {
    currentIndex = Math.max(currentIndex - 1, 0);
  }

  if (currentIndex >= 0 && currentIndex < rows.length) {
    rows.forEach(row => row.classList.remove('selected'));
    const row = rows[currentIndex];
    row.classList.add('selected');

    const nameCell = row.querySelector('td');
    if (nameCell) {
      const name = nameCell.textContent.trim().replace(/^[📁📄]\s*/, '');
      const items = await (sshManager.isConnected() && state.activePanel === 'right'
        ? window.sftpAPI.readDirectory(sshManager.getConnId(), state.rightPath)
        : window.fileAPI.readDirectory(state[`${state.activePanel}Path`]));

      const item = items.find(i => i.name === name);
      if (item) {
        panel.selectItem(item, row);
      }
    }
  }
}

// ==================== Функциональные кнопки ====================

function handleFuncButton(action) {
  const panel = state.activePanel === 'left' ? fileManagers.left : fileManagers.right;
  const selected = panel.getSelected();

  switch (action) {
    case 'view':
      if (selected) {
        if (selected.isDirectory) {
          panel.onOpen(selected);
        } else {
          alert(`Просмотр: ${selected.name}\n(функция в разработке)`);
        }
      } else {
        alert('Выберите файл');
      }
      break;

    case 'edit':
      if (selected) {
        alert(`Правка: ${selected.name}\n(функция в разработке)`);
      } else {
        alert('Выберите файл');
      }
      break;

    case 'copy':
      if (selected) {
        const targetPanel = state.activePanel === 'left' ? 'right' : 'left';
        const destPath = state[`${targetPanel}Path`];
        modalManager.show('copy-move', 'Копирование (F5)', `${destPath}/${selected.name}`);
        modalManager.callbacks.get('copy-move') = (destFullPath) => {
          window.fileAPI.copyItem(selected.path, destFullPath)
            .then(() => {
              fileManagers[targetPanel].refresh(state[`${targetPanel}Path`]);
              showStatus(`Скопировано в ${targetPanel === 'left' ? 'левую' : 'правую'} панель`);
            })
            .catch(error => alert(`Ошибка: ${error.message}`));
        };
      } else {
        alert('Выберите файл или папку');
      }
      break;

    case 'move':
      if (selected) {
        const targetPanel = state.activePanel === 'left' ? 'right' : 'left';
        const destPath = state[`${targetPanel}Path`];
        modalManager.show('copy-move', 'Перемещение (F6)', `${destPath}/${selected.name}`);
        modalManager.callbacks.get('copy-move') = (destFullPath) => {
          window.fileAPI.moveItem(selected.path, destFullPath)
            .then(() => {
              panel.clearSelection();
              fileManagers[state.activePanel].refresh(state[`${state.activePanel}Path`]);
              fileManagers[targetPanel].refresh(state[`${targetPanel}Path`]);
              showStatus(`Перемещено в ${targetPanel === 'left' ? 'левую' : 'правую'} панель`);
            })
            .catch(error => alert(`Ошибка: ${error.message}`));
        };
      } else {
        alert('Выберите файл или папку');
      }
      break;

    case 'mkdir':
      modalManager.show('new-folder', 'Новая папка', 'Новая папка');
      modalManager.callbacks.get('new-folder') = (name) => {
        if (name && name.trim()) {
          window.fileAPI.createDirectory(state[`${state.activePanel}Path`], name.trim())
            .then(() => panel.refresh(state[`${state.activePanel}Path`]))
            .catch(error => alert(`Ошибка: ${error.message}`));
        }
      };
      break;

    case 'delete':
      if (selected) {
        if (confirm(`Удалить "${selected.name}"?`)) {
          window.fileAPI.deleteItem(selected.path)
            .then(() => {
              panel.clearSelection();
              panel.refresh(state[`${state.activePanel}Path`]);
            })
            .catch(error => alert(`Ошибка: ${error.message}`));
        }
      } else {
        alert('Выберите файл или папку');
      }
      break;

    case 'menu':
      alert('Меню\n(функция в разработке)');
      break;

    case 'exit':
      if (confirm('Выйти из программы?')) {
        window.fileAPI.exitApp();
      }
      break;
  }
}

// ==================== Обработчики ====================

// Клик по панелям для активации
document.querySelector('.left-panel').addEventListener('click', (e) => {
  e.stopPropagation();
  state.activePanel = 'left';
  updateActivePanel();
  updateStatusBar();
});

document.querySelector('.right-panel').addEventListener('click', (e) => {
  e.stopPropagation();
  state.activePanel = 'right';
  updateActivePanel();
  updateStatusBar();
});

// Кнопка показать/скрыть скрытые файлы
document.getElementById('btn-toggle-hidden').addEventListener('click', () => {
  state.showHiddenFiles = !state.showHiddenFiles;
  fileManagers.left.toggleHiddenFiles(state.showHiddenFiles);
  fileManagers.right.toggleHiddenFiles(state.showHiddenFiles);
  fileManagers.left.refresh(state.leftPath);
  fileManagers.right.refresh(state.rightPath);
  showStatus(state.showHiddenFiles ? 'Показаны скрытые файлы' : 'Скрытые файлы скрыты');
});

// Клик по фону сбрасывает выделение
document.addEventListener('click', () => {
  const panel = state.activePanel === 'left' ? fileManagers.left : fileManagers.right;
  panel.clearSelection();
  updateStatusBar();
});

// ==================== Запуск ====================

init();
