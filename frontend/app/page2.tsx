"use client";

import { useQuery } from "@tanstack/react-query";
import { interactionApi } from "@/utils/api";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { Match } from "@/types";
import AppLayout from "@/components/AppLayout";

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => interactionApi.getMatches().then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-top">
          <h1 className="text-xl font-semibold text-white mb-4">Матчи</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-nav">
          {isLoading ? (
            <SkeletonList />
          ) : !matches?.length ? (
            <EmptyState
              emoji="💫"
              title="Ещё нет матчей"
              description="Отправляй сигналы людям рядом, и если они ответят взаимностью — появится матч"
            />
          ) : (
            <div className="space-y-2 py-2">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MatchCard({ match }: { match: Match }) {
  const { other_user, last_message, created_at } = match;
  const timeAgo = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
    locale: ru,
  });

  return (
    <Link
      href={`/chat/${match.id}`}
      className="flex items-center gap-4 p-4 bg-surface-1 rounded-3xl border border-white/5 active:scale-[0.99] transition-transform"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded-2xl bg-surface-3 overflow-hidden">
        {other_user.avatar ? (
          <Image src={other_user.avatar} alt={other_user.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {other_user.name.charAt(0)}
          </div>
        )}
        {other_user.is_online && (
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-accent-green border-2 border-surface-1" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-white">{other_user.name}</span>
          <span className="text-white/30 text-xs">{timeAgo}</span>
        </div>
        <p className="text-white/40 text-sm truncate">
          {last_message || "Начните общение 👋"}
        </p>
      </div>
    </Link>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-3xl bg-surface-2 animate-pulse" />
      ))}
    </div>
  );
}
