/**
 * SSH Terminal Component
 * Консоль для SSH подключения
 */

export class SshTerminal {
  constructor(options = {}) {
    this.modal = options.modal;
    this.output = options.output;
    this.input = options.input;
    this.title = options.title;
    this.closeBtn = options.closeBtn;
    this.fullscreenBtn = options.fullscreenBtn;
    
    this.shellId = null;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.isConnected = false;
  }

  // Показ терминала
  show() {
    this.modal.style.display = 'flex';
    this.input.focus();
  }

  // Скрытие терминала
  hide() {
    this.modal.style.display = 'none';
  }

  // Подключение к SSH
  async connect(config) {
    try {
      const result = await window.sshTerminal.connect(config);

      if (result.error) {
        throw new Error(result.error);
      }

      this.shellId = result.shellId;
      this.isConnected = true;

      this.output.textContent = `Connected to ${config.host}:${config.port}\n`;
      this.output.textContent += `Type 'exit' to disconnect\n\n`;

      // Настраиваем обработчики
      this.setup();

      // Подписка на данные от сервера
      window.sshTerminal.onData((shellId, data) => {
        if (shellId === this.shellId) {
          this.output.textContent += data;
          this.output.scrollTop = this.output.scrollHeight;
        }
      });

      this.show();
      return true;

    } catch (error) {
      alert(`Ошибка подключения: ${error.message}`);
      return false;
    }
  }

  // Отключение
  async disconnect() {
    if (this.shellId) {
      await window.sshTerminal.disconnect(this.shellId);
      this.shellId = null;
      this.isConnected = false;
      this.output.textContent += '\nDisconnected.\n';
    }
    this.hide();
  }

  // Отправка команды
  async sendCommand(cmd) {
    if (!this.isConnected) {
      this.output.textContent += 'Not connected. Use "connect" command.\n';
      return;
    }

    this.commandHistory.push(cmd);
    this.historyIndex = this.commandHistory.length;

    this.output.textContent += `$ ${cmd}\n`;
    
    // Добавляем перевод строки если её нет
    if (!cmd.endsWith('\n')) {
      cmd += '\n';
    }
    
    await window.sshTerminal.write(this.shellId, cmd);
  }

  // Настройка обработчиков
  setup() {
    // Ввод команд
    this.input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = this.input.value;
        this.input.value = '';
        
        // Проверка на exit
        if (cmd.trim() === 'exit') {
          await this.disconnect();
          return;
        }
        
        // История команд (стрелки вверх/вниз)
        if (e.key === 'ArrowUp' && this.commandHistory.length > 0) {
          e.preventDefault();
          this.historyIndex = Math.max(0, this.historyIndex - 1);
          this.input.value = this.commandHistory[this.historyIndex] || '';
          return;
        }
        if (e.key === 'ArrowDown' && this.commandHistory.length > 0) {
          e.preventDefault();
          this.historyIndex = Math.min(this.commandHistory.length, this.historyIndex + 1);
          this.input.value = this.commandHistory[this.historyIndex] || '';
          return;
        }
        
        await this.sendCommand(cmd);
      }
    });

    // Кнопка закрытия
    this.closeBtn.addEventListener('click', () => {
      if (this.isConnected) {
        this.disconnect();
      } else {
        this.hide();
      }
    });

    // Полноэкранный режим
    this.fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        this.modal.requestFullscreen();
      }
    });

    // Клик вне окна закрывает
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
  }

  // Очистка терминала
  clear() {
    this.output.textContent = '';
  }
}

// Экспорт единственного экземпляра
export const sshTerminal = new SshTerminal({
  modal: document.getElementById('ssh-terminal-modal'),
  output: document.getElementById('ssh-terminal-output'),
  input: document.getElementById('ssh-terminal-input'),
  title: document.getElementById('ssh-terminal-title'),
  closeBtn: document.getElementById('ssh-terminal-close'),
  fullscreenBtn: document.getElementById('ssh-terminal-fullscreen'),
});
