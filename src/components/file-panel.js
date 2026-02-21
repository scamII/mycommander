/**
 * Компонент управления панелями файлов
 */

import { escapeHtml, formatSize, formatDate, filterHiddenFiles, sortItems } from '../utils/html-utils.js';

export class FileManager {
  constructor(options = {}) {
    this.panel = options.panel;
    this.fileList = options.fileList;
    this.pathInput = options.pathInput;
    this.statusElement = options.statusElement;
    this.showHiddenFiles = options.showHiddenFiles || false;
    this.selectedItem = null;
    this.onSelect = options.onSelect || (() => {});
    this.onOpen = options.onOpen || (() => {});
    this.api = options.api; // fileAPI или sftpAPI
    this.isSftp = options.isSftp || false;
    this.sshConnId = options.sshConnId || null;
  }

  /**
   * Обновляет содержимое панели
   * @param {string} currentPath - Текущий путь
   */
  async refresh(currentPath) {
    const tbody = this.fileList.querySelector('tbody');
    tbody.innerHTML = '';

    try {
      let items;
      if (this.isSftp && this.sshConnId) {
        items = await this.api.readDirectory(this.sshConnId, currentPath);
      } else {
        items = await this.api.readDirectory(currentPath);
      }

      // Фильтрация и сортировка
      items = filterHiddenFiles(items, this.showHiddenFiles);
      items = sortItems(items);

      // Добавляем ".." если не в корне
      const rootPath = await this.api.getCurrentPath();
      if (currentPath !== rootPath) {
        const tr = this.createRow({
          name: '..',
          path: '..',
          isDirectory: true,
          isParent: true,
        });
        tbody.appendChild(tr);
      }

      // Добавляем файлы
      for (const item of items) {
        const tr = this.createRow(item);
        tbody.appendChild(tr);
      }

      // Загружаем размеры и даты (асинхронно)
      this.loadFileDetails(items, tbody, rootPath);

    } catch (error) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-3 py-2 text-red-400">
            Ошибка: ${escapeHtml(error.message)}
          </td>
        </tr>
      `;
    }

    this.updateStatus(currentPath);
  }

  /**
   * Создаёт строку таблицы для файла
   * @param {object} item - Элемент файла
   * @returns {HTMLElement} - TR элемент
   */
  createRow(item) {
    const tr = document.createElement('tr');
    tr.className = 'file-row';

    const icon = item.isDirectory ? '📁' : '📄';
    const size = item.isDirectory ? '' : formatSize(item.size || 0);
    const date = item.modified ? formatDate(item.modified) : '';

    tr.innerHTML = `
      <td class="px-3 py-1.5 border-b border-border">
        <span class="mr-2">${icon}</span>${escapeHtml(item.name)}
      </td>
      <td class="px-3 py-1.5 border-b border-border size-cell">${size}</td>
      <td class="px-3 py-1.5 border-b border-border date-cell">${date}</td>
    `;

    // Обработчики
    tr.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!item.isParent) {
        this.selectItem(item, tr);
      }
    });

    tr.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.openItem(item);
    });

    return tr;
  }

  /**
   * Загружает детали файлов (размеры, даты)
   */
  async loadFileDetails(items, tbody, rootPath) {
    const offset = rootPath !== await this.api.getCurrentPath() ? 1 : 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = tbody.children[i + offset];
      if (!row) continue;

      try {
        if (!this.isSftp && this.api.getFileInfo) {
          const info = await this.api.getFileInfo(item.path);
          const sizeCell = row.querySelector('.size-cell');
          const dateCell = row.querySelector('.date-cell');
          if (sizeCell) sizeCell.textContent = item.isDirectory ? '' : formatSize(info.size);
          if (dateCell) dateCell.textContent = formatDate(info.modified);
        }
      } catch (e) {
        // Игнорируем ошибки для отдельных файлов
      }
    }
  }

  /**
   * Выделяет элемент
   * @param {object} item - Элемент файла
   * @param {HTMLElement} tr - TR элемент
   */
  selectItem(item, tr) {
    // Снимаем выделение со всех
    this.fileList.querySelectorAll('tr').forEach(row => {
      row.classList.remove('selected');
    });

    // Выделяем текущий
    tr.classList.add('selected');
    this.selectedItem = item;
    this.onSelect(item);
  }

  /**
   * Открывает элемент
   * @param {object} item - Элемент файла
   */
  async openItem(item) {
    if (item.isDirectory) {
      await this.onOpen(item);
    }
  }

  /**
   * Обновляет статусную строку
   * @param {string} currentPath - Текущий путь
   */
  updateStatus(currentPath) {
    if (this.statusElement && this.selectedItem) {
      this.statusElement.textContent = `Выбрано: ${this.selectedItem.name}`;
    } else if (this.statusElement) {
      this.statusElement.textContent = `Путь: ${currentPath}`;
    }
  }

  /**
   * Переключает видимость скрытых файлов
   * @param {boolean} show - Показывать скрытые файлы
   */
  toggleHiddenFiles(show) {
    this.showHiddenFiles = show;
  }

  /**
   * Снимает выделение
   */
  clearSelection() {
    this.fileList.querySelectorAll('tr').forEach(row => {
      row.classList.remove('selected');
    });
    this.selectedItem = null;
  }

  /**
   * Получает выбранный элемент
   * @returns {object|null} - Выбранный элемент
   */
  getSelected() {
    return this.selectedItem;
  }
}
