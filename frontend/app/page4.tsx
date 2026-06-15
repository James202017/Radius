"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/utils/api";
import { useAuthStore } from "@/store/store";
import { Settings, Eye, EyeOff, LogOut } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import type { UserMode } from "@/types";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";

const MODES: { value: UserMode; label: string; emoji: string }[] = [
  { value: "friends", label: "Друзья", emoji: "👋" },
  { value: "dating", label: "Знакомства", emoji: "💘" },
  { value: "business", label: "Бизнес", emoji: "💼" },
  { value: "travel", label: "Путешествия", emoji: "✈️" },
];

const INTERESTS = [
  "Спорт", "Музыка", "Кино", "Путешествия", "Фото", "Искусство",
  "Еда", "Игры", "Технологии", "Книги", "Природа", "Танцы",
];

export default function ProfilePage() {
  const { logout, userId } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileApi.getMe().then((r) => r.data),
  });

  const [form, setForm] = useState({
    bio: user?.profile?.bio || "",
    age: user?.profile?.age || "",
    mode: (user?.profile?.mode || "friends") as UserMode,
    interests: user?.profile?.interests || [] as string[],
    is_visible: user?.profile?.is_visible ?? true,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => profileApi.update(data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Профиль обновлён");
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      setEditing(false);
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      bio: form.bio,
      age: form.age ? Number(form.age) : undefined,
      mode: form.mode,
      interests: form.interests,
      is_visible: form.is_visible,
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-y-auto safe-top pb-nav">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="text-xl font-semibold text-white">Профиль</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm((f) => ({ ...f, is_visible: !f.is_visible }))}
              className="p-2 rounded-xl bg-surface-2 text-white/50"
            >
              {form.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 rounded-xl bg-surface-2 text-white/50"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Avatar & name */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 rounded-3xl bg-surface-2 overflow-hidden mb-3">
            {user?.avatar ? (
              <Image src={user.avatar} alt={user.name} width={96} height={96} className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-white/30">
                {user?.name?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
          {user?.username && (
            <p className="text-white/40 text-sm">@{user.username}</p>
          )}
        </div>

        {/* Edit form */}
        <div className="px-4 space-y-6">
          {/* Mode selection */}
          <div>
            <label className="text-white/50 text-xs font-medium mb-2 block">Режим</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setForm((f) => ({ ...f, mode: m.value }))}
                  className={cn(
                    "py-3 rounded-2xl text-sm font-medium transition-all border",
                    form.mode === m.value
                      ? "bg-brand-500/20 border-brand-500/50 text-brand-400"
                      : "bg-surface-2 border-transparent text-white/40"
                  )}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-white/50 text-xs font-medium mb-2 block">О себе</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Пара слов о себе..."
              maxLength={500}
              className="w-full bg-surface-2 text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              rows={3}
            />
          </div>

          {/* Age */}
          <div>
            <label className="text-white/50 text-xs font-medium mb-2 block">Возраст</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              placeholder="Ваш возраст"
              min={16}
              max={100}
              className="w-full bg-surface-2 text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
          </div>

          {/* Interests */}
          <div>
            <label className="text-white/50 text-xs font-medium mb-2 block">Интересы</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm transition-all border",
                    form.interests.includes(interest)
                      ? "bg-brand-500/20 border-brand-500/50 text-brand-400"
                      : "bg-surface-2 border-transparent text-white/40"
                  )}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full py-4 rounded-2xl bg-brand-500 text-white font-medium active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            {updateMutation.isPending ? "Сохраняем..." : "Сохранить"}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full py-3 rounded-2xl bg-surface-2 text-white/40 text-sm flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
