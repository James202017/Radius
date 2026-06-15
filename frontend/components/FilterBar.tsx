"use client";

import { cn } from "@/lib/utils";
import type { UserMode } from "@/types";

const MODES: { value: UserMode | undefined; label: string }[] = [
  { value: undefined, label: "Все" },
  { value: "friends", label: "Друзья" },
  { value: "dating", label: "Знакомства" },
  { value: "business", label: "Бизнес" },
  { value: "travel", label: "Путешествия" },
];

const RADII = [
  { value: 200, label: "200м" },
  { value: 500, label: "500м" },
  { value: 1000, label: "1 км" },
  { value: 3000, label: "3 км" },
];

interface FilterBarProps {
  mode: UserMode | undefined;
  onModeChange: (mode: UserMode | undefined) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

export function FilterBar({ mode, onModeChange, radius, onRadiusChange }: FilterBarProps) {
  return (
    <div className="space-y-2">
      {/* Mode filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {MODES.map((m) => (
          <button
            key={m.label}
            onClick={() => onModeChange(m.value)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200",
              mode === m.value
                ? "bg-brand-500 text-white"
                : "bg-surface-2 text-white/40 hover:text-white/60"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Radius filters */}
      <div className="flex gap-2">
        {RADII.map((r) => (
          <button
            key={r.value}
            onClick={() => onRadiusChange(r.value)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs transition-all duration-200",
              radius === r.value
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/50"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
