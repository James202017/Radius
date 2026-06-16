# 🚀 Деплой фронтенда на Vercel (пошаговая инструкция)

> Бэкенд уже работает: https://radius-backend-nke4.onrender.com
> Осталось задеплоить фронтенд на Vercel и подключить Telegram.

---

## ✅ Шаг 1: Регистрация на Vercel

1. Откройте https://vercel.com
2. Нажмите **Sign Up** (или **Get Started**)
3. Выберите **Continue with GitHub**
4. Авторизуйте Vercel в GitHub (разрешите доступ к репозиториям)

---

## ✅ Шаг 2: Импорт проекта

1. После входа — Dashboard Vercel
2. Нажмите **Add New...** → **Project**
3. В списке репозиториев найдите: `James202017/Radius`
4. Нажмите **Import** (справа от репозитория)

---

## ✅ Шаг 3: Настройка проекта (САМЫЙ ВАЖНЫЙ ШАГ!)

На странице **Configure Project** заполните:

| Поле | Значение | Почему важно |
|------|----------|-------------|
| **Project Name** | `radius-frontend` (или любое) | Имя проекта |
| **Framework Preset** | `Next.js` | Автоматически определится |
| **Root Directory** | `frontend` ⚠️ | **ОБЯЗАТЕЛЬНО!** Фронтенд в папке `frontend/` |
| **Build Command** | `npm run build` | Оставьте по умолчанию |
| **Output Directory** | `.next` | Оставьте по умолчанию |

> ⚠️ **Если Root Directory не `frontend` — сборка сломается!**

---

## ✅ Шаг 4: Environment Variables (перед Deploy!)

**НЕ нажимайте Deploy!** Сначала добавьте переменные:

1. Найдите блок **Environment Variables** (внизу страницы)
2. Нажмите **Add** для каждой переменной:

### Переменная 1: NEXT_PUBLIC_API_URL
```
Key:   NEXT_PUBLIC_API_URL
Value: https://radius-backend-nke4.onrender.com/api/v1
```

### Переменная 2: NEXT_PUBLIC_WS_URL
```
Key:   NEXT_PUBLIC_WS_URL
Value: wss://radius-backend-nke4.onrender.com/api/v1
```

### Переменная 3: NEXT_PUBLIC_YANDEX_MAPS_KEY
```
Key:   NEXT_PUBLIC_YANDEX_MAPS_KEY
Value: ae299fc6-cda3-4821-8cc0-413a2ff3578f
```

> 💡 **Копируйте значения точно как написано выше!**

---

## ✅ Шаг 5: Deploy

1. Нажмите **Deploy**
2. Ждите 2–3 минуты (Vercel покажет лог сборки)
3. Когда увидите зелёную галочку ✅ — деплой готов!

**Ваш URL:**
```
https://radius-frontend-xxx.vercel.app
```
(где `xxx` — случайные буквы/цифры, Vercel присвоит автоматически)

**Скопируйте этот URL!** Он понадобится ниже.

---

## ✅ Шаг 6: Проверка фронтенда

Откройте в браузере:
```
https://radius-frontend-xxx.vercel.app
```

Должен открыться экран Radius с тёмной темой и кнопкой «Открыть демо».

Если белый экран или ошибка — смотрите логи в Vercel Dashboard.

---

## ✅ Шаг 7: Обновить CORS в Render (бэкенд)

Бэкенд должен разрешать запросы с вашего фронтенда:

1. Откройте https://dashboard.render.com
2. Выберите сервис `radius-backend-nke4`
3. В боковом меню: **Environment** → **Environment Variables**
4. Найдите `CORS_ORIGINS` и замените значение на:
   ```
   https://radius-frontend-xxx.vercel.app,https://web.telegram.org
   ```
   (подставьте ваш реальный URL с Vercel!)
5. Render автоматически перезапустит бэкенд (ждите 1 минуту)

---

## ✅ Шаг 8: Telegram Mini App

1. Откройте **@BotFather** в Telegram
2. Отправьте: `/mybots`
3. Выберите ваш бот (у которого токен `8675388500:AAH5aBNFTMregxYV2MWX60wtir_03tRcUJw`)
4. **Bot Settings** → **Menu Button** → **Configure menu button**
5. **Configure Web App**
6. Вставьте URL вашего фронтенда:
   ```
   https://radius-frontend-xxx.vercel.app
   ```
7. Нажмите **Save**

---

## ✅ Шаг 9: Тестирование

1. Откройте вашего бота в Telegram (на телефоне!)
2. Нажмите кнопку меню (внизу слева) или `/start`
3. Должно открыться приложение Radius с тёмной темой

---

## 🔧 Траблшутинг

| Проблема | Где смотреть | Решение |
|----------|-------------|---------|
| **Белый экран** | Vercel Dashboard → Deployments → Logs | Проверьте Environment Variables |
| **CORS error** | Console браузера (F12) | Обновите CORS_ORIGINS в Render |
| **"Not Found" в Telegram** | URL в BotFather | Должен быть URL фронтенда, не бэкенда |
| **Карта не работает** | — | Нормально без геолокации, проверьте API ключ |
| **Ошибка сборки** | Vercel Logs | Проверьте Root Directory = `frontend` |
| **Бэкенд не отвечает** | `curl https://radius-backend-nke4.onrender.com/health` | Должно вернуть `{"status":"ok"}` |

---

## 📋 Чек-лист

- [ ] Vercel: регистрация через GitHub
- [ ] Vercel: импорт репозитория `Radius`
- [ ] Vercel: **Root Directory = `frontend`**
- [ ] Vercel: добавлены 3 Environment Variables
- [ ] Vercel: деплой успешен, URL скопирован
- [ ] Render: CORS обновлён с URL фронтенда
- [ ] Telegram: Web App URL = URL фронтенда Vercel
- [ ] Тест: приложение открывается в Telegram

---

## 💾 Сохраните эти данные

```
Бэкенд:  https://radius-backend-nke4.onrender.com
Фронтенд: https://radius-frontend-xxx.vercel.app (ваш URL)
Telegram: @BotFather → ваш бот → Web App URL
```
