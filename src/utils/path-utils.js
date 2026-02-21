/**
 * Утилиты для работы с путями
 */

import path from 'path';

/**
 * Нормализует путь и проверяет на Path Traversal
 * @param {string} inputPath - Входной путь
 * @param {string} basePath - Базовый путь для проверки
 * @returns {object} - { safe: boolean, normalized: string }
 */
export function normalizePath(inputPath, basePath = process.cwd()) {
  const normalized = path.normalize(inputPath);
  const resolved = path.resolve(basePath, normalized);
  const safe = resolved.startsWith(basePath);
  
  return { safe, normalized: resolved };
}

/**
 * Проверяет путь на опасные последовательности
 * @param {string} path - Путь для проверки
 * @returns {boolean} - true если путь безопасен
 */
export function isPathSafe(pathStr) {
  const dangerousPatterns = [
    /\.\./,
    /%2e%2e/i,
    /%252e%252e/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(pathStr));
}

/**
 * Получает родительскую директорию
 * @param {string} currentPath - Текущий путь
 * @returns {string} - Родительский путь
 */
export function getParentDirectory(currentPath) {
  return path.dirname(currentPath);
}

/**
 * Объединяет пути безопасно
 * @param {string} base - Базовый путь
 * @param {string} relative - Относительный путь
 * @returns {string} - Объединённый путь
 */
export function joinPaths(base, relative) {
  return path.posix.join(base, relative);
}

/**
 * Получает имя файла из пути
 * @param {string} filePath - Путь к файлу
 * @returns {string} - Имя файла
 */
export function getFileName(filePath) {
  return path.basename(filePath);
}

/**
 * Получает расширение файла
 * @param {string} filePath - Путь к файлу
 * @returns {string} - Расширение файла
 */
export function getFileExtension(filePath) {
  return path.extname(filePath);
}
