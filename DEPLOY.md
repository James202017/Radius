# 🚀 Деплой Radius

## Содержание

- [Быстрый старт на VPS](#vps)
- [Railway (PaaS)](#railway)
- [Render (PaaS)](#render)
- [Telegram Mini App](#telegram)
- [SSL / HTTPS](#ssl)
- [Проверка](#check)

---

## <a name="vps"></a> Вариант 1: VPS (Hetzner / DigitalOcean / AWS Lightsail)

### Требования

- Ubuntu 22.04 LTS
- 2 CPU, 4 GB RAM, 20 GB SSD (минимум)
- Домен (например `radius.example.com`)
- Docker + Docker Compose

### Шаг 1: Установка Docker

```bash
# SSH на сервер
ssh root@your-server-ip

# Установка Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
newgrp docker

# Установка Docker Compose
apt-get update && apt-get install -y docker-compose-plugin
```

### Шаг 2: Клонирование и настройка

```bash
mkdir -p /opt/radius && cd /opt/radius
git clone https://github.com/YOUR_USERNAME/radius.git .

# Создаём .env
cp .env.example .env
nano .env
```

Заполняем:

```env
SECRET_KEY=$(openssl rand -hex 32)
TELEGRAM_BOT_TOKEN=your_real_bot_token
NEXT_PUBLIC_API_URL=https://radius.example.com/api/v1
NEXT_PUBLIC_WS_URL=wss://radius.example.com/api/v1
NEXT_PUBLIC_YANDEX_MAPS_KEY=your_yandex_key
CORS_ORIGINS=https://radius.example.com
```

### Шаг 3: Запуск

```bash
make up
# или: docker compose up --build -d
```

### Шаг 4: SSL (Let's Encrypt)

```bash
apt-get install -y certbot

# Получаем сертификат
certbot certonly --standalone -d radius.example.com

# Копируем в nginx/ssl
cp /etc/letsencrypt/live/radius.example.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/radius.example.com/privkey.pem nginx/ssl/
```

Обновляем `nginx/nginx.conf` для HTTPS (см. `nginx/nginx-ssl.conf.example`).

### Шаг 5: Firewall

```bash
ufw default deny incoming
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## <a name="railway"></a> Вариант 2: Railway (проще всего)

### Backend

1. Создайте проект на [railway.app](https://railway.app)
2. New → Deploy from GitHub repo → выберите `radius`
3. В переменные окружения добавьте `DATABASE_URL` (Railway Postgres автоматически)
4. Добавьте `REDIS_URL` (Redis сервис от Railway)
5. Добавьте остальные переменные из `.env.example`
6. Railway автоматически откроет порт `8000`

### Frontend (Static)

1. New Project → Static Site
2. Root Directory: `frontend`
3. Build Command: `npm ci && npm run build`
4. Start Command: `npx next start` (или `output: 'export'` для статики)
5. Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app/api/v1`

> ⚠️ Railway хорош для MVP, но может быть дорогим для production трафика.

---

## <a name="render"></a> Вариант 3: Render (Free tier)

### Backend (Web Service)

- Type: Web Service
- Runtime: Docker
- Root Directory: `./` (root)
- Dockerfile: `./Dockerfile`
- Environment Variables: добавить все из `.env.example`
- PostgreSQL: New PostgreSQL (Render даёт URL автоматически)
- Redis: New Redis

### Frontend (Static Site)

- Type: Static Site
- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `frontend/.next/static` (или настройте `output: 'export'` в next.config.js)

> ⚠️ Free tier Render засыпает после 15 минут без трафика. Для Telegram Mini App это плохо — первый запуск будет медленным.

---

## <a name="telegram"></a> 🤖 Telegram Mini App: настройка

### 1. Создание бота

Напишите @BotFather:

```
/newbot
→ Придумайте имя (Radius)
→ Придумайте username (RadiusNearbyBot)

/mybots
→ @RadiusNearbyBot
→ Bot Settings
  → Menu Button
    → Configure menu button
      → Configure Web App
        → URL: https://your-domain.com
```

### 2. Важные требования Telegram

| Требование | Описание |
|------------|----------|
| **HTTPS** | Обязательно. HTTP не работает в WebView Telegram |
| **Домен** | Должен быть реальным (не `localhost`, не IP) |
| **CORS** | `CORS_ORIGINS` должен включать `https://your-domain.com` и `https://web.telegram.org` |
| **initData** | Backend валидирует `window.Telegram.WebApp.initData` через HMAC |

### 3. Проверка Web App URL

```bash
curl -I https://your-domain.com
# Должен вернуть HTTP/2 200 с HTTPS
```

### 4. Тестирование

- Откройте бота в Telegram
- Нажмите кнопку меню (или кнопку `/start`)
- Web App должен открыться в fullscreen

### 5. Режим разработки

Для тестирования без деплоя можно использовать ngrok:

```bash
# Локально запустите проект
make up

# В другом терминале
ngrok http 8080

# Получите https://xxxx.ngrok-free.app
# Вставьте в BotFather → Web App URL
```

---

## <a name="ssl"></a> 🔒 SSL / HTTPS: Проверка

### Быстрая проверка

```bash
# Проверка сертификата
echo | openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -dates

# Проверка цепочки
curl -v https://your-domain.com/health
```

### Автообновление Let's Encrypt

Добавьте в cron:

```bash
0 3 * * * certbot renew --quiet && docker compose restart nginx
```

---

## <a name="check"></a> ✅ Чек-лист перед запуском

- [ ] `.env` заполнен, `.env` не в git
- [ ] `SECRET_KEY` — случайная строка 32+ символов
- [ ] `TELEGRAM_BOT_TOKEN` — реальный токен от @BotFather
- [ ] `NEXT_PUBLIC_YANDEX_MAPS_KEY` — получен на [developer.tech.yandex.ru](https://developer.tech.yandex.ru/)
- [ ] Домен привязан к серверу (A-запись)
- [ ] HTTPS работает (Let's Encrypt или Cloudflare)
- [ ] Firewall закрыт: 5432, 6379, 8000, 3000
- [ ] Firewall открыт: 80, 443
- [ ] `docker compose ps` показывает все 5 сервисов healthy
- [ ] `curl https://your-domain.com/health` возвращает `{"status":"ok"}`
- [ ] В Telegram бот открывает Web App без ошибок

---

## 🆘 Траблшутинг

| Симптом | Причина | Решение |
|---------|---------|---------|
| `Connection refused` | Docker не запущен | `sudo systemctl start docker` |
| `502 Bad Gateway` | Backend не healthy | `docker logs radius_backend` |
| `initData invalid` | Неверный TELEGRAM_BOT_TOKEN | Проверьте токен в `.env` |
| `CORS error` | Неверный CORS_ORIGINS | Добавьте домен в `CORS_ORIGINS` |
| Карта не загружается | Нет Yandex Maps API ключа | Получите ключ на [tech.yandex.ru](https://developer.tech.yandex.ru/) |
| База пустая | Не выполнился init_db.sql | `make db-init` |
| `Mixed Content` | Frontend на HTTP, backend на HTTPS | `NEXT_PUBLIC_API_URL` должен быть `https://` |
