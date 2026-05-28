"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatScore, formatUsdc } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/api";
import { useLiveLeaderboard } from "@/hooks/use-live-leaderboard";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LiveGlobalLeaderboard({ initial }: { initial: LeaderboardEntry[] }) {
  const { entries } = useLiveLeaderboard({ initial });
  const prevRankByUserRef = useRef<Map<string, number>>(new Map());
  const [changedUsers, setChangedUsers] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    return entries.map((e) => {
      const userKey = e.userId ?? e.username;
      return { ...e, _key: userKey };
    });
  }, [entries]);

  useEffect(() => {
    const prev = prevRankByUserRef.current;
    const changed = new Set<string>();
    for (const row of rows) {
      const prevRank = prev.get(row._key);
      if (prevRank !== undefined && prevRank !== row.rank) changed.add(row._key);
      prev.set(row._key, row.rank);
    }
    if (changed.size === 0) return;
    setChangedUsers(changed);
    const t = window.setTimeout(() => setChangedUsers(new Set()), 600);
    return () => window.clearTimeout(t);
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No games played yet"
          description="Be the first to climb the leaderboard."
          action={
            <Link href="/challenge">
              <Button>Browse Challenges</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border)]">
          <th className="text-left px-6 py-3 font-medium text-[var(--muted-foreground)]">
            Rank
          </th>
          <th className="text-left px-6 py-3 font-medium text-[var(--muted-foreground)]">
            Player
          </th>
          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">
            Score
          </th>
          <th className="text-right px-6 py-3 font-medium text-[var(--muted-foreground)]">
            Earned
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => (
          <tr
            key={entry._key}
            className={[
              "border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors",
              changedUsers.has(entry._key) ? "bg-[var(--muted)]" : "",
            ].join(" ")}
          >
            <td className="px-6 py-4 font-bold">{MEDAL[entry.rank] ?? `#${entry.rank}`}</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt={entry.displayName ?? entry.username}
                    width={32}
                    height={32}
                    sizes="32px"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
                    {(entry.displayName ?? entry.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{entry.displayName ?? entry.username}</span>
                {entry.league && (
                  <Badge variant={entry.league as "gold" | "silver" | "bronze"}>
                    {entry.league}
                  </Badge>
                )}
              </div>
            </td>
            <td className="px-6 py-4 text-right font-mono">{formatScore(entry.totalScore)}</td>
            <td className="px-6 py-4 text-right text-green-600 font-medium">
              {entry.totalEarned ? `${formatUsdc(entry.totalEarned)} USDC` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

