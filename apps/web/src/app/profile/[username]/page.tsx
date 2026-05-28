import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatScore, formatUsdc } from "@/lib/utils";
import { StreakBadge } from "@/components/gamification/streak-badge";
import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function getUserProfile(username: string) {
  try {
    const res = await api.get(`/users/profile/${username}`);
    return res.data.user;
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const user = await getUserProfile(username);

  if (!user) notFound();

  const streak = user.streak ?? 0;
  const milestones = [3, 7, 14, 30];
  const nextMilestone = milestones.find((m) => m > streak) ?? milestones[milestones.length - 1];
  const progress = Math.min(1, streak / Math.max(1, nextMilestone));

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      {/* Profile header */}
      <div className="flex items-center gap-6 mb-10">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-2xl font-bold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-[var(--muted-foreground)]">@{user.username}</p>
          {user.league && (
            <Badge variant={user.league} className="mt-2">
              {user.league} League
            </Badge>
          )}
        </div>
      </div>

      {streak > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Streak Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Current streak</p>
                <p className="text-3xl font-bold text-[var(--primary)]">{streak} days</p>
              </div>
              <StreakBadge streak={streak} label="Current streak" />
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Next milestone: {nextMilestone} days ({Math.round(progress * 100)}%)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Challenges", value: user.totalChallenges ?? 0 },
          { label: "Best Score", value: formatScore(user.bestScore ?? 0) },
          { label: "USDC Earned", value: `${formatUsdc(user.totalEarned ?? "0")}` },
        ].map(({ label, value }) => (
          <Card key={label} className="text-center">
            <CardContent className="pt-6 pb-4">
              <p className="text-2xl font-bold text-[var(--primary)]">{value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      {user.recentSessions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Challenges</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {user.recentSessions.map(
                  (session: {
                    id: string;
                    brandName: string;
                    totalScore: number;
                    rank?: number;
                    completedAt: string;
                  }) => (
                    <tr
                      key={session.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-6 py-3 font-medium">{session.brandName}</td>
                      <td className="px-6 py-3 text-right">{formatScore(session.totalScore)}</td>
                      <td className="px-6 py-3 text-right text-[var(--muted-foreground)]">
                        {session.rank ? `#${session.rank}` : "—"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
