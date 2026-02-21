/**
 * Утилиты для работы с HTML
 */

/**
 * Экранирует HTML для защиты от XSS
 * @param {string} text - Текст для экранирования
 * @returns {string} - Экранированный HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Форматирует размер файла в человекочитаемый вид
 * @param {number} bytes - Размер в байтах
 * @returns {string} - Форматированный размер
 */
export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Форматирует дату в локальном формате
 * @param {Date|string} date - Дата для форматирования
 * @returns {string} - Форматированная дата
 */
export function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Проверяет является ли файл скрытым
 * @param {string} name - Имя файла
 * @returns {boolean} - true если файл скрытый
 */
export function isHiddenFile(name) {
  return name.startsWith('.');
}

/**
 * Сортирует элементы: сначала папки, потом файлы
 * @param {Array} items - Массив элементов
 * @returns {Array} - Отсортированный массив
 */
export function sortItems(items) {
  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Фильтрует скрытые файлы
 * @param {Array} items - Массив элементов
 * @param {boolean} showHidden - Показывать ли скрытые файлы
 * @returns {Array} - Отфильтрованный массив
 */
export function filterHiddenFiles(items, showHidden) {
  if (showHidden) return items;
  return items.filter(item => !isHiddenFile(item.name));
}
