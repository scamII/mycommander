# Инструкция по сборке MyCommander на Windows

## Требования

1. **Node.js 18+** - скачайте с https://nodejs.org/
2. **Git** - скачайте с https://git-scm.com/

## Пошаговая инструкция

### 1. Установка зависимостей

Откройте PowerShell или Command Prompt от имени администратора:

```cmd
cd путь\к\myCommander
npm install
```

### 2. Проверка работы

```cmd
npm start
```

Приложение должно запуститься.

### 3. Сборка Windows версии

**Вариант 1 - Portable (переносимая версия):**
```cmd
npm run dist:win
```

Результат будет в папке `release\win-unpacked\` - просто скопируйте папку на любую машину и запустите `MyCommander.exe`.

**Вариант 2 - Установщик NSIS:**

Для сборки установщика нужен Wine (на Linux) или сборка напрямую на Windows:

```cmd
npm run dist:win
```

Если хотите NSIS установщик, измените в `package.json`:
```json
"win": {
  "target": ["nsis", "portable"]
}
```

И запустите снова:
```cmd
npm run dist:win
```

### 4. Результат

После сборки в папке `release\` появятся:

- `MyCommander.exe` (portable версия)
- `MyCommander Setup *.exe` (установщик, если выбран NSIS)

## Возможные проблемы

### Ошибка "wine is required"

На Windows Wine не нужен. Если появляется эта ошибка, убедитесь что:
- Вы запускаете сборку на Windows (не на Linux!)
- В `package.json` указано `"target": ["portable"]` для Windows

### Ошибка при установке зависимостей

Попробуйте очистить кэш npm:
```cmd
npm cache clean --force
npm install
```

### Долгая сборка

Первый запуск скачивает Electron (~150MB), последующие сборки быстрее.

## Быстрые команды

```cmd
# Разработка с авто-перезагрузкой
npm run dev

# Сборка portable версии
npm run dist:win

# Сборка всех форматов
npm run dist:all
```
