import { createClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, points, streak")
    .order("points", { ascending: false })
    .limit(50);
  const rows = (data as Pick<Profile, "id" | "full_name" | "role" | "points" | "streak">[]) ?? [];

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-upm-muted">Top contributors and learners across campus.</p>

      {rows.length >= 3 && (
        <div className="mt-8 grid grid-cols-3 gap-3 items-end">
          {[rows[1], rows[0], rows[2]].map((r, idx) => {
            const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const heights = ["pt-6", "pt-2", "pt-8"];
            const medals = ["🥈", "🥇", "🥉"];
            return (
              <div key={r.id}
                className={`card card-hover p-5 text-center ${heights[idx]} ${
                  place === 1 ? "border-upm-gold/70 shadow-upm-gold/20 bg-gradient-to-b from-upm-gold/10 to-transparent" : ""
                }`}>
                <div className="text-3xl">{medals[idx]}</div>
                <div className="mt-2 font-bold truncate">{r.full_name ?? "—"}</div>
                <div className={`text-2xl font-black mt-1 ${place === 1 ? "text-upm-gold" : "text-upm-text"}`}>
                  {r.points.toLocaleString()}
                </div>
                <div className="text-xs text-upm-muted">points</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-upm-deep text-xs uppercase tracking-wider text-upm-muted">
            <tr>
              <th className="px-5 py-3 w-16">#</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3 text-right">Streak</th>
              <th className="px-5 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-upm-border/50">
            {rows.map((r, i) => (
              <tr key={r.id}
                className={`transition-colors hover:bg-upm-light/50 ${
                  r.id === user?.id ? "bg-upm-gold/10" : ""
                }`}>
                <td className="px-5 py-3.5 font-bold text-upm-muted">{i + 1}</td>
                <td className="px-5 py-3.5 font-semibold">
                  {r.full_name ?? "—"}
                  {r.id === user?.id && <span className="chip ml-2 bg-upm-gold text-white">you</span>}
                </td>
                <td className="px-5 py-3.5 capitalize text-sm text-upm-muted">{r.role}</td>
                <td className="px-5 py-3.5 text-right text-sm">{r.streak} 🔥</td>
                <td className="px-5 py-3.5 text-right font-black text-upm-gold">{r.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
