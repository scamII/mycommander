/**
 * Компонент модальных окон
 */

export class ModalManager {
  constructor() {
    this.modals = new Map();
    this.callbacks = new Map();
  }

  /**
   * Регистрирует модальное окно
   * @param {string} id - Идентификатор модального окна
   * @param {object} elements - DOM элементы модального окна
   */
  register(id, elements) {
    this.modals.set(id, {
      modal: elements.modal,
      input: elements.input,
      okBtn: elements.okBtn,
      cancelBtn: elements.cancelBtn,
      title: elements.title,
    });
    this.callbacks.set(id, null);
  }

  /**
   * Показывает модальное окно
   * @param {string} id - Идентификатор модального окна
   * @param {string} title - Заголовок
   * @param {string} defaultValue - Значение по умолчанию
   * @param {Function} callback - Callback при нажатии OK
   */
  show(id, title, defaultValue = '', callback = null) {
    const modal = this.modals.get(id);
    if (!modal) return;

    if (modal.title) modal.title.textContent = title;
    if (modal.input) {
      modal.input.value = defaultValue;
      modal.input.focus();
      modal.input.select();
    }

    modal.modal.style.display = 'flex';
    this.callbacks.set(id, callback);
  }

  /**
   * Скрывает модальное окно
   * @param {string} id - Идентификатор модального окна
   */
  hide(id) {
    const modal = this.modals.get(id);
    if (modal) {
      modal.modal.style.display = 'none';
    }
  }

  /**
   * Подписывается на событие OK
   * @param {string} id - Идентификатор модального окна
   * @param {Function} handler - Обработчик
   */
  onOk(id, handler) {
    const modal = this.modals.get(id);
    if (!modal || !modal.okBtn) return;

    modal.okBtn.addEventListener('click', () => {
      const value = modal.input ? modal.input.value.trim() : '';
      this.hide(id);
      if (handler) handler(value);
    });
  }

  /**
   * Подписывается на событие Cancel
   * @param {string} id - Идентификатор модального окна
   * @param {Function} handler - Обработчик
   */
  onCancel(id, handler) {
    const modal = this.modals.get(id);
    if (!modal || !modal.cancelBtn) return;

    modal.cancelBtn.addEventListener('click', () => {
      this.hide(id);
      if (handler) handler();
    });
  }

  /**
   * Закрывает модальное окно по клику вне
   * @param {string} id - Идентификатор модального окна
   */
  enableClickOutsideClose(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    modal.modal.addEventListener('click', (e) => {
      if (e.target === modal.modal) {
        this.hide(id);
      }
    });
  }

  /**
   * Закрывает модальное окно по Escape
   * @param {string} id - Идентификатор модального окна
   */
  enableEscapeClose(id) {
    const modal = this.modals.get(id);
    if (!modal || !modal.input) return;

    modal.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide(id);
      }
      if (e.key === 'Enter' && modal.okBtn) {
        modal.okBtn.click();
      }
    });
  }

  /**
   * Инициализирует все обработчики для модального окна
   * @param {string} id - Идентификатор модального окна
   */
  setup(id) {
    this.enableClickOutsideClose(id);
    this.enableEscapeClose(id);
  }
}

// Экспорт единственного экземпляра
export const modalManager = new ModalManager();
