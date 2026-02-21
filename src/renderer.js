/**
 * MyCommander Renderer - Полностью переписанная версия
 * Исправлены все баги: файлы, кнопки, темы, SSH
 */

// ==================== Состояние ====================
const state = {
  leftPath: '',
  rightPath: '',
  activePanel: 'left',
  isDarkTheme: true,
  showHiddenFiles: false,
  leftSelected: null,
  rightSelected: null,
  sshConnId: null,
  sshMode: false,
};

// ==================== Элементы ====================
const els = {};

function initElements() {
  els.leftPath = document.getElementById('left-path');
  els.rightPath = document.getElementById('right-path');
  els.leftFileList = document.getElementById('left-file-list');
  els.rightFileList = document.getElementById('right-file-list');
  els.leftPanel = document.querySelector('.left-panel');
  els.rightPanel = document.querySelector('.right-panel');
  els.statusLeft = document.getElementById('status-left');
  els.statusRight = document.getElementById('status-right');
  els.themeBtn = document.getElementById('btn-theme');
  els.themeIcon = document.getElementById('theme-icon');
  els.sshBtn = document.getElementById('btn-ssh');
  els.toggleHiddenBtn = document.getElementById('btn-toggle-hidden');
  
  // Модальные окна
  els.inputModal = document.getElementById('input-modal');
  els.inputModalTitle = document.getElementById('modal-title');
  els.inputModalInput = document.getElementById('modal-input');
  els.inputModalOk = document.getElementById('modal-ok');
  els.inputModalCancel = document.getElementById('modal-cancel');
  
  els.copyMoveModal = document.getElementById('copy-move-modal');
  els.copyMoveTitle = document.getElementById('copy-move-title');
  els.copyMoveSource = document.getElementById('copy-move-source');
  els.copyMoveDest = document.getElementById('copy-move-dest');
  els.copyMoveOk = document.getElementById('copy-move-ok');
  els.copyMoveCancel = document.getElementById('copy-move-cancel');
  
  // SSH модальное окно
  els.sshModal = document.getElementById('ssh-modal');
  els.sshName = document.getElementById('ssh-name');
  els.sshHost = document.getElementById('ssh-host');
  els.sshPort = document.getElementById('ssh-port');
  els.sshUsername = document.getElementById('ssh-username');
  els.sshPassword = document.getElementById('ssh-password');
  els.sshOk = document.getElementById('ssh-ok');
  els.sshCancel = document.getElementById('ssh-cancel');
}

// ==================== Утилиты ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ==================== Тема ====================
function loadTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  state.isDarkTheme = saved === 'dark';
  applyTheme();
}

function applyTheme() {
  const html = document.documentElement;
  if (state.isDarkTheme) {
    html.classList.add('dark');
    html.classList.remove('light');
    els.themeIcon.textContent = '🌙';
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    els.themeIcon.textContent = '☀️';
  }
  localStorage.setItem('theme', state.isDarkTheme ? 'dark' : 'light');
}

function toggleTheme() {
  state.isDarkTheme = !state.isDarkTheme;
  applyTheme();
}

// ==================== Панели файлов ====================
async function refreshPanel(panel) {
  const path = state[`${panel}Path`];
  const fileList = els[`${panel}FileList`];
  const tbody = fileList.querySelector('tbody');
  tbody.innerHTML = '';

  try {
    let items;
    const isSftp = panel === 'right' && state.sshMode && state.sshConnId;

    if (isSftp) {
      console.log('SFTP read:', state.sshConnId, path);
      items = await window.sftpAPI.readDirectory(state.sshConnId, path);
      console.log('SFTP items:', items);
    } else {
      items = await window.fileAPI.readDirectory(path);
    }

    // Фильтрация скрытых файлов
    if (!state.showHiddenFiles) {
      items = items.filter(item => !item.name.startsWith('.'));
    }

    // Сортировка: папки primero, потом файлы
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    // Добавляем ".." если не в корне
    const rootPath = isSftp ? '/' : await window.fileAPI.getCurrentPath();
    console.log('rootPath:', rootPath, 'path:', path);
    if (path !== rootPath) {
      const tr = createFileRow({ name: '..', isDirectory: true, isParent: true }, panel);
      tbody.appendChild(tr);
    }

    // Добавляем файлы
    for (const item of items) {
      const tr = createFileRow(item, panel);
      tbody.appendChild(tr);
    }

    // Загружаем детали (размеры, даты)
    if (!isSftp) {
      loadFileDetails(items, tbody, rootPath);
    }

  } catch (error) {
    console.error('refreshPanel error:', error);
    tbody.innerHTML = `<tr><td colspan="3" class="px-3 py-2 text-red-400">Ошибка: ${escapeHtml(error.message)}</td></tr>`;
  }

  updateStatusBar();
}

function createFileRow(item, panel) {
  const tr = document.createElement('tr');
  tr.className = 'file-row';
  
  const icon = item.isDirectory ? '📁' : '📄';
  const size = item.isDirectory ? '' : formatSize(item.size || 0);
  const date = item.modified ? formatDate(item.modified) : '';

  tr.innerHTML = `
    <td class="px-3 py-1.5 border-b"><span class="mr-2">${icon}</span>${escapeHtml(item.name)}</td>
    <td class="px-3 py-1.5 border-b size-cell">${size}</td>
    <td class="px-3 py-1.5 border-b date-cell">${date}</td>
  `;

  tr.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!item.isParent) {
      selectItem(panel, item, tr);
    }
  });

  tr.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (item.isParent) {
      navigateUp(panel);
    } else {
      openItem(panel, item);
    }
  });

  return tr;
}

async function loadFileDetails(items, tbody, rootPath) {
  const offset = rootPath !== await window.fileAPI.getCurrentPath() ? 1 : 0;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = tbody.children[i + offset];
    if (!row) continue;

    try {
      const info = await window.fileAPI.getFileInfo(item.path);
      const sizeCell = row.querySelector('.size-cell');
      const dateCell = row.querySelector('.date-cell');
      if (sizeCell) sizeCell.textContent = item.isDirectory ? '' : formatSize(info.size);
      if (dateCell) dateCell.textContent = formatDate(info.modified);
    } catch (e) {}
  }
}

function selectItem(panel, item, tr) {
  const list = els[`${panel}FileList`];
  list.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
  tr.classList.add('selected');
  state[`${panel}Selected`] = item;
  updateStatusBar();
}

async function openItem(panel, item) {
  if (item.isDirectory) {
    state[`${panel}Path`] = item.path;
    updatePathInputs();
    await refreshPanel(panel);
  }
}

async function navigateUp(panel) {
  const currentPath = state[`${panel}Path`];
  let newPath;
  
  if (panel === 'right' && state.sshMode) {
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    newPath = '/' + parts.join('/') || '/';
  } else {
    newPath = await window.fileAPI.navigateUp(currentPath);
  }
  
  state[`${panel}Path`] = newPath;
  updatePathInputs();
  await refreshPanel(panel);
}

function updatePathInputs() {
  let leftPath = state.leftPath;
  let rightPath = state.rightPath;
  
  // Исправляем двойной слеш
  if (rightPath === '//') rightPath = '/';
  if (leftPath === '//') leftPath = '/';
  
  els.leftPath.value = leftPath;
  els.rightPath.value = rightPath;
}

function updateActivePanel() {
  if (state.activePanel === 'left') {
    els.leftPanel.classList.add('active');
    els.rightPanel.classList.remove('active');
  } else {
    els.rightPanel.classList.add('active');
    els.leftPanel.classList.remove('active');
  }
}

function updateStatusBar() {
  const panel = state.activePanel === 'left' ? 'left' : 'right';
  const selected = state[`${panel}Selected`];
  
  if (selected) {
    els.statusLeft.textContent = `Выбрано: ${selected.name}`;
  } else {
    els.statusLeft.textContent = `Путь: ${state[`${panel}Path`]}`;
  }
  
  els.statusRight.textContent = `${panel === 'left' ? 'Левая' : 'Правая'} панель | F3-F10`;
}

function showStatus(message) {
  els.statusLeft.textContent = message;
  setTimeout(() => updateStatusBar(), 2000);
}

// ==================== Модальные окна ====================
let modalCallback = null;
let copyMoveCallback = null;

function showInputModal(title, defaultValue, callback) {
  els.inputModalTitle.textContent = title;
  els.inputModalInput.value = defaultValue;
  els.inputModal.style.display = 'flex';
  els.inputModalInput.focus();
  els.inputModalInput.select();
  modalCallback = callback;
}

function hideInputModal() {
  els.inputModal.style.display = 'none';
  modalCallback = null;
}

function showCopyMoveModal(title, source, dest, callback) {
  els.copyMoveTitle.textContent = title;
  els.copyMoveSource.textContent = source;
  els.copyMoveDest.value = dest;
  els.copyMoveModal.style.display = 'flex';
  els.copyMoveDest.focus();
  els.copyMoveDest.select();
  copyMoveCallback = callback;
}

function hideCopyMoveModal() {
  els.copyMoveModal.style.display = 'none';
  copyMoveCallback = null;
}

// ==================== SSH ====================
function showSshModal() {
  els.sshName.value = '';
  els.sshHost.value = '';
  els.sshPort.value = '22';
  els.sshUsername.value = '';
  els.sshPassword.value = '';
  els.sshModal.style.display = 'flex';
  els.sshHost.focus();
}

function hideSshModal() {
  els.sshModal.style.display = 'none';
}

async function connectToSsh() {
  const config = {
    name: els.sshName.value.trim(),
    host: els.sshHost.value.trim(),
    port: parseInt(els.sshPort.value) || 22,
    username: els.sshUsername.value.trim(),
    password: els.sshPassword.value,
  };

  if (!config.host || !config.username || !config.password) {
    alert('Введите хост, имя пользователя и пароль');
    return;
  }

  try {
    const result = await window.sftpAPI.connect(config);
    if (result.error) throw new Error(result.error);

    state.sshConnId = result.connId;
    state.sshMode = true;
    state.rightPath = '/';
    
    // Сохраняем подключение
    if (config.name) {
      const saved = JSON.parse(localStorage.getItem('sshConnections') || '[]');
      saved.push({
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
      });
      localStorage.setItem('sshConnections', JSON.stringify(saved));
    }

    hideSshModal();
    updatePathInputs();
    await refreshPanel('right');
    showStatus(`Подключено к ${config.host}`);

  } catch (error) {
    alert(`Ошибка: ${error.message}`);
  }
}

async function disconnectFromSsh() {
  if (state.sshConnId) {
    await window.sftpAPI.disconnect(state.sshConnId);
    state.sshConnId = null;
    state.sshMode = false;
    state.rightPath = await window.fileAPI.getCurrentPath();
    updatePathInputs();
    await refreshPanel('right');
    showStatus('Отключено');
  }
}

// ==================== Функциональные кнопки ====================
function handleFuncButton(action) {
  const panel = state.activePanel;
  const selected = state[`${panel}Selected`];

  switch(action) {
    case 'view':
      if (selected) {
        if (selected.isDirectory) openItem(panel, selected);
        else alert(`Просмотр: ${selected.name}`);
      } else alert('Выберите файл');
      break;

    case 'edit':
      if (selected) alert(`Правка: ${selected.name}`);
      else alert('Выберите файл');
      break;

    case 'copy':
      if (selected) {
        const target = panel === 'left' ? 'right' : 'left';
        const dest = `${state[`${target}Path`]}/${selected.name}`;
        showCopyMoveModal('Копирование (F5)', selected.path, dest, (destPath) => {
          window.fileAPI.copyItem(selected.path, destPath)
            .then(() => { refreshPanel(target); showStatus('Скопировано'); })
            .catch(e => alert(`Ошибка: ${e.message}`));
        });
      } else alert('Выберите файл');
      break;

    case 'move':
      if (selected) {
        const target = panel === 'left' ? 'right' : 'left';
        const dest = `${state[`${target}Path`]}/${selected.name}`;
        showCopyMoveModal('Перемещение (F6)', selected.path, dest, (destPath) => {
          window.fileAPI.moveItem(selected.path, destPath)
            .then(() => { state[`${panel}Selected`] = null; refreshPanel(panel); refreshPanel(target); showStatus('Перемещено'); })
            .catch(e => alert(`Ошибка: ${e.message}`));
        });
      } else alert('Выберите файл');
      break;

    case 'mkdir':
      showInputModal('Новая папка', 'Новая папка', (name) => {
        if (name) {
          window.fileAPI.createDirectory(state[`${panel}Path`], name)
            .then(() => refreshPanel(panel))
            .catch(e => alert(`Ошибка: ${e.message}`));
        }
      });
      break;

    case 'delete':
      if (selected) {
        if (confirm(`Удалить "${selected.name}"?`)) {
          window.fileAPI.deleteItem(selected.path)
            .then(() => { state[`${panel}Selected`] = null; refreshPanel(panel); })
            .catch(e => alert(`Ошибка: ${e.message}`));
        }
      } else alert('Выберите файл');
      break;

    case 'menu':
      alert('Меню (в разработке)');
      break;

    case 'exit':
      if (confirm('Выйти?')) window.fileAPI.exitApp();
      break;
  }
}

// ==================== Инициализация ====================
async function init() {
  initElements();
  loadTheme();

  const homePath = await window.fileAPI.getCurrentPath();
  state.leftPath = homePath;
  state.rightPath = homePath;

  updatePathInputs();
  updateActivePanel();
  updateStatusBar();

  await refreshPanel('left');
  await refreshPanel('right');

  setupEventListeners();
}

// ==================== Обработчики ====================
function setupEventListeners() {
  // Клик по панелям
  els.leftPanel.addEventListener('click', (e) => {
    e.stopPropagation();
    state.activePanel = 'left';
    updateActivePanel();
    updateStatusBar();
  });

  els.rightPanel.addEventListener('click', (e) => {
    e.stopPropagation();
    state.activePanel = 'right';
    updateActivePanel();
    updateStatusBar();
  });

  // Тема
  els.themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTheme();
  });

  // Показать/скрыть скрытые файлы
  els.toggleHiddenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.showHiddenFiles = !state.showHiddenFiles;
    refreshPanel('left');
    refreshPanel('right');
    showStatus(state.showHiddenFiles ? 'Показаны скрытые' : 'Скрытые скрыты');
  });

  // SSH кнопка
  els.sshBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.sshMode) {
      if (confirm('Отключиться от SSH?')) disconnectFromSsh();
    } else {
      showSshModal();
    }
  });

  // SSH модальное окно
  els.sshOk.addEventListener('click', () => connectToSsh());
  els.sshCancel.addEventListener('click', () => hideSshModal());
  els.sshPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectToSsh(); });
  els.sshModal.addEventListener('click', (e) => { if (e.target === els.sshModal) hideSshModal(); });

  // Input модальное окно
  els.inputModalOk.addEventListener('click', () => {
    const value = els.inputModalInput.value.trim();
    hideInputModal();
    if (modalCallback) modalCallback(value);
  });
  els.inputModalCancel.addEventListener('click', hideInputModal);
  els.inputModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.inputModalOk.click();
    if (e.key === 'Escape') els.inputModalCancel.click();
  });
  els.inputModal.addEventListener('click', (e) => { if (e.target === els.inputModal) hideInputModal(); });

  // Copy/Move модальное окно
  els.copyMoveOk.addEventListener('click', () => {
    const value = els.copyMoveDest.value.trim();
    hideCopyMoveModal();
    if (copyMoveCallback) copyMoveCallback(value);
  });
  els.copyMoveCancel.addEventListener('click', hideCopyMoveModal);
  els.copyMoveDest.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.copyMoveOk.click();
    if (e.key === 'Escape') els.copyMoveCancel.click();
  });
  els.copyMoveModal.addEventListener('click', (e) => { if (e.target === els.copyMoveModal) hideCopyMoveModal(); });

  // Клик по фону сбрасывает выделение
  document.addEventListener('click', () => {
    const list = els[`${state.activePanel}FileList`];
    list.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
    state[`${state.activePanel}Selected`] = null;
    updateStatusBar();
  });

  // Горячие клавиши
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'F7') { e.preventDefault(); handleFuncButton('mkdir'); }
      return;
    }

    switch(e.key) {
      case 'F3': e.preventDefault(); handleFuncButton('view'); break;
      case 'F4': e.preventDefault(); handleFuncButton('edit'); break;
      case 'F5': e.preventDefault(); handleFuncButton('copy'); break;
      case 'F6': e.preventDefault(); handleFuncButton('move'); break;
      case 'F7': e.preventDefault(); handleFuncButton('mkdir'); break;
      case 'F8': e.preventDefault(); handleFuncButton('delete'); break;
      case 'F9': e.preventDefault(); handleFuncButton('menu'); break;
      case 'F10': e.preventDefault(); handleFuncButton('exit'); break;
      case 'Tab': e.preventDefault(); state.activePanel = state.activePanel === 'left' ? 'right' : 'left'; updateActivePanel(); updateStatusBar(); break;
      case 'Backspace': e.preventDefault(); navigateUp(state.activePanel); break;
      case 'ArrowUp': case 'ArrowDown': e.preventDefault(); navigateKeyboard(e.key); break;
    }
  });
}

// ==================== Навигация клавиатурой ====================
async function navigateKeyboard(key) {
  const list = els[`${state.activePanel}FileList`];
  const rows = Array.from(list.querySelectorAll('tbody tr'));
  const selected = state[`${state.activePanel}Selected`];
  
  let idx = selected ? rows.findIndex(r => r.classList.contains('selected')) : -1;
  
  if (key === 'ArrowDown') idx = Math.min(idx + 1, rows.length - 1);
  if (key === 'ArrowUp') idx = Math.max(idx - 1, 0);
  
  if (idx >= 0 && idx < rows.length) {
    rows.forEach(r => r.classList.remove('selected'));
    const row = rows[idx];
    row.classList.add('selected');
    
    const nameCell = row.querySelector('td');
    if (nameCell) {
      const name = nameCell.textContent.trim().replace(/^[📁📄]\s*/, '');
      const items = await window.fileAPI.readDirectory(state[`${state.activePanel}Path`]);
      const item = items.find(i => i.name === name);
      if (item) {
        state[`${state.activePanel}Selected`] = item;
        updateStatusBar();
      }
    }
  }
}

// ==================== Запуск ====================
init();
