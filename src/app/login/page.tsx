"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(params.get("redirect") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card p-8">
        <h1 className="text-2xl font-black tracking-tight mb-1">Welcome back</h1>
        <p className="text-sm text-upm-muted mb-6">Log in to keep your streak alive.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="input" />
          <input type="password" required placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} className="input" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="mt-5 text-sm text-upm-muted text-center">
          No account? <Link href="/signup" className="text-upm-gold font-bold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto mt-10 text-upm-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
