/**
 * SSH/SFTP UI компонент
 * Простое подключение как в Termius
 */

export class SshUI {
  constructor(options = {}) {
    this.modal = options.modal;
    this.hostInput = options.hostInput;
    this.portInput = options.portInput;
    this.usernameInput = options.usernameInput;
    this.passwordInput = options.passwordInput;
    this.nameInput = options.nameInput;
    this.okBtn = options.okBtn;
    this.cancelBtn = options.cancelBtn;
    this.statusCallback = options.onStatus || (() => {});
    this.connectCallback = options.onConnect || (() => {});
    this.savedConnections = [];
  }

  // Загрузка сохранённых подключений
  loadSaved() {
    try {
      const saved = localStorage.getItem('sshConnections');
      if (saved) {
        this.savedConnections = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Ошибка загрузки подключений:', e);
    }
  }

  // Сохранение подключения
  saveConnection(name, config) {
    this.savedConnections.push({ name, ...config });
    localStorage.setItem('sshConnections', JSON.stringify(this.savedConnections));
  }

  // Показ модального окна
  show() {
    this.hostInput.value = '';
    this.portInput.value = '22';
    this.usernameInput.value = '';
    this.passwordInput.value = '';
    this.nameInput.value = '';
    this.modal.style.display = 'flex';
    this.hostInput.focus();
  }

  // Скрытие модального окна
  hide() {
    this.modal.style.display = 'none';
  }

  // Подключение к серверу
  async connect() {
    const config = {
      name: this.nameInput.value.trim() || `${this.usernameInput.value}@${this.hostInput.value}`,
      host: this.hostInput.value.trim(),
      port: parseInt(this.portInput.value) || 22,
      username: this.usernameInput.value.trim(),
      password: this.passwordInput.value,
    };

    if (!config.host || !config.username || !config.password) {
      alert('Введите хост, имя пользователя и пароль');
      return null;
    }

    try {
      const result = await window.sftpAPI.connect(config);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Сохраняем если указано имя
      if (config.name) {
        this.saveConnection(config.name, {
          host: config.host,
          port: config.port,
          username: config.username,
          // Не сохраняем пароль!
        });
      }

      this.hide();
      this.statusCallback(`Подключено к ${config.host}`);
      
      return {
        connId: result.connId,
        config: config,
      };

    } catch (error) {
      alert(`Ошибка подключения: ${error.message}`);
      return null;
    }
  }

  // Отключение
  async disconnect(connId) {
    try {
      await window.sftpAPI.disconnect(connId);
      this.statusCallback('Отключено');
    } catch (error) {
      console.error('Ошибка отключения:', error);
    }
  }

  // Настройка обработчиков
  setup() {
    // Кнопка OK
    this.okBtn.addEventListener('click', () => {
      this.connect();
    });

    // Кнопка Cancel
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
    });

    // Enter в поле пароля
    this.passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.connect();
      }
    });

    // Закрытие по клику вне
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Загрузка сохранённых
    this.loadSaved();
  }

  // Получение списка сохранённых подключений
  getSavedConnections() {
    return this.savedConnections;
  }
}
