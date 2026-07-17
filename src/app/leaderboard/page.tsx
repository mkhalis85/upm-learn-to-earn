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
      <h1 className="text-3xl font-extrabold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-gray-500">Top contributors and learners across campus.</p>

      {rows.length >= 3 && (
        <div className="mt-8 grid grid-cols-3 gap-3 items-end">
          {[rows[1], rows[0], rows[2]].map((r, idx) => {
            const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const heights = ["pt-6", "pt-2", "pt-8"];
            const medals = ["🥈", "🥇", "🥉"];
            return (
              <div key={r.id} className={`card card-hover p-5 text-center ${heights[idx]} ${place === 1 ? "border-upm/50 shadow-md" : ""}`}>
                <div className="text-3xl">{medals[idx]}</div>
                <div className="mt-2 font-bold truncate">{r.full_name ?? "—"}</div>
                <div className="text-2xl font-extrabold text-upm mt-1">{r.points.toLocaleString()}</div>
                <div className="text-xs text-gray-400">points</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 w-16">#</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3 text-right">Streak</th>
              <th className="px-5 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-gray-50/70 ${r.id === user?.id ? "bg-upm-light/60" : ""}`}>
                <td className="px-5 py-3.5 font-semibold text-gray-500">{i + 1}</td>
                <td className="px-5 py-3.5 font-medium">
                  {r.full_name ?? "—"}
                  {r.id === user?.id && <span className="chip ml-2 bg-upm text-white">you</span>}
                </td>
                <td className="px-5 py-3.5 capitalize text-sm text-gray-500">{r.role}</td>
                <td className="px-5 py-3.5 text-right text-sm">{r.streak} 🔥</td>
                <td className="px-5 py-3.5 text-right font-bold text-upm">{r.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
