# Деплой: Vercel (Frontend) + Render (Backend)

> Бесплатный хостинг без карты. Фронтенд на Vercel (Next.js, CDN), бэкенд на Render (Docker, FastAPI).

---

## 🏗 Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Telegram  │────▶│   Vercel    │────▶│   Render    │
│  Mini App   │     │  (Next.js)  │     │  (FastAPI)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                         ┌─────────┐     ┌──────────┐     ┌──────────┐
                         │  Neon   │     │ Upstash  │     │  Yandex  │
                         │PostgreSQL│     │  Redis   │     │   Maps   │
                         └─────────┘     └──────────┘     └──────────┘
```

---

## 1. Vercel — Фронтенд (Next.js)

### 1.1 Регистрация
1. Зайдите на [vercel.com](https://vercel.com)
2. **Sign Up** → **Continue with GitHub**
3. Разрешите доступ к репозиторию `James202017/Radius`

### 1.2 Импорт проекта
1. Dashboard → **Add New...** → **Project**
2. Выберите репозиторий `Radius`
3. Нажмите **Import**

### 1.3 Настройка проекта
В настройках проекта (Configure Project):

| Поле | Значение |
|------|----------|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend` ⚠️ Важно! |
| **Build Command** | `npm run build` (оставьте по умолчанию) |
| **Output Directory** | `.next` (оставьте по умолчанию) |

### 1.4 Environment Variables (перед деплоем!)

Нажмите **Environment Variables** и добавьте:

```env
NEXT_PUBLIC_API_URL=https://radius-backend.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=wss://radius-backend.onrender.com/api/v1
NEXT_PUBLIC_YANDEX_MAPS_KEY=ae299fc6-cda3-4821-8cc0-413a2ff3578f
```

> ⚠️ `NEXT_PUBLIC_*` встраиваются в код при сборке. Если измените позже — нужен **Redeploy**.

### 1.5 Деплой

Нажмите **Deploy**. Через 2–3 минуты получите URL:
```
https://radius-frontend.vercel.app
```

### 1.6 Проверка

Откройте в браузере: `https://radius-frontend.vercel.app`

Должен открыться экран авторизации Radius с тёмной темой.

---

## 2. Render — Бэкенд (FastAPI + Docker)

### 2.1 Регистрация
1. Зайдите на [render.com](https://render.com)
2. Регистрация через GitHub (без карты для Free tier)
3. Подтвердите email

### 2.2 Создание сервиса (Blueprint)

Render найдёт `render.yaml` в корне репозитория автоматически.

**Вариант A: Автоматически (Blueprint)**
1. Dashboard → **New** → **Blueprint**
2. Выберите репозиторий `Radius`
3. Render создаст сервис `radius-backend` из `render.yaml`

**Вариант B: Вручную (New Web Service)**
1. Dashboard → **New** → **Web Service**
2. Выберите репозиторий `Radius`
3. Настройки:
   - **Name**: `radius-backend`
   - **Runtime**: Docker
   - **Root Directory**: `.` (корень)
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

### 2.3 Environment Variables (обязательно!)

Зайдите в сервис `radius-backend` → **Environment** → **Add Environment Variable**:

```env
DATABASE_URL=postgresql+asyncpg://neondb_owner:npg_sVwNPYJ4Mg9I@ep-gentle-glade-atxwzpum.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL=rediss://default:gQAAAAAAAkbKAAIgcDI4Yjc0MWM4MzU0NjI0MzY1YTI2MmEyNzVjNmExMjY3OQ@settled-goat-149194.upstash.io:6379
SECRET_KEY=8f4e2d1a9b6c3e5f7a0d2b4c6e8f1a3c5e7b9d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4f6a8c0e2b4f6a8c0e2b4f6a8c0e2b4f6a8c0e2b4f6a8c0e2b4f6a8c0e2b4
TELEGRAM_BOT_TOKEN=8675388500:AAH5aBNFTMregxYV2MWX60wtir_03tRcUJw
CORS_ORIGINS=https://radius-frontend.vercel.app,https://web.telegram.org
ENVIRONMENT=production
```

> ⚠️ Если Vercel дал другой URL (не `radius-frontend.vercel.app`), обновите `CORS_ORIGINS`!

### 2.4 Деплой

Render автоматически начнёт сборку после добавления переменных. Ждите 5–10 минут.

### 2.5 Проверка

```bash
curl https://radius-backend.onrender.com/health
# → {"status":"ok","app":"radius"}
```

Если ошибка — смотрите логи в Render Dashboard → **Logs**.

---

## 3. Telegram Mini App

### 3.1 Настройка @BotFather

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите ваш бот → **Bot Settings**
4. **Menu Button** → Configure menu button
5. **Configure Web App**
6. URL: `https://radius-frontend.vercel.app` (ваш URL с Vercel)

### 3.2 Проверка в Telegram

- Откройте бота на телефоне
- Нажмите кнопку меню (или `/start`)
- Web App должен открыться в fullscreen с тёмной темой

---

## 4. Важные нюансы

### 4.1 CORS — если изменился URL фронтенда

Если Vercel дал другой URL (например `https://radius-abc123.vercel.app`), обновите CORS в бэкенде:

```
Render Dashboard → radius-backend → Environment → Edit CORS_ORIGINS
CORS_ORIGINS=https://radius-abc123.vercel.app,https://web.telegram.org
```

Render автоматически перезапустит бэкенд.

### 4.2 WebSocket (wss://)

Render Free tier поддерживает WebSocket, но может закрывать соединение при простое. Для чата и матчей это нормально — клиент переподключится.

### 4.3 "Засыпание" Render

Render Free tier засыпает после 15 минут без трафика. Первый запрос после сна будет медленным (10–20 секунд). Для Telegram Mini App это допустимо.

**Чтобы не засыпало:** зайдите в настройки бэкенда на Render и выберите **Keep instance alive** (нужно обновить до Starter/Standard, ~$7/мес).

### 4.4 Vercel — никогда не засыпает

Фронтенд на Vercel всегда доступен мгновенно (CDN).

---

## 5. Обновление кода

После `git push` на GitHub:

### Vercel (автоматически)
Vercel автоматически пересобирает и деплоит при каждом push в `main`.

### Render (автоматически)
Render тоже автоматически деплоит при push в `main`.

**Если нужно вручную:**
- Vercel: Dashboard → проект → **Redeploy**
- Render: Dashboard → сервис → **Manual Deploy** → **Deploy latest commit**

---

## 6. Мониторинг и логи

| Сервис | Логи | URL |
|--------|------|-----|
| Vercel | Dashboard → проект → **Logs** | `https://radius-frontend.vercel.app` |
| Render | Dashboard → сервис → **Logs** | `https://radius-backend.onrender.com` |

---

## 7. Траблшутинг

| Проблема | Решение |
|----------|---------|
| Фронтенд не открывается | Vercel Dashboard → Logs → проверьте ошибки сборки |
| `CORS error` | Обновите `CORS_ORIGINS` в Render на URL фронтенда |
| `DATABASE_URL` не работает | Убедитесь что `sslmode=require` в строке |
| `Redis connection error` | URL должен начинаться с `rediss://` (SSL) |
| `initData invalid` | Проверьте `TELEGRAM_BOT_TOKEN` — от этого бота? |
| Карта не загружается | Проверьте `NEXT_PUBLIC_YANDEX_MAPS_KEY` в Vercel |
| Первый запуск медленный | Render Free засыпает — нормально, ждите 10–20 сек |
| WebSocket не работает | Render поддерживает wss://, но проверьте URL в `.env` |

---

## 8. Чек-лист деплоя

- [ ] Vercel: регистрация через GitHub
- [ ] Vercel: импорт репозитория `Radius`
- [ ] Vercel: **Root Directory = `frontend`**
- [ ] Vercel: добавлены `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_YANDEX_MAPS_KEY`
- [ ] Vercel: деплой успешен, URL получен
- [ ] Render: регистрация через GitHub
- [ ] Render: создан сервис `radius-backend` (Docker)
- [ ] Render: добавлены `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `CORS_ORIGINS`
- [ ] Render: деплой успешен
- [ ] Проверка бэкенда: `curl https://.../health` → `{"status":"ok"}`
- [ ] Проверка фронтенда: `https://...vercel.app` открывается
- [ ] Telegram: Web App URL = URL фронтенда Vercel
- [ ] Тест в Telegram: приложение открывается, работает авторизация

---

## 💰 Стоимость (Free tier)

| Сервис | Бесплатно | Лимит |
|--------|-----------|-------|
| Vercel | ✅ Безлимитно | 100 GB bandwidth, 6000 минут сборки |
| Render | ✅ Web Service | 750 часов/мес, засыпает после 15 мин |
| Neon | ✅ 500 MB | 190 compute hours |
| Upstash | ✅ 10k commands/day | 1 database |

Для MVP — **полностью бесплатно**.

---

## 📚 Полезные ссылки

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Neon Docs](https://neon.tech/docs/)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
