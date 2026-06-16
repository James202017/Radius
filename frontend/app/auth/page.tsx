"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { authApi, profileApi } from "@/utils/api";
import { useAuthStore } from "@/store/store";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

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
      // Not in Telegram — show demo mode
      setStatus("demo");
      return;
    }

    // Expand to full screen
    tg.expand();
    tg.ready();

    const initData = tg.initData;

    if (!initData) {
      setStatus("error");
      setErrorMsg("Не удалось получить данные Telegram. Закройте и откройте приложение заново.");
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
      setStatus("error");
      setErrorMsg(err.response?.data?.detail || "Ошибка авторизации. Попробуйте позже.");
    }
  }

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
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/20 text-red-400">
          <MapPin size={32} />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">Radius</h1>
        <p className="mb-8 max-w-xs text-sm leading-6 text-white/45 text-red-300">
          {errorMsg}
        </p>
        <button
          onClick={() => router.push("/nearby")}
          className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-medium text-white transition active:scale-[0.99]"
        >
          Открыть демо
        </button>
      </main>
    );
  }

  // Demo mode (not in Telegram)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-400">
        <MapPin size={32} />
      </div>
      <h1 className="mb-3 text-2xl font-semibold">Radius</h1>
      <p className="mb-8 max-w-xs text-sm leading-6 text-white/45">
        Для полноценного входа откройте приложение через Telegram. А пока можно посмотреть демо.
      </p>
      <button
        onClick={() => router.push("/nearby")}
        className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-medium text-white transition active:scale-[0.99]"
      >
        Открыть демо
      </button>
    </main>
  );
}
