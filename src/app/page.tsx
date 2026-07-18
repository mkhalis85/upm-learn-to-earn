import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const FEATURES = [
  { icon: "📚", title: "Share knowledge", text: "Educators publish notes, slides, and articles to a campus-wide learning hub." },
  { icon: "🎯", title: "Learn & prove it", text: "Complete content and pass quick quizzes — graded server-side, no shortcuts." },
  { icon: "🪙", title: "Earn PutraToken", text: "Every verified action earns points on an auditable ledger, convertible to PTR." },
  { icon: "🔥", title: "Keep the streak", text: "Daily learning builds streaks, climbs the leaderboard, and unlocks recognition." },
];

const RATES = [
  { action: "Upload approved", pts: 50 },
  { action: "Quiz passed", pts: 25 },
  { action: "Content completed", pts: 10 },
  { action: "Daily login", pts: 5 },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="py-10">
      <div className="text-center max-w-2xl mx-auto">
        <span className="chip border border-upm-gold/40 bg-upm-gold/10 text-upm-gold mb-6">
          🎓 Universiti Putra Malaysia
        </span>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight">
          Learn. Contribute.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-upm-goldDark via-upm-gold to-upm-goldDark">
            Earn.
          </span>
        </h1>
        <p className="mt-6 text-lg text-upm-muted leading-relaxed">
          The campus learning hub where sharing knowledge pays. Upload materials,
          complete lessons, pass quizzes, and earn points toward{" "}
          <span className="font-bold text-upm-gold">PutraToken</span> rewards.
        </p>
        <div className="mt-9 flex gap-3 justify-center">
          <Link href="/signup" className="btn-primary text-base px-8 py-3">Get started free</Link>
          <Link href="/login" className="btn-outline text-base px-8 py-3">Log in</Link>
        </div>
      </div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card card-hover p-5 text-left">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-upm-gold/10 border border-upm-gold/30 text-2xl">
              {f.icon}
            </div>
            <h3 className="mt-4 font-bold text-upm-text">{f.title}</h3>
            <p className="mt-1.5 text-sm text-upm-muted leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 card overflow-hidden border-upm-gold/40">
        <div className="bg-gradient-to-br from-upm-goldDark via-upm-gold to-upm-goldDark p-8 text-center">
          <h2 className="text-2xl font-black text-white">How points become tokens</h2>
          <p className="mt-3 max-w-xl mx-auto text-white/90 leading-relaxed">
            Points live on a server-audited ledger. In Phase 2 they convert to{" "}
            <span className="font-bold text-upm-gold">PTR</span> — a university-branded
            token you hold in your own wallet.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {RATES.map((r) => (
              <div key={r.action} className="rounded-xl bg-white/10 border border-white/25 px-3 py-4">
                <div className="text-2xl font-black text-white">+{r.pts}</div>
                <div className="mt-1 text-xs font-medium text-white/85">{r.action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
