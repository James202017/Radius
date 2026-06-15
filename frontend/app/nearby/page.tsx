"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Send } from "lucide-react";
import Image from "next/image";
import AppLayout from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { useGeolocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";
import type { NearbyUser, UserMode } from "@/types";
import { geoApi, interactionApi } from "@/utils/api";

export default function NearbyPage() {
  const [mode, setMode] = useState<UserMode | undefined>();
  const [radius, setRadius] = useState(1000);
  const { lat, lng, error, loading } = useGeolocation(false);

  const { data, isLoading } = useQuery({
    queryKey: ["nearby", lat, lng, radius, mode],
    queryFn: () => geoApi.getNearby(lat!, lng!, radius, mode).then((r) => r.data),
    enabled: !!lat && !!lng,
    refetchInterval: 20_000,
  });

  const users = data?.users || [];

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <header className="safe-top flex-shrink-0 px-4 pb-3 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Рядом</h1>
              <p className="mt-1 text-xs text-white/35">
                {lat && lng ? "Люди поблизости" : "Демо-режим без геолокации"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-2 text-brand-400">
              <MapPin size={20} />
            </div>
          </div>
          <FilterBar
            mode={mode}
            onModeChange={setMode}
            radius={radius}
            onRadiusChange={setRadius}
          />
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-nav">
          {loading || isLoading ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 rounded-3xl bg-surface-2 animate-pulse" />
              ))}
            </div>
          ) : error || !lat || !lng ? (
            <DemoList />
          ) : users.length ? (
            <div className="space-y-3 py-3">
              {users.map((user) => (
                <UserCard key={user.user_id} user={user} />
              ))}
            </div>
          ) : (
            <EmptyState
              emoji="."
              title="Пока никого рядом"
              description="Попробуй увеличить радиус или вернуться позже."
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function DemoList() {
  return (
    <div className="space-y-3 py-3">
      <EmptyState
        emoji="."
        title="Геолокация не включена"
        description="Браузер не передал координаты, поэтому API-список рядом не запрашивается."
      />
    </div>
  );
}

function UserCard({ user }: { user: NearbyUser }) {
  return (
    <article className="rounded-3xl border border-white/5 bg-surface-1 p-4">
      <div className="flex gap-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-surface-3">
          {user.avatar ? (
            <Image src={user.avatar} alt={user.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-white/40">
              {user.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="truncate font-medium text-white">{user.name}</h2>
            <span className={cn("rounded-lg px-2 py-1 text-xs", distanceClass(user.distance_bucket))}>
              {user.distance_bucket}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-white/45">
            {user.bio || "Пользователь Radius рядом с тобой."}
          </p>
        </div>
      </div>

      <button
        onClick={() => interactionApi.sendInterest(user.user_id).catch(() => undefined)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3 text-sm font-medium text-white transition active:scale-[0.99]"
      >
        <Send size={16} />
        Отправить сигнал
      </button>
    </article>
  );
}

function distanceClass(distance: NearbyUser["distance_bucket"]) {
  if (distance === "50m") return "badge-50m";
  if (distance === "100m") return "badge-100m";
  if (distance === "500m") return "badge-500m";
  return "badge-1km";
}
