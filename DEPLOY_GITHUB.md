# 📤 Как отправить проект на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Зайдите на https://github.com/
2. Нажмите **+** → **New repository**
3. Введите имя: `mycommander`
4. Выберите **Public** или **Private**
5. **НЕ** ставьте галочки "Initialize with README"
6. Нажмите **Create repository**

## Шаг 2: Настройте SSH (если ещё не настроен)

### Генерация SSH ключа:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```
Нажимайте Enter для всех вопросов (используются значения по умолчанию).

### Добавьте ключ в GitHub:
```bash
cat ~/.ssh/id_ed25519.pub
```

Скопируйте вывод и добавьте в GitHub:
1. https://github.com/settings/keys
2. Нажмите **New SSH key**
3. Вставьте ключ
4. Нажмите **Add SSH key**

## Шаг 3: Отправьте код на GitHub

```bash
# Замените YOUR_USERNAME на ваш логин GitHub
git remote add origin git@github.com:YOUR_USERNAME/mycommander.git

# Переименуйте ветку в main (опционально)
git branch -M main

# Отправьте код
git push -u origin main
```

## Шаг 4: Создайте Release

1. Зайдите в репозиторий на GitHub
2. Справа нажмите **Releases** → **Create a new release**
3. Tag version: `v1.0.0`
4. Release title: `MyCommander v1.0.0`
5. Описание релиза
6. Прикрепите файлы из папки `release/`:
   - `MyCommander-1.0.0.AppImage` (Linux)
   - `mycommander_1.0.0_amd64.deb` (Linux)
   - `win-unpacked.zip` (Windows - запакуйте папку)
7. Нажмите **Publish release**

## Альтернативно: через HTTPS

Если не хотите использовать SSH:

```bash
git remote add origin https://github.com/YOUR_USERNAME/mycommander.git
git branch -M main
git push -u origin main
```

При первом пуше GitHub спросит логин и пароль (или токен).

---

## 📥 Как собрать на Windows (после клонирования)

```cmd
# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/mycommander.git
cd mycommander

# Установить зависимости
npm install

# Собрать Windows версию
npm run dist:win
```

Готово! Бинарники будут в папке `release\`.
