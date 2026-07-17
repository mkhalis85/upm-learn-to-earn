"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { isAllowedEmail, ALLOWED_DOMAINS } from "@/lib/constants";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "educator">("student");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!isAllowedEmail(email)) {
      setError(`Please use a UPM email (${ALLOWED_DOMAINS.join(", ")}).`);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setMessage("Check your email to confirm your account, then log in.");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Start earning from day one.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input required placeholder="Full name" value={fullName}
            onChange={(e) => setFullName(e.target.value)} className="input" />
          <input type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="input" />
          <input type="password" required minLength={6} placeholder="Password (min 6 chars)"
            value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          <div>
            <label className="text-sm font-medium text-gray-600">I am a…</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "student" | "educator")}
              className="input mt-1">
              <option value="student">Student (learn &amp; earn)</option>
              <option value="educator">Educator (also upload content)</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-5 text-sm text-gray-500 text-center">
          Already have an account? <Link href="/login" className="text-upm font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
