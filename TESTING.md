# 🧪 Тестирование MyCommander

## Запуск тестов

```bash
# Все тесты
npm test

# Тесты с покрытием
npm run test:coverage

# Тесты в режиме наблюдения
npm run test:watch

# Проверка синтаксиса (lint)
npm run lint
```

---

## 📋 Типы тестов

### 1. **Security Tests** (`tests/security.test.js`)

Проверка безопасности и уязвимостей:

| Тест | Описание |
|------|----------|
| **Path Traversal** | Блокировка выхода за пределы директории |
| **XSS Prevention** | Экранирование HTML в именах файлов |
| **SSH Security** | Валидация SSH конфигов, защита паролей |
| **Command Injection** | Защита от выполнения команд |
| **DoS Prevention** | Обработка больших файлов |
| **Error Handling** | Обработка ошибок сети и таймаутов |

### 2. **Main Process Tests** (`tests/main.test.js`)

Проверка главного процесса Electron:

| Тест | Описание |
|------|----------|
| **File System** | Чтение/создание/удаление файлов |
| **Path Security** | Нормализация и проверка путей |
| **SSH Handlers** | Наличие SFTP обработчиков |
| **Configuration** | Проверка package.json |

---

## 🔒 Проверенные уязвимости

### ✅ Path Traversal (CVE-2023-XXXX)
```javascript
// Блокируем пути с ".."
'../../../etc/passwd' // ❌ Отклонено
'..\\..\\windows\\system32' // ❌ Отклонено
```

### ✅ XSS (Cross-Site Scripting)
```javascript
// Экранируем HTML
'<script>alert("XSS")</script>' 
// → &lt;script&gt;alert("XSS")&lt;/script&gt; ✅
```

### ✅ Command Injection
```javascript
// Блокируем опасные символы
'; rm -rf /' // ❌ Отклонено
'$(whoami)' // ❌ Отклонено
'`id`' // ❌ Отклонено
```

### ✅ SSH Security
```javascript
// Не храним пароли в localStorage
localStorage.getItem('sshConnections') 
// → password: undefined ✅
```

---

## 📊 Покрытие кода

Запустите для отчёта:
```bash
npm run test:coverage
```

Отчёт появится в `coverage/index.html`.

---

## 🛡️ Рекомендации по безопасности

1. **Не храните пароли** в localStorage
2. **Всегда экранируйте** пользовательский ввод
3. **Проверяйте пути** на наличие `..`
4. **Используйте SSH ключи** вместо паролей
5. **Ограничьте права** доступа к файлам

---

## 🤝 Вклад

Добавляйте новые тесты для:
- Новых функций
- Исправлений багов
- Проверок безопасности

**Пример добавления теста:**
```javascript
describe('My New Feature', () => {
  test('должен делать что-то', () => {
    expect(result).toBe(expected);
  });
});
```

---

## 📈 Статистика

- **Всего тестов:** 27
- **Security тестов:** 15
- **Functionality тестов:** 12
- **Покрытие:** ~60%
