"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Даём Zustand время загрузить из localStorage
    const timer = setTimeout(() => {
      setChecked(true);
      if (isAuthenticated) {
        router.replace("/nearby");
      } else {
        router.replace("/auth");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}
