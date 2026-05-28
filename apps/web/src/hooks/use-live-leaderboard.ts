"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";
import { toast } from "@/lib/toast";

type LiveState =
  | { status: "idle" | "connecting" | "polling"; entries: LeaderboardEntry[] }
  | { status: "live"; entries: LeaderboardEntry[]; updatedAt?: string };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api";

function buildStreamUrl(challengeId?: string) {
  const url = new URL("/leaderboard/stream", API_BASE);
  if (challengeId) url.searchParams.set("challengeId", challengeId);
  return url.toString();
}

export function useLiveLeaderboard(opts?: {
  challengeId?: string;
  initial?: LeaderboardEntry[];
}): LiveState {
  const challengeId = opts?.challengeId;
  const [state, setState] = useState<LiveState>({
    status: "idle",
    entries: opts?.initial ?? [],
  });

  const pollTimerRef = useRef<number | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const hasShownConnectionErrorRef = useRef(false);

  const pollUrl = useMemo(() => {
    if (challengeId) return `/leaderboard/${challengeId}?limit=100&offset=0`;
    return "/leaderboard/global";
  }, [challengeId]);

  useEffect(() => {
    setState((prev) => ({ ...prev, status: "connecting" }));

    const reportConnectionError = () => {
      if (hasShownConnectionErrorRef.current) return;
      hasShownConnectionErrorRef.current = true;
      toast.error(
        challengeId
          ? "Couldn't refresh the challenge leaderboard. Retrying..."
          : "Couldn't refresh the leaderboard. Retrying..."
      );
    };

    const clearConnectionError = () => {
      hasShownConnectionErrorRef.current = false;
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      setState((prev) => ({ ...prev, status: "polling" }));

      const fetchOnce = async () => {
        try {
          const res = await api.get(pollUrl);
          const nextEntries: LeaderboardEntry[] = challengeId
            ? res.data.sessions
            : res.data.leaderboard;
          clearConnectionError();
          setState({ status: "polling", entries: nextEntries });
        } catch {
          reportConnectionError();
        }
      };

      void fetchOnce();
      pollTimerRef.current = window.setInterval(() => {
        void fetchOnce();
      }, 5000);
    };

    stopPolling();
    sourceRef.current?.close();
    sourceRef.current = null;

    let closed = false;

    try {
      const source = new EventSource(buildStreamUrl(challengeId));
      sourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (closed) return;
          const nextEntries: LeaderboardEntry[] = challengeId ? data.sessions : data.leaderboard;
          clearConnectionError();
          setState({ status: "live", entries: nextEntries, updatedAt: data.updatedAt });
        } catch {
          // ignore parse errors
        }
      };

      source.onerror = () => {
        if (closed) return;
        source.close();
        reportConnectionError();
        startPolling();
      };
    } catch {
      reportConnectionError();
      startPolling();
    }

    return () => {
      closed = true;
      stopPolling();
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [challengeId, pollUrl]);

  return state;
}
