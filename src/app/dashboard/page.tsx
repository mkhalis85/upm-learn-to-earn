import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Profile, PointTransaction } from "@/lib/types";
import { REASON_LABELS } from "@/lib/constants";
import LoginStreak from "@/components/LoginStreak";

export const dynamic = "force-dynamic";

const REASON_ICONS: Record<string, string> = {
  content_upload_approved: "📤",
  content_completed: "✅",
  quiz_passed: "🎯",
  daily_login: "🔥",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileRow } = await supabase
    .from("profiles").select("*").eq("id", user!.id).single();
  const profile = profileRow as Profile;

  const { data: txRows } = await supabase
    .from("point_transactions").select("*")
    .order("created_at", { ascending: false }).limit(15);
  const txs = (txRows as PointTransaction[]) ?? [];

  const { count: rank } = await supabase
    .from("profiles").select("id", { count: "exact", head: true })
    .gt("points", profile.points);

  return (
    <div>
      <LoginStreak />
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Welcome back, <span className="text-upm-gold">{profile.full_name ?? "learner"}</span>
          </h1>
          <span className="chip mt-2 border border-upm-border bg-upm-light text-upm-muted capitalize">{profile.role}</span>
        </div>
        <div className="flex gap-2">
          <Link href="/content" className="btn-primary">Browse content</Link>
          {(profile.role === "educator" || profile.role === "admin") && (
            <Link href="/upload" className="btn-outline">Upload</Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-6 border-0 bg-gradient-to-br from-upm-goldDark to-upm-gold text-white">
          <div className="text-sm font-semibold text-white/90">Total points</div>
          <div className="mt-1 text-4xl font-black text-white">{profile.points.toLocaleString()}</div>
          <Link href="/wallet" className="mt-2 inline-block text-xs font-bold text-white underline underline-offset-2 hover:text-white/80">
            Convert to PTR →
          </Link>
        </div>
        <div className="card p-6">
          <div className="text-sm font-semibold text-upm-muted">Day streak</div>
          <div className="mt-1 text-4xl font-black">{profile.streak} <span className="text-2xl">🔥</span></div>
          <div className="mt-2 text-xs text-upm-muted">come back tomorrow to keep it alive</div>
        </div>
        <div className="card p-6">
          <div className="text-sm font-semibold text-upm-muted">Leaderboard rank</div>
          <div className="mt-1 text-4xl font-black text-upm-text">#{(rank ?? 0) + 1}</div>
          <Link href="/leaderboard" className="mt-2 inline-block text-xs font-bold text-upm-gold hover:underline">
            view leaderboard →
          </Link>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-bold">Recent activity</h2>
      {txs.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-upm-muted">
          No points yet — complete some content to get started.
        </div>
      ) : (
        <ul className="card mt-3 divide-y divide-upm-border/50 overflow-hidden">
          {txs.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-upm-light transition-colors">
              <span className="flex items-center gap-3 text-sm font-semibold">
                <span className="text-lg">{REASON_ICONS[t.reason] ?? "⭐"}</span>
                {REASON_LABELS[t.reason] ?? t.reason}
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-upm-muted/70">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
                <span className="chip border border-upm-gold/40 bg-upm-gold/10 text-upm-gold">+{t.amount}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
