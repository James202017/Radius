"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";
import { authApi, profileApi } from "@/utils/api";
import { MapPin, Send, ExternalLink } from "lucide-react";

const BOT_USERNAME = "Radius_my_bot";
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

export default function AuthPage() {
  const router = useRouter();
  const { setAuth, setUser, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error" | "browser">("loading");
  const [msg, setMsg] = useState("Проверка...");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/nearby");
      return;
    }

    // Ждём загрузки Telegram WebApp (до 3 секунд)
    let found = false;
    let attempts = 0;
    const max = 30;

    const interval = setInterval(() => {
      attempts++;
      const tg = (window as any).Telegram?.WebApp;

      if (tg) {
        found = true;
        clearInterval(interval);
        setMsg("Telegram найден, авторизация...");
        handleTelegramAuth(tg);
        return;
      }

      if (attempts >= max) {
        clearInterval(interval);
        if (!found) {
          setMsg("");
          setStatus("browser");
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isAuthenticated, router]);

  async function handleTelegramAuth(tg: any) {
    try {
      tg.ready();
      tg.expand();

      const initData = tg.initData || "";

      if (!initData) {
        setStatus("error");
        setMsg("Нет данных авторизации. Откройте через меню бота.");
        return;
      }

      const res = await authApi.telegramAuth(initData);
      const { access_token, user_id, is_new_user } = res.data;

      setAuth(access_token, user_id);

      const userRes = await profileApi.getMe();
      setUser(userRes.data);

      if (is_new_user) {
        router.replace("/onboarding");
      } else {
        router.replace("/nearby");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMsg(err.response?.data?.detail || "Ошибка входа. Попробуйте позже.");
    }
  }

  // ─── Загрузка (в Telegram) ───
  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 text-white">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-400">
          <MapPin size={32} />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Radius</h1>
        <p className="text-sm text-white/45 mb-6">{msg}</p>
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  // ─── Ошибка (в Telegram, но initData пустой) ───
  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/20 text-red-400">
          <MapPin size={32} />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Radius</h1>
        <p className="text-sm text-red-300 mb-6 max-w-xs">{msg}</p>
        <a href={BOT_LINK} className="mb-3 flex items-center gap-2 rounded-2xl bg-[#24A1DE] px-6 py-3 text-sm font-medium text-white">
          <Send size={16} /> Открыть через бота
        </a>
        <button onClick={() => router.push("/nearby")} className="rounded-2xl bg-surface-1 px-6 py-3 text-sm text-white/60">
          Демо-режим
        </button>
      </main>
    );
  }

  // ─── Браузер (не Telegram) ───
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-400">
        <MapPin size={40} />
      </div>
      <h1 className="text-3xl font-semibold mb-2">Radius</h1>
      <p className="text-sm text-brand-400 mb-2">Люди рядом с тобой</p>
      <p className="text-sm text-white/45 mb-8 max-w-xs">
        Это приложение для Telegram. Откройте через бота для автоматического входа.
      </p>

      <a href={BOT_LINK} className="mb-4 flex items-center gap-2 rounded-2xl bg-[#24A1DE] px-6 py-3.5 text-sm font-medium text-white">
        <Send size={18} /> Открыть в Telegram
      </a>

      <div className="mb-8 rounded-2xl bg-surface-1 p-4 border border-white/5 max-w-xs text-left">
        <p className="text-sm text-white/60 mb-2">Как открыть:</p>
        <ol className="text-xs text-white/40 space-y-2">
          <li>1. Нажмите кнопку выше</li>
          <li>2. Нажмите Start в боте</li>
          <li>3. Приложение откроется автоматически</li>
        </ol>
      </div>

      <button onClick={() => router.push("/nearby")} className="flex items-center gap-2 rounded-2xl bg-surface-1 border border-white/10 px-6 py-3 text-sm text-white/60">
        <ExternalLink size={16} /> Демо-режим
      </button>
    </main>
  );
}
