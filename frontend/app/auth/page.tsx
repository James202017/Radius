"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Send, ExternalLink, Smartphone } from "lucide-react";
import { authApi, profileApi } from "@/utils/api";
import { useAuthStore } from "@/store/store";

const BOT_USERNAME = "RadiusNearbyBot"; // ← замените на username вашего бота
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

export default function AuthPage() {
  const router = useRouter();
  const { setAuth, setUser, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error" | "demo">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/nearby");
      return;
    }

    // Check if running inside Telegram Web App
    const tg = (window as any).Telegram?.WebApp;

    if (!tg) {
      // Not in Telegram — show browser landing page
      setStatus("demo");
      return;
    }

    // We are inside Telegram Web App
    tg.ready();
    tg.expand();

    // Get initData — this is the raw query string from Telegram
    const initData = tg.initData;

    if (!initData || initData === "") {
      setStatus("error");
      setErrorMsg(
        "Не удалось получить данные авторизации из Telegram. " +
        "Закройте и откройте приложение заново через кнопку меню бота."
      );
      return;
    }

    // Authenticate with backend
    authenticate(initData);
  }, [isAuthenticated, router]);

  async function authenticate(initData: string) {
    try {
      setStatus("loading");
      const res = await authApi.telegramAuth(initData);
      const { access_token, user_id, is_new_user } = res.data;

      setAuth(access_token, user_id);

      // Fetch user profile
      const userRes = await profileApi.getMe();
      setUser(userRes.data);

      if (is_new_user) {
        // New user — show onboarding to fill profile
        router.replace("/onboarding");
      } else {
        router.replace("/nearby");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setStatus("error");
      setErrorMsg(
        err.response?.data?.detail || 
        "Ошибка авторизации. Попробуйте позже или обратитесь к поддержке."
      );
    }
  }

  // ─── Loading (inside Telegram) ───────────────────────────
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
        <p className="mt-6 text-xs text-white/30">Это займёт пару секунд</p>
      </main>
    );
  }

  // ─── Error (inside Telegram, auth failed) ─────────────────
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

  // ─── Browser landing page (not in Telegram) ─────────────────
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

      {/* Open in Telegram button */}
      <a
        href={BOT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-2 rounded-2xl bg-[#24A1DE] px-6 py-3.5 text-sm font-medium text-white transition active:scale-[0.99]"
      >
        <Send size={18} />
        Открыть в Telegram
      </a>

      {/* QR code hint */}
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

      {/* Demo mode */}
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
    </main>
  );
}
