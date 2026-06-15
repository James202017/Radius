"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Map, User, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/store";

const NAV_ITEMS = [
  { href: "/nearby", icon: Users, label: "Рядом" },
  { href: "/map", icon: Map, label: "Карта" },
  { href: "/matches", icon: Heart, label: "Матчи" },
  { href: "/profile", icon: User, label: "Профиль" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useWebSocket({
    enabled: isAuthenticated,
    onMatch: () => {
      toast("Новый матч!", {
        icon: "*",
        duration: 4000,
      });
    },
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-0">
      <main className="relative flex-1 overflow-hidden">{children}</main>

      <nav className="safe-bottom flex-shrink-0 border-t border-white/5 bg-surface-1/90 backdrop-blur-lg">
        <div className="flex items-center justify-around px-2 pb-1 pt-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-all duration-200",
                  active
                    ? "text-brand-400"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={cn(
                    "transition-transform duration-200",
                    active && "scale-110"
                  )}
                />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
