# Fly.io — деплой Radius

> Полный гайд по развёртыванию на Fly.io: бэкенд + фронтенд + Neon Postgres + Upstash Redis. Без собственного сервера и домена.

---

## 🎯 Что получите

- Бэкенд: `https://radius-backend.fly.dev`
- Фронтенд: `https://radius-frontend.fly.dev`
- PostgreSQL: Neon (бесплатно, 500MB)
- Redis: Upstash (бесплатно, 10k команд/день)
- **Не засыпает** (в отличие от Render Free)

---

## 1. Установка Fly CLI

```bash
# macOS / Linux
curl -L https://fly.io/install.sh | sh

# Добавьте в PATH (если нужно)
export PATH="$HOME/.fly/bin:$PATH"

# Вход в аккаунт
fly auth signup   # или fly auth login
```

---

## 2. Бэкенд (FastAPI)

### 2.1 Создание приложения

```bash
cd /path/to/radius-project   # корень проекта

# Создаём приложение (только один раз)
fly apps create radius-backend

# Деплой
fly deploy
```

### 2.2 Установка секретов (переменные окружения)

```bash
# Генерация SECRET_KEY
fly secrets set SECRET_KEY=$(openssl rand -hex 32)

# Telegram Bot Token (полученный у @BotFather)
fly secrets set TELEGRAM_BOT_TOKEN=123456789:AAHxxxxxYOUR_TOKENxxxxx

# CORS — добавьте фронтенд + Telegram
fly secrets set CORS_ORIGINS=https://radius-frontend.fly.dev,https://web.telegram.org

# Проверка всех секретов
fly secrets list
```

### 2.3 База данных (Neon — бесплатно)

```bash
# 1. Зарегистрируйтесь на https://neon.tech
# 2. Создайте проект → базу данных
# 3. Скопируйте Connection String (подходит для asyncpg)

# Установите DATABASE_URL
fly secrets set DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/radius_db?sslmode=require
```

> 💡 Neon автоматически даёт IPv6 и SSL — отлично работает с Fly.io

### 2.4 Redis (Upstash — бесплатно)

```bash
# 1. Зарегистрируйтесь на https://upstash.com
# 2. Создайте новую Redis Database
# 3. Скопируйте REDIS_URL (начинается с rediss://...)

# Установите REDIS_URL
fly secrets set REDIS_URL=rediss://default:password@host.upstash.io:6379
```

> 💡 У Upstash URL начинается с `rediss://` (SSL) — поддерживается aioredis

### 2.5 Проверка бэкенда

```bash
# После деплоя
fly open

# Или вручную
curl https://radius-backend.fly.dev/health
# Должно вернуть: {"status":"ok","app":"radius"}

# Логи
fly logs
```

---

## 3. Фронтенд (Next.js)

### 3.1 Создание приложения

```bash
cd /path/to/radius-project/frontend

# Создаём приложение (только один раз)
fly apps create radius-frontend

# Деплой (fly.toml уже в папке frontend/)
fly deploy
```

### 3.2 Установка секретов (build-time переменные)

```bash
# URL бэкенда (тот, что получили выше)
fly secrets set NEXT_PUBLIC_API_URL=https://radius-backend.fly.dev/api/v1
fly secrets set NEXT_PUBLIC_WS_URL=wss://radius-backend.fly.dev/api/v1

# Ключ Яндекс.Карт (опционально, карта будет работать без него в dev-режиме)
fly secrets set NEXT_PUBLIC_YANDEX_MAPS_KEY=your-key-here
```

> ⚠️ **Важно**: `NEXT_PUBLIC_*` переменные встраиваются в код при сборке (`fly deploy`). Если измените — пересоберите: `fly deploy`

### 3.3 Проверка фронтенда

```bash
fly open
# Откроет https://radius-frontend.fly.dev
```

---

## 4. Telegram Mini App

### 4.1 Настройка @BotFather

1. Отправьте `/mybots` → ваш бот → **Bot Settings**
2. **Menu Button** → Configure menu button
3. **Configure Web App**
4. URL: `https://radius-frontend.fly.dev`

### 4.2 Проверка в Telegram

- Откройте бота на телефоне
- Нажмите кнопку меню (или /start)
- Web App должен открыться в fullscreen

---

## 5. Кастомный домен (опционально)

```bash
# Подключите свой домен
fly certs add radius.yourdomain.com

# Добавьте CNAME-запись в DNS:
# radius.yourdomain.com → radius-frontend.fly.dev
# api.yourdomain.com → radius-backend.fly.dev

# Обновите CORS и фронтенд переменные
fly secrets set CORS_ORIGINS=https://radius.yourdomain.com,https://web.telegram.org
fly secrets set NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
fly secrets set NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/api/v1
fly deploy  # пересобрать фронтенд
```

---

## 6. Обновление кода (после изменений в GitHub)

```bash
# Склонировать свежий код с GitHub
git pull origin main

# Бэкенд
cd /path/to/radius-project
fly deploy

# Фронтенд
cd /path/to/radius-project/frontend
fly deploy
```

---

## 7. Мониторинг и логи

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

## 8. Траблшутинг

| Проблема | Решение |
|----------|---------|
| `connection refused` | Проверьте `fly status` — приложение запущено? |
| `DATABASE_URL` не работает | Убедитесь что `sslmode=require` в строке |
| `Redis connection error` | Upstash URL должен начинаться с `rediss://` |
| `initData invalid` | Проверьте `TELEGRAM_BOT_TOKEN` — он точно от этого бота? |
| `CORS error` | Добавьте фронтенд URL в `CORS_ORIGINS` |
| Карта не загружается | Проверьте `NEXT_PUBLIC_YANDEX_MAPS_KEY` |
| Первый запуск медленный | Neon — serverless, первый connection "cold start" (~2 сек) |

---

## 📋 Чек-лист деплоя

- [ ] Fly CLI установлен, аккаунт создан
- [ ] Бэкенд: `fly deploy` успешен
- [ ] Бэкенд: `fly secrets set` для SECRET_KEY, TELEGRAM_BOT_TOKEN, DATABASE_URL, REDIS_URL, CORS_ORIGINS
- [ ] Бэкенд: `curl https://.../health` возвращает `{"status":"ok"}`
- [ ] Neon: база данных создана, строка подключения установлена
- [ ] Upstash: Redis создан, URL установлен
- [ ] Фронтенд: `fly deploy` успешен
- [ ] Фронтенд: `fly secrets set` для NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
- [ ] Telegram: Web App URL в @BotFather = фронтенд URL
- [ ] Тест в Telegram: приложение открывается, авторизация работает

---

## 💰 Стоимость (Free tier)

| Сервис | Бесплатно | Лимит |
|--------|-----------|-------|
| Fly.io VM | ✅ 3 shared-cpu-1x | 256MB RAM, 160GB хранилища |
| Neon Postgres | ✅ 500MB | 190 compute hours/month |
| Upstash Redis | ✅ 10k commands/day | 1 database |

Для MVP и тестирования — **полностью бесплатно**. Для production — ~$5-15/мес.

---

## 📚 Полезные ссылки

- [Fly.io Docs](https://fly.io/docs/)
- [Neon Docs](https://neon.tech/docs/)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
