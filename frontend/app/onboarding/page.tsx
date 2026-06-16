"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/store";
import { profileApi } from "@/utils/api";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { UserMode } from "@/types";
import {
  Phone,
  Calendar,
  FileText,
  Heart,
  Users,
  Briefcase,
  Plane,
  Save,
  Check,
} from "lucide-react";

const MODES: { value: UserMode; label: string; icon: any }[] = [
  { value: "friends", label: "Друзья", icon: Users },
  { value: "dating", label: "Знакомства", icon: Heart },
  { value: "business", label: "Бизнес", icon: Briefcase },
  { value: "travel", label: "Путешествия", icon: Plane },
];

const INTERESTS = [
  "Спорт", "Музыка", "Кино", "Путешествия", "Фото", "Искусство",
  "Еда", "Игры", "Технологии", "Книги", "Природа", "Танцы",
];

interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [tgData, setTgData] = useState<TelegramUserData | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      setTgData(tg.initDataUnsafe.user);
    }
  }, []);

  const [form, setForm] = useState({
    name: user?.name || tgData?.first_name || "",
    username: user?.username || tgData?.username || "",
    phone: user?.profile?.phone || "",
    age: user?.profile?.age?.toString() || "",
    bio: user?.profile?.bio || "",
    mode: (user?.profile?.mode || "friends") as UserMode,
    interests: user?.profile?.interests || [] as string[],
  });

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleRequestPhone = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.requestContact) {
      tg.requestContact((sent: boolean, response: any) => {
        if (sent && response?.response?.contact?.phone_number) {
          setForm((f) => ({ ...f, phone: response.response.contact.phone_number }));
          toast.success("Номер получен!");
        }
      });
    } else {
      toast.error("Эта функция доступна только в Telegram");
    }
  };

  const handleSave = async () => {
    if (!form.age || Number(form.age) < 16) {
      toast.error("Укажите возраст (минимум 16 лет)");
      return;
    }
    if (!form.phone) {
      toast.error("Укажите номер телефона");
      return;
    }
    if (form.interests.length === 0) {
      toast.error("Выберите хотя бы один интерес");
      return;
    }

    setSaving(true);
    try {
      const res = await profileApi.update({
        age: Number(form.age),
        phone: form.phone,
        bio: form.bio,
        mode: form.mode,
        interests: form.interests,
        is_visible: true,
      });
      setUser(res.data);
      toast.success("Профиль создан!");
      router.replace("/nearby");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const avatar = user?.avatar || tgData?.photo_url;
  const fullName = `${tgData?.first_name || ""} ${tgData?.last_name || ""}`.trim() || user?.name || form.name;

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 text-white">
      <div className="safe-top px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold mb-1">Создайте анкету</h1>
        <p className="text-sm text-white/45">
          Заполните данные, чтобы находить людей рядом
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-3xl bg-surface-2 overflow-hidden mb-3">
            {avatar ? (
              <Image src={avatar} alt="avatar" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-white/30">
                {fullName.charAt(0) || "?"}
              </div>
            )}
          </div>
          <h2 className="text-lg font-semibold">{fullName}</h2>
          {form.username && (
            <p className="text-white/40 text-sm">@{form.username}</p>
          )}
          <p className="text-white/30 text-xs mt-1">Данные из Telegram</p>
        </div>

        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium flex items-center gap-2">
            <Phone size={14} /> Телефон <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+7 (999) 000-00-00"
              className="flex-1 bg-surface-2 text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            <button
              onClick={handleRequestPhone}
              className="px-4 py-3 rounded-2xl bg-brand-500/20 text-brand-400 text-sm font-medium active:scale-[0.99] transition"
            >
              Telegram
            </button>
          </div>
          <p className="text-white/30 text-xs">Нужен для подтверждения профиля</p>
        </div>

        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium flex items-center gap-2">
            <Calendar size={14} /> Возраст <span className="text-red-400">*</span>
          </label>
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

        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium flex items-center gap-2">
            <FileText size={14} /> О себе
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Пара слов о себе..."
            maxLength={500}
            rows={3}
            className="w-full bg-surface-2 text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          <p className="text-white/30 text-xs text-right">{form.bio.length}/500</p>
        </div>

        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium">Цель <span className="text-red-400">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setForm((f) => ({ ...f, mode: m.value }))}
                  className={cn(
                    "py-3 rounded-2xl text-sm font-medium transition-all border flex items-center justify-center gap-2",
                    form.mode === m.value
                      ? "bg-brand-500/20 border-brand-500/50 text-brand-400"
                      : "bg-surface-2 border-transparent text-white/40"
                  )}
                >
                  <Icon size={16} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-white/50 text-xs font-medium">
            Интересы <span className="text-red-400">*</span>
          </label>
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
                {form.interests.includes(interest) && <Check size={12} className="inline mr-1" />}
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-0/95 backdrop-blur-lg border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-brand-500 text-white font-medium text-sm active:scale-[0.99] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? "Сохраняем..." : "Сохранить и продолжить"}
        </button>
      </div>
    </div>
  );
}
