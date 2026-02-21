// Состояние приложения
const state = {
  leftPath: '',
  rightPath: '',
  activePanel: 'left',
  leftSelected: null,
  rightSelected: null,
  isDarkTheme: true,
  showHiddenFiles: false,
};

// Элементы DOM
const elements = {
  leftPath: document.getElementById('left-path'),
  rightPath: document.getElementById('right-path'),
  leftFileList: document.getElementById('left-file-list'),
  rightFileList: document.getElementById('right-file-list'),
  leftPanel: document.querySelector('.left-panel'),
  rightPanel: document.querySelector('.right-panel'),
  statusLeft: document.getElementById('status-left'),
  statusRight: document.getElementById('status-right'),
  themeBtn: document.getElementById('btn-theme'),
  themeIcon: document.getElementById('theme-icon'),
  html: document.documentElement,
  modal: document.getElementById('input-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalInput: document.getElementById('modal-input'),
  modalOk: document.getElementById('modal-ok'),
  modalCancel: document.getElementById('modal-cancel'),
  btnToggleHidden: document.getElementById('btn-toggle-hidden'),
  // Элементы модального окна F5/F6
  copyMoveModal: document.getElementById('copy-move-modal'),
  copyMoveTitle: document.getElementById('copy-move-title'),
  copyMoveSource: document.getElementById('copy-move-source'),
  copyMoveDest: document.getElementById('copy-move-dest'),
  copyMoveOk: document.getElementById('copy-move-ok'),
  copyMoveCancel: document.getElementById('copy-move-cancel'),
  copyMoveOverwrite: document.getElementById('copy-move-overwrite'),
};

// Модальное окно
let modalCallback = null;
let copyMoveCallback = null;

function showModal(title, defaultValue = '') {
  elements.modalTitle.textContent = title;
  elements.modalInput.value = defaultValue;
  elements.modal.style.display = 'flex';
  elements.modalInput.focus();
  elements.modalInput.select();
}

function hideModal() {
  elements.modal.style.display = 'none';
}

function showModalWithCallback(title, defaultValue, callback) {
  modalCallback = callback;
  showModal(title, defaultValue);
}

// Модальное окно для F5/F6
function showCopyMoveModal(isCopy, sourcePath, sourceName, destPath, callback) {
  elements.copyMoveTitle.textContent = isCopy ? 'Копирование (F5)' : 'Перемещение (F6)';
  elements.copyMoveSource.textContent = sourcePath;
  elements.copyMoveDest.value = `${destPath}/${sourceName}`;
  elements.copyMoveOverwrite.checked = false;
  elements.copyMoveModal.style.display = 'flex';
  elements.copyMoveDest.focus();
  elements.copyMoveDest.select();
  copyMoveCallback = callback;
}

function hideCopyMoveModal() {
  elements.copyMoveModal.style.display = 'none';
}

// Инициализация
async function init() {
  const homePath = await window.fileAPI.getCurrentPath();
  state.leftPath = homePath;
  state.rightPath = homePath;
  
  // Загрузка сохранённой темы
  loadTheme();
  
  await refreshPanel('left');
  await refreshPanel('right');
  updatePathInputs();
  updateActivePanel();
  setupEventListeners();
  updateStatusBar();
}

// Обновление панели
async function refreshPanel(panel) {
  const path = state[`${panel}Path`];
  const fileList = elements[`${panel}FileList`];
  const tbody = fileList.querySelector('tbody');

  try {
    let items = await window.fileAPI.readDirectory(path);

    // Фильтрация скрытых файлов
    if (!state.showHiddenFiles) {
      items = items.filter(item => !item.name.startsWith('.'));
    }

    // Сортировка: сначала папки, потом файлы
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    tbody.innerHTML = '';
    
    // Добавляем ".." если не в корне
    const currentPath = await window.fileAPI.getCurrentPath();
    if (path !== currentPath) {
      const tr = document.createElement('tr');
      tr.className = 'file-row';
      tr.innerHTML = `
        <td class="px-3 py-1.5 border-b border-border"><span class="mr-2">📁</span>..</td>
        <td class="px-3 py-1.5 border-b border-border"></td>
        <td class="px-3 py-1.5 border-b border-border"></td>
      `;
      tr.addEventListener('dblclick', () => navigateUp(panel));
      tr.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activePanel = panel;
        updateActivePanel();
        updateStatusBar();
      });
      tbody.appendChild(tr);
    }
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const tr = document.createElement('tr');
      tr.className = 'file-row';
      tr.dataset.index = i;
      const icon = item.isDirectory ? '📁' : '📄';
      
      tr.innerHTML = `
        <td class="px-3 py-1.5 border-b border-border"><span class="mr-2">${icon}</span>${escapeHtml(item.name)}</td>
        <td class="px-3 py-1.5 border-b border-border size-cell"></td>
        <td class="px-3 py-1.5 border-b border-border date-cell"></td>
      `;
      
      tr.addEventListener('click', (e) => {
        e.stopPropagation();
        selectItem(panel, item, tr);
      });
      tr.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openItem(panel, item);
      });
      
      tbody.appendChild(tr);
    }
    
    // Загружаем дополнительную информацию (размер и дата)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = tbody.children[i + (path !== currentPath ? 1 : 0)];
      if (row) {
        try {
          const info = await window.fileAPI.getFileInfo(item.path);
          const sizeCell = row.querySelector('.size-cell');
          const dateCell = row.querySelector('.date-cell');
          if (sizeCell) sizeCell.textContent = item.isDirectory ? '' : formatSize(info.size);
          if (dateCell) dateCell.textContent = formatDate(info.modified);
        } catch (e) {
          // Игнорируем ошибки для отдельных файлов
        }
      }
    }
    
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="3" class="px-3 py-2 text-red-400">Ошибка: ${escapeHtml(error.message)}</td></tr>`;
  }
  
  updateStatusBar();
}

// Выбор элемента
function selectItem(panel, item, tr) {
  // Переключаем активную панель на ту, по которой кликнули
  state.activePanel = panel;
  updateActivePanel();
  
  const list = elements[`${panel}FileList`];
  list.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
  tr.classList.add('selected');
  state[`${panel}Selected`] = item;
  updateStatusBar();
}

// Открытие элемента
async function openItem(panel, item) {
  if (item.isDirectory) {
    // Переключаем активную панель перед открытием
    state.activePanel = panel;
    updateActivePanel();
    state[`${panel}Path`] = item.path;
    updatePathInputs();
    await refreshPanel(panel);
  }
}

// Навигация вверх
async function navigateUp(panel) {
  const currentPath = state[`${panel}Path`];
  const newPath = await window.fileAPI.navigateUp(currentPath);
  state[`${panel}Path`] = newPath;
  updatePathInputs();
  await refreshPanel(panel);
}

// Обновление полей пути
function updatePathInputs() {
  elements.leftPath.value = state.leftPath;
  elements.rightPath.value = state.rightPath;
}

// Форматирование размера
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Форматирование даты
function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Обновление статусной строки
function updateStatusBar() {
  const selected = state[`${state.activePanel}Selected`];
  if (selected) {
    elements.statusLeft.textContent = `Выбрано: ${selected.name}`;
  } else {
    elements.statusLeft.textContent = `Путь: ${state[`${state.activePanel}Path`]}`;
  }
  elements.statusRight.textContent = `${state.activePanel === 'left' ? 'Левая' : 'Правая'} панель активна | F5-Копировать | F6-Переместить | F7-Папка | F8-Удалить`;
}

// Обновление активной панели
function updateActivePanel() {
  if (state.activePanel === 'left') {
    elements.leftPanel.classList.add('active');
    elements.rightPanel.classList.remove('active');
  } else {
    elements.rightPanel.classList.add('active');
    elements.leftPanel.classList.remove('active');
  }
}

// Переключение темы
function toggleTheme() {
  state.isDarkTheme = !state.isDarkTheme;
  applyTheme();
}

// Применение темы
function applyTheme() {
  if (state.isDarkTheme) {
    elements.html.classList.remove('light-theme');
    elements.themeIcon.textContent = '🌙';
  } else {
    elements.html.classList.add('light-theme');
    elements.themeIcon.textContent = '☀️';
  }
  localStorage.setItem('theme', state.isDarkTheme ? 'dark' : 'light');
}

// Загрузка темы
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  state.isDarkTheme = savedTheme === 'dark';
  applyTheme();
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Клик по панелям для активации
  elements.leftPanel.addEventListener('click', (e) => {
    e.stopPropagation();
    state.activePanel = 'left';
    updateActivePanel();
    updateStatusBar();
  });
  
  elements.rightPanel.addEventListener('click', (e) => {
    e.stopPropagation();
    state.activePanel = 'right';
    updateActivePanel();
    updateStatusBar();
  });
  
  // Переключатель темы
  elements.themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTheme();
  });

  // Кнопка Показать/Скрыть
  elements.btnToggleHidden.addEventListener('click', (e) => {
    e.stopPropagation();
    state.showHiddenFiles = !state.showHiddenFiles;
    refreshPanel('left');
    refreshPanel('right');
    showStatus(state.showHiddenFiles ? 'Показаны скрытые файлы' : 'Скрытые файлы скрыты');
  });

  // Функциональные кнопки (F3-F10)
  document.querySelectorAll('.btn-func').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleFuncButton(action);
    });
  });

  function handleFuncButton(action) {
    switch(action) {
      case 'view':
        // F3 Просмотр - пока заглушка
        const selected = state[`${state.activePanel}Selected`];
        if (selected) {
          if (selected.isDirectory) {
            openItem(state.activePanel, selected);
          } else {
            alert(`Просмотр: ${selected.name}\n(функция в разработке)`);
          }
        } else {
          alert('Выберите файл');
        }
        break;
      case 'edit':
        // F4 Правка - пока заглушка
        const sel = state[`${state.activePanel}Selected`];
        if (sel) {
          alert(`Правка: ${sel.name}\n(функция в разработке)`);
        } else {
          alert('Выберите файл');
        }
        break;
      case 'copy':
        // F5 Копировать
        const selectedCopy = state[`${state.activePanel}Selected`];
        if (selectedCopy) {
          const targetPanel = state.activePanel === 'left' ? 'right' : 'left';
          const destPath = state[`${targetPanel}Path`];
          showCopyMoveModal(true, selectedCopy.path, selectedCopy.name, destPath, (destFullPath, overwrite) => {
            window.fileAPI.copyItem(selectedCopy.path, destFullPath)
              .then(() => {
                refreshPanel(targetPanel);
                showStatus(`Скопировано в ${targetPanel === 'left' ? 'левую' : 'правую'} панель`);
              })
              .catch(error => alert(`Ошибка: ${error.message}`));
          });
        } else {
          alert('Выберите файл или папку');
        }
        break;
      case 'move':
        // F6 Переместить
        const selectedMove = state[`${state.activePanel}Selected`];
        if (selectedMove) {
          const targetPanel = state.activePanel === 'left' ? 'right' : 'left';
          const destPath = state[`${targetPanel}Path`];
          showCopyMoveModal(false, selectedMove.path, selectedMove.name, destPath, (destFullPath, overwrite) => {
            window.fileAPI.moveItem(selectedMove.path, destFullPath)
              .then(() => {
                state[`${state.activePanel}Selected`] = null;
                refreshPanel(state.activePanel);
                refreshPanel(targetPanel);
                showStatus(`Перемещено в ${targetPanel === 'left' ? 'левую' : 'правую'} панель`);
              })
              .catch(error => alert(`Ошибка: ${error.message}`));
          });
        } else {
          alert('Выберите файл или папку');
        }
        break;
      case 'mkdir':
        // F7 Каталог (новая папка)
        showModalWithCallback('Новая папка', 'Новая папка', (name) => {
          if (name && name.trim()) {
            window.fileAPI.createDirectory(state[`${state.activePanel}Path`], name.trim())
              .then(() => refreshPanel(state.activePanel))
              .catch(error => alert(`Ошибка: ${error.message}`));
          }
        });
        break;
      case 'delete':
        // F8 Удалить
        const selectedDel = state[`${state.activePanel}Selected`];
        if (selectedDel) {
          if (confirm(`Удалить "${selectedDel.name}"?`)) {
            window.fileAPI.deleteItem(selectedDel.path)
              .then(() => {
                state[`${state.activePanel}Selected`] = null;
                refreshPanel(state.activePanel);
              })
              .catch(error => alert(`Ошибка: ${error.message}`));
          }
        } else {
          alert('Выберите файл или папку');
        }
        break;
      case 'menu':
        // F9 Меню - пока заглушка
        alert('Меню\n(функция в разработке)');
        break;
      case 'exit':
        // F10 Выход
        if (confirm('Выйти из программы?')) {
          window.fileAPI.exitApp();
        }
        break;
    }
  }
  
  // Клик по фону сбрасывает выделение
  document.addEventListener('click', () => {
    const list = elements[`${state.activePanel}FileList`];
    list.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
    state[`${state.activePanel}Selected`] = null;
    updateStatusBar();
  });

  // Редактирование пути - фокус
  elements.leftPath.addEventListener('focus', () => {
    state.activePanel = 'left';
    updateActivePanel();
    elements.leftPath.select();
  });

  elements.rightPath.addEventListener('focus', () => {
    state.activePanel = 'right';
    updateActivePanel();
    elements.rightPath.select();
  });

  // Редактирование пути - Enter
  elements.leftPath.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newPath = elements.leftPath.value.trim();
      try {
        await window.fileAPI.readDirectory(newPath);
        state.leftPath = newPath;
        await refreshPanel('left');
        elements.leftPath.blur();
      } catch (error) {
        alert(`Неверный путь: ${error.message}`);
        elements.leftPath.value = state.leftPath;
      }
    }
  });

  elements.leftPath.addEventListener('blur', () => {
    elements.leftPath.value = state.leftPath;
  });

  elements.rightPath.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newPath = elements.rightPath.value.trim();
      try {
        await window.fileAPI.readDirectory(newPath);
        state.rightPath = newPath;
        await refreshPanel('right');
        elements.rightPath.blur();
      } catch (error) {
        alert(`Неверный путь: ${error.message}`);
        elements.rightPath.value = state.rightPath;
      }
    }
  });

  elements.rightPath.addEventListener('blur', () => {
    elements.rightPath.value = state.rightPath;
  });

  // Модальное окно - кнопки
  elements.modalOk.addEventListener('click', () => {
    const value = elements.modalInput.value.trim();
    hideModal();
    if (modalCallback) {
      modalCallback(value);
      modalCallback = null;
    }
  });

  elements.modalCancel.addEventListener('click', () => {
    hideModal();
    modalCallback = null;
  });

  elements.modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      elements.modalOk.click();
    } else if (e.key === 'Escape') {
      elements.modalCancel.click();
    }
  });

  // Закрытие по клику вне окна
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
      elements.modalCancel.click();
    }
  });

  // Модальное окно F5/F6 - кнопки
  elements.copyMoveOk.addEventListener('click', () => {
    const destFullPath = elements.copyMoveDest.value.trim();
    const overwrite = elements.copyMoveOverwrite.checked;
    hideCopyMoveModal();
    if (copyMoveCallback) {
      copyMoveCallback(destFullPath, overwrite);
      copyMoveCallback = null;
    }
  });

  elements.copyMoveCancel.addEventListener('click', () => {
    hideCopyMoveModal();
    copyMoveCallback = null;
  });

  elements.copyMoveDest.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      elements.copyMoveOk.click();
    } else if (e.key === 'Escape') {
      elements.copyMoveCancel.click();
    }
  });

  // Закрытие по клику вне окна
  elements.copyMoveModal.addEventListener('click', (e) => {
    if (e.target === elements.copyMoveModal) {
      elements.copyMoveCancel.click();
    }
  });
  
  // Горячие клавиши
  document.addEventListener('keydown', async (e) => {
    // F3-F10 работают всегда
    if (e.key === 'F3') {
      e.preventDefault();
      handleFuncButton('view');
      return;
    }
    if (e.key === 'F4') {
      e.preventDefault();
      handleFuncButton('edit');
      return;
    }
    if (e.key === 'F5') {
      e.preventDefault();
      handleFuncButton('copy');
      return;
    }
    if (e.key === 'F6') {
      e.preventDefault();
      handleFuncButton('move');
      return;
    }
    if (e.key === 'F7') {
      e.preventDefault();
      handleFuncButton('mkdir');
      return;
    }
    if (e.key === 'F8') {
      e.preventDefault();
      handleFuncButton('delete');
      return;
    }
    if (e.key === 'F9') {
      e.preventDefault();
      handleFuncButton('menu');
      return;
    }
    if (e.key === 'F10') {
      e.preventDefault();
      handleFuncButton('exit');
      return;
    }
    
    // Tab работает всегда (переключение панелей)
    if (e.key === 'Tab') {
      e.preventDefault();
      state.activePanel = state.activePanel === 'left' ? 'right' : 'left';
      updateActivePanel();
      updateStatusBar();
      return;
    }
    
    // Игнорируем если фокус в input (для остальных клавиш)
    if (e.target.tagName === 'INPUT') return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      navigateUp(state.activePanel);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      navigateKeyboard(e.key);
    }
  });
}

// Навигация клавиатурой
async function navigateKeyboard(key) {
  const list = elements[`${state.activePanel}FileList`];
  const rows = Array.from(list.querySelectorAll('tbody tr'));
  const selected = state[`${state.activePanel}Selected`];
  
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
    
    // Получаем данные из строки
    const nameCell = row.querySelector('td');
    if (nameCell) {
      const name = nameCell.textContent.trim().replace(/^[📁📄]\s*/, '');
      const path = state[`${state.activePanel}Path`];
      const items = await window.fileAPI.readDirectory(path);
      const item = items.find(i => i.name === name);
      if (item) {
        state[`${state.activePanel}Selected`] = item;
        updateStatusBar();
      }
    }
  }
}

// Показ сообщения в статусе
function showStatus(message) {
  elements.statusLeft.textContent = message;
  setTimeout(() => updateStatusBar(), 2000);
}

// Запуск
init();
