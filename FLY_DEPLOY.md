# Fly.io — деплой Radius

> Полный гайд по развёртыванию на Fly.io. У вас уже настроены Neon (PostgreSQL) и Upstash (Redis).

---

## 🎯 Что получите

- Бэкенд: `https://radius-backend.fly.dev`
- Фронтенд: `https://radius-frontend.fly.dev`
- PostgreSQL: уже настроен (Neon)
- Redis: уже настроен (Upstash)
- **Не засыпает** — сервер всегда отвечает

---

## 1. Установка Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Добавьте в PATH (если нужно)
export PATH="$HOME/.fly/bin:$PATH"

# Вход в аккаунт
fly auth login
```

---

## 2. Бэкенд (FastAPI)

### 2.1 Создание и деплой

```bash
cd /path/to/radius   # корень проекта (где fly.toml)

# Создаём приложение (один раз)
fly apps create radius-backend

# Деплой (займёт 3-5 минут)
fly deploy
```

### 2.2 Установка секретов (всё уже подготовлено)

```bash
# Установите все секреты одной командой (замените значения на ваши реальные)
fly secrets set \
  DATABASE_URL="postgresql+asyncpg://USER:PASS@HOST.neon.tech/DB?sslmode=require" \
  REDIS_URL="rediss://default:PASS@HOST.upstash.io:6379" \
  SECRET_KEY="$(openssl rand -hex 32)" \
  TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН_ОТ_BOTFATHER" \
  CORS_ORIGINS="https://radius-frontend.fly.dev,https://web.telegram.org"
```

> 💡 **После установки секретов Fly автоматически перезапустит приложение**

### 2.3 Проверка бэкенда

```bash
# Открыть в браузере
fly open

# Или проверить health
 curl https://radius-backend.fly.dev/health
# → {"status":"ok","app":"radius"}

# Логи (Ctrl+C для выхода)
fly logs
```

---

## 3. Фронтенд (Next.js)

### 3.1 Создание и деплой

```bash
cd /path/to/radius/frontend   # папка frontend (где fly.toml)

# Создаём приложение (один раз)
fly apps create radius-frontend

# Деплой (займёт 5-10 минут — сборка Next.js)
fly deploy
```

### 3.2 Установка секретов (build-time)

```bash
# Установите переменные фронтенда (встраиваются в код при сборке)
fly secrets set \
  NEXT_PUBLIC_API_URL="https://radius-backend.fly.dev/api/v1" \
  NEXT_PUBLIC_WS_URL="wss://radius-backend.fly.dev/api/v1" \
  NEXT_PUBLIC_YANDEX_MAPS_KEY="ВАШ_КЛЮЧ_ЯНДЕКС"

# Пересобрать фронтенд (обязательно после изменения NEXT_PUBLIC_*)
fly deploy
```

### 3.3 Проверка фронтенда

```bash
fly open
# Откроет https://radius-frontend.fly.dev
```

---

## 4. Telegram Mini App

### 4.1 Настройка @BotFather

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите ваш бот → **Bot Settings**
4. **Menu Button** → Configure menu button
5. **Configure Web App**
6. URL: `https://radius-frontend.fly.dev`

### 4.2 Проверка в Telegram

- Откройте бота на телефоне
- Нажмите кнопку меню (или `/start`)
- Web App должен открыться в fullscreen

---

## 5. Обновление кода (после изменений в GitHub)

```bash
# Склонировать свежий код
git pull origin main

# Бэкенд
cd /path/to/radius
fly deploy

# Фронтенд
cd /path/to/radius/frontend
fly deploy
```

---

## 6. Мониторинг и логи

```bash
# Логи бэкенда
fly logs --app radius-backend

# Логи фронтенда
fly logs --app radius-frontend

# Статус
fly status --app radius-backend
fly status --app radius-frontend

# Масштабирование (если нужно)
fly scale count 2 --app radius-backend
```

---

## 7. Кастомный домен (опционально)

```bash
# Подключите свой домен
fly certs add radius.yourdomain.com

# В DNS добавьте CNAME:
# radius.yourdomain.com → radius-frontend.fly.dev
# api.yourdomain.com → radius-backend.fly.dev

# Обновите CORS и фронтенд переменные
fly secrets set CORS_ORIGINS="https://radius.yourdomain.com,https://web.telegram.org" --app radius-backend
fly secrets set \
  NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/v1" \
  NEXT_PUBLIC_WS_URL="wss://api.yourdomain.com/api/v1" \
  --app radius-frontend
fly deploy --app radius-frontend
```

---

## 8. Траблшутинг

| Проблема | Решение |
|----------|---------|
| `connection refused` | `fly status` — приложение запущено? |
| `DATABASE_URL` не работает | Убедитесь что `sslmode=require` в строке |
| `Redis connection error` | Upstash URL должен начинаться с `rediss://` (SSL) |
| `initData invalid` | Проверьте `TELEGRAM_BOT_TOKEN` — от этого бота? |
| `CORS error` | Добавьте фронтенд URL в `CORS_ORIGINS` |
| Карта не загружается | Проверьте `NEXT_PUBLIC_YANDEX_MAPS_KEY` |
| Первый запуск медленный | Neon — serverless, первый connection "cold start" |
| Сборка фронтенда падает | `fly logs` — проверьте что `NEXT_PUBLIC_*` установлены |

---

## 9. Список fly apps

```bash
fly apps list
# Должно быть:
# radius-backend
# radius-frontend
```

---

## 10. Удаление (если нужно)

```bash
fly apps destroy radius-backend
fly apps destroy radius-frontend
```

---

## 💰 Стоимость (Free tier)

| Сервис | Бесплатно | Лимит |
|--------|-----------|-------|
| Fly.io VM | ✅ 3 shared-cpu-1x | 256MB RAM, 160GB |
| Neon Postgres | ✅ 500MB | 190 compute hours/month |
| Upstash Redis | ✅ 10k commands/day | 1 database |

Для MVP и тестирования — **полностью бесплатно**.

---

## 📚 Полезные ссылки

- [Fly.io Docs](https://fly.io/docs/)
- [Neon Docs](https://neon.tech/docs/)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
