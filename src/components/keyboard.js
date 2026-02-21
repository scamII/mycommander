/**
 * Менеджер горячих клавиш
 */

export class KeyboardManager {
  constructor(options = {}) {
    this.handlers = new Map();
    this.globalHandlers = new Map();
    this.inputElements = options.inputElements || [];
  }

  /**
   * Регистрирует обработчик горячей клавиши
   * @param {string} key - Клавиша (например, 'F5', 'Tab', 'Backspace')
   * @param {Function} handler - Обработчик
   * @param {boolean} global - Работать ли в input полях
   */
  register(key, handler, global = false) {
    if (global) {
      this.globalHandlers.set(key, handler);
    } else {
      this.handlers.set(key, handler);
    }
  }

  /**
   * Устанавливает обработчик на документ
   */
  setup() {
    document.addEventListener('keydown', (e) => {
      const key = e.key;
      const isInput = this.inputElements.includes(document.activeElement);

      // Глобальные обработчики работают всегда
      if (this.globalHandlers.has(key)) {
        const handler = this.globalHandlers.get(key);
        if (handler(e)) {
          e.preventDefault();
          return;
        }
      }

      // Обычные обработчики не работают в input
      if (isInput && !this.globalHandlers.has(key)) {
        return;
      }

      if (this.handlers.has(key)) {
        const handler = this.handlers.get(key);
        if (handler(e)) {
          e.preventDefault();
        }
      }
    });
  }

  /**
   * Удаляет обработчик
   * @param {string} key - Клавиша
   */
  unregister(key) {
    this.handlers.delete(key);
    this.globalHandlers.delete(key);
  }

  /**
   * Очищает все обработчики
   */
  clear() {
    this.handlers.clear();
    this.globalHandlers.clear();
  }
}
