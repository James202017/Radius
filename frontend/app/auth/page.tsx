"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Send, ExternalLink, Smartphone } from "lucide-react";
import { authApi, profileApi } from "@/utils/api";
import { useAuthStore } from "@/store/store";

const BOT_USERNAME = "Radius_my_bot";
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;
const TG_SCRIPT = "https://telegram.org/js/telegram-web-app.js";

export default function AuthPage() {
  const router = useRouter();
  const { setAuth, setUser, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error" | "demo">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const checkAttempts = useRef(0);

  const addDebug = (msg: string) => {
    console.log("[Radius Auth]", msg);
    setDebugInfo((prev) => [...prev.slice(-4), msg]);
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/nearby");
      return;
    }

    // Пытаемся загрузить Telegram Web App
    loadTelegramAndAuth();
  }, [isAuthenticated, router]);

  async function loadTelegramAndAuth() {
    addDebug("Проверка Telegram WebApp...");

    // 1. Если Telegram уже загружен — сразу авторизуемся
    if ((window as any).Telegram?.WebApp) {
      addDebug("Telegram WebApp найден");
      await doAuth();
      return;
    }

    // 2. Загружаем скрипт Telegram WebApp
    addDebug("Загрузка скрипта Telegram...");
    await loadTelegramScript();

    // 3. Ждём появления window.Telegram (до 3 секунд)
    let attempts = 0;
    const maxAttempts = 30; // 30 * 100ms = 3 секунды

    const interval = setInterval(() => {
      attempts++;
      checkAttempts.current = attempts;
      const tg = (window as any).Telegram?.WebApp;

      if (tg) {
        clearInterval(interval);
        addDebug(`Telegram загружен за ${attempts * 100}мс`);
        doAuth();
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        addDebug("Telegram не загрузился за 3 секунды — демо-режим");
        setStatus("demo");
      }
    }, 100);
  }

  function loadTelegramScript(): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${TG_SCRIPT}"]`)) {
        addDebug("Скрипт Telegram уже в DOM");
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = TG_SCRIPT;
      script.async = true;
      script.onload = () => {
        addDebug("Скрипт Telegram загружен");
        resolve();
      };
      script.onerror = () => {
        addDebug("Ошибка загрузки скрипта Telegram");
        resolve(); // Продолжаем — возможно скрипт уже есть
      };
      document.head.appendChild(script);

      // Таймаут 2 секунды
      setTimeout(() => resolve(), 2000);
    });
  }

  async function doAuth() {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      addDebug("Telegram WebApp не найден после загрузки");
      setStatus("demo");
      return;
    }

    tg.ready();
    tg.expand();

    addDebug("Telegram WebApp ready");

    // Проверяем initData
    const initData = tg.initData || "";
    const initDataUnsafe = tg.initDataUnsafe || {};

    addDebug(`initData: ${initData ? "есть" : "нет"}`);
    addDebug(`initDataUnsafe.user: ${initDataUnsafe.user ? "есть" : "нет"}`);

    if (!initData && !initDataUnsafe.user) {
      setStatus("error");
      setErrorMsg(
        "Не удалось получить данные авторизации из Telegram. " +
        "Закройте и откройте приложение заново через меню бота."
      );
      return;
    }

    // Если нет initData, но есть initDataUnsafe — используем его для отладки
    // (в продакшене initData должен быть!)
    const dataToSend = initData || JSON.stringify(initDataUnsafe);

    try {
      setStatus("loading");
      addDebug("Отправка данных на сервер...");

      const res = await authApi.telegramAuth(dataToSend);
      const { access_token, user_id, is_new_user } = res.data;

      addDebug(`Авторизация успешна! Новый пользователь: ${is_new_user}`);

      setAuth(access_token, user_id);

      const userRes = await profileApi.getMe();
      setUser(userRes.data);

      if (is_new_user) {
        router.replace("/onboarding");
      } else {
        router.replace("/nearby");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      addDebug(`Ошибка: ${err.response?.data?.detail || err.message}`);
      setStatus("error");
      setErrorMsg(
        err.response?.data?.detail ||
        "Ошибка авторизации. Попробуйте позже или обратитесь к поддержке."
      );
    }
  }

  // ─── Loading ───────────────────────────
  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-400">
          <MapPin size={32} />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">Radius</h1>
        <p className="mb-8 max-w-xs text-sm leading-6 text-white/45">
          Вход через Telegram...
        </p>
        <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        {/* Отладочная информация */}
        <div className="mt-6 space-y-1">
          {debugInfo.map((msg, i) => (
            <p key={i} className="text-xs text-white/20">{msg}</p>
          ))}
        </div>
      </main>
    );
  }

  // ─── Error ─────────────────
  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/20 text-red-400">
          <MapPin size={32} />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">Radius</h1>
        <p className="mb-8 max-w-xs text-sm leading-6 text-red-300">
          {errorMsg}
        </p>
        {/* Отладочная информация */}
        <div className="mb-6 rounded-2xl bg-surface-1 p-3 border border-white/5 max-w-xs w-full">
          <p className="text-xs text-white/30 mb-2">Отладка:</p>
          {debugInfo.map((msg, i) => (
            <p key={i} className="text-xs text-white/20">• {msg}</p>
          ))}
        </div>
        <div className="space-y-3">
          <button
            onClick={() => router.push("/nearby")}
            className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-medium text-white transition active:scale-[0.99]"
          >
            Открыть демо-режим
          </button>
          <p className="text-xs text-white/30">
            В демо-режиме доступны все функции без авторизации
          </p>
        </div>
      </main>
    );
  }

  // ─── Browser landing page ─────────────────
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-400">
        <MapPin size={40} />
      </div>
      <h1 className="mb-2 text-3xl font-semibold">Radius</h1>
      <p className="mb-2 max-w-xs text-sm leading-6 text-brand-400">
        Люди рядом с тобой
      </p>
      <p className="mb-8 max-w-xs text-sm leading-6 text-white/45">
        Radius — это мини-приложение для Telegram. Откройте его через бота, чтобы авторизоваться и находить людей поблизости.
      </p>

      <a
        href={BOT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-2 rounded-2xl bg-[#24A1DE] px-6 py-3.5 text-sm font-medium text-white transition active:scale-[0.99]"
      >
        <Send size={18} />
        Открыть в Telegram
      </a>

      <div className="mb-8 rounded-2xl bg-surface-1 p-4 border border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone size={16} className="text-white/40" />
          <p className="text-sm text-white/60">Как открыть?</p>
        </div>
        <ol className="text-left text-xs text-white/40 space-y-2">
          <li>1. Нажмите кнопку «Открыть в Telegram» выше</li>
          <li>2. Нажмите «Start» или кнопку меню внизу</li>
          <li>3. Приложение откроется автоматически</li>
        </ol>
      </div>

      <div className="border-t border-white/5 pt-6 w-full max-w-xs">
        <p className="text-xs text-white/30 mb-3">
          Хотите посмотреть без Telegram?
        </p>
        <button
          onClick={() => router.push("/nearby")}
          className="flex items-center gap-2 mx-auto rounded-2xl bg-surface-1 border border-white/10 px-6 py-3 text-sm font-medium text-white/60 transition active:scale-[0.99]"
        >
          <ExternalLink size={16} />
          Демо-режим
        </button>
      </div>

      {/* Отладка для демо-режима */}
      {debugInfo.length > 0 && (
        <div className="mt-6 rounded-2xl bg-surface-1 p-3 border border-white/5 max-w-xs w-full">
          <p className="text-xs text-white/30 mb-2">Отладка:</p>
          {debugInfo.map((msg, i) => (
            <p key={i} className="text-xs text-white/20">• {msg}</p>
          ))}
        </div>
      )}
    </main>
  );
}
