"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center text-white">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-400">
        <MapPin size={32} />
      </div>
      <h1 className="mb-3 text-2xl font-semibold">Radius</h1>
      <p className="mb-8 max-w-xs text-sm leading-6 text-white/45">
        Локальный запуск работает. Для полноценного входа нужен Telegram Web App
        init data, а пока можно открыть демо-экраны приложения.
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
