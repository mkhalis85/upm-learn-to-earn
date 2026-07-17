import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const FEATURES = [
  { icon: "📚", title: "Share knowledge", text: "Educators publish notes, slides, and articles to a campus-wide learning hub." },
  { icon: "🎯", title: "Learn & prove it", text: "Complete content and pass quick quizzes — graded server-side, no shortcuts." },
  { icon: "🪙", title: "Earn PutraToken", text: "Every verified action earns points on an auditable ledger, convertible to PTR." },
  { icon: "🔥", title: "Keep the streak", text: "Daily learning builds streaks, climbs the leaderboard, and unlocks recognition." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="py-10">
      <div className="text-center max-w-2xl mx-auto">
        <span className="chip bg-upm-light text-upm mb-6">🎓 Universiti Putra Malaysia</span>
        <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
          Learn. Contribute.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-upm to-emerald-500">
            Earn.
          </span>
        </h1>
        <p className="mt-5 text-lg text-gray-600 leading-relaxed">
          The campus learning hub where sharing knowledge pays. Upload materials,
          complete lessons, pass quizzes, and earn points toward{" "}
          <span className="font-semibold text-upm">PutraToken</span> rewards.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/signup" className="btn-primary">Get started free</Link>
          <Link href="/login" className="btn-outline">Log in</Link>
        </div>
      </div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card card-hover p-5 text-left">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 card p-8 text-center bg-gradient-to-br from-upm to-upm-dark text-white border-0">
        <h2 className="text-2xl font-bold">How points become tokens</h2>
        <p className="mt-3 max-w-xl mx-auto text-emerald-50 leading-relaxed">
          Points live on a server-audited ledger. In Phase 2 they convert to PTR —
          a university-branded token you hold in your own wallet. Upload 50 · Complete 10 · Quiz 25 · Daily 5.
        </p>
      </div>
    </div>
  );
}
