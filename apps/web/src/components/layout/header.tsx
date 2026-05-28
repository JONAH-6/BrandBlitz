"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { createApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const { data: session, status } = useSession();
  const [streak, setStreak] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");

  const apiToken = useMemo(() => (session as any)?.apiToken as string | undefined, [session]);

  useEffect(() => {
    if (!apiToken) {
      return;
    }

    const api = createApiClient(apiToken);
    void api.get("/users/me/streak").then((response) => {
      const data = response.data;
      setStreak(data.streak ?? null);
      if (data.milestoneJustHit) {
        setToastMessage(`🔥 Streak milestone reached: ${data.streak} days!`);
        window.setTimeout(() => setToastMessage(""), 5000);
      }
    });
  }, [apiToken]);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-xl text-[var(--primary)]">
          BrandBlitz
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/challenge"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Challenges
          </Link>
          <Link
            href="/leaderboard"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Leaderboard
          </Link>
          {session && (
            <Link
              href="/dashboard"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {status === "loading" ? null : session ? (
            <div className="flex items-center gap-3">
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                  width={32}
                  height={32}
                  sizes="32px"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-bold">
                  {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
      {toastMessage ? (
        <div className="fixed right-4 top-20 z-50 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </header>
  );
}
