/**
 * SSH/SFTP менеджер подключений
 */

export class SshManager {
  constructor() {
    this.currentConnId = null;
    this.savedConnections = new Map();
    this.onConnect = null;
    this.onDisconnect = null;
  }

  /**
   * Загружает сохранённые подключения
   */
  loadSaved() {
    try {
      const saved = localStorage.getItem('sshConnections');
      if (saved) {
        const connections = JSON.parse(saved);
        this.savedConnections = new Map(Object.entries(connections));
      }
    } catch (e) {
      console.error('Ошибка загрузки подключений:', e);
    }
  }

  /**
   * Сохраняет подключение
   * @param {string} name - Имя подключения
   * @param {object} config - Конфиг подключения
   */
  saveConnection(name, config) {
    this.savedConnections.set(name, config);
    this.persist();
  }

  /**
   * Сохраняет в localStorage
   */
  persist() {
    const obj = Object.fromEntries(this.savedConnections);
    localStorage.setItem('sshConnections', JSON.stringify(obj));
  }

  /**
   * Подключается к SSH серверу
   * @param {object} config - Конфиг подключения
   * @returns {Promise}
   */
  async connect(config) {
    try {
      const result = await window.sftpAPI.connect(config);
      
      if (result.error) {
        throw new Error(result.error);
      }

      this.currentConnId = result.connId;

      // Сохраняем если нужно
      if (config.saveConnection) {
        const name = `${config.username}@${config.host}`;
        this.saveConnection(name, {
          host: config.host,
          port: config.port,
          username: config.username,
          // Не сохраняем пароль!
        });
      }

      if (this.onConnect) {
        this.onConnect(result.connId, config.host);
      }

      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Отключается от сервера
   */
  async disconnect() {
    if (!this.currentConnId) return;

    try {
      await window.sftpAPI.disconnect(this.currentConnId);
      
      if (this.onDisconnect) {
        this.onDisconnect();
      }

      this.currentConnId = null;
    } catch (error) {
      console.error('Ошибка отключения:', error);
    }
  }

  /**
   * Проверяет подключены ли
   * @returns {boolean}
   */
  isConnected() {
    return this.currentConnId !== null;
  }

  /**
   * Получает текущий ID подключения
   * @returns {string|null}
   */
  getConnId() {
    return this.currentConnId;
  }

  /**
   * Получает список сохранённых подключений
   * @returns {Array}
   */
  getSavedConnections() {
    return Array.from(this.savedConnections.entries()).map(([name, config]) => ({
      name,
      ...config,
    }));
  }

  /**
   * Удаляет сохранённое подключение
   * @param {string} name - Имя подключения
   */
  removeConnection(name) {
    this.savedConnections.delete(name);
    this.persist();
  }
}

// Экспорт единственного экземпляра
export const sshManager = new SshManager();
