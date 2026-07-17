"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        pathname === href
          ? "bg-upm text-white shadow-sm"
          : "text-gray-600 hover:text-upm hover:bg-upm-light"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
        <Link href={email ? "/dashboard" : "/"} className="flex items-center gap-2 font-extrabold text-upm">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-upm to-emerald-600 text-white text-sm shadow-sm">
            P
          </span>
          Putra L2E
        </Link>
        <div className="flex items-center gap-1">
          {email ? (
            <>
              {link("/content", "Browse")}
              {link("/upload", "Upload")}
              {link("/leaderboard", "Leaderboard")}
              {link("/dashboard", "Dashboard")}
              <button
                onClick={signOut}
                className="ml-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 transition-colors hover:text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {link("/login", "Log in")}
              <Link href="/signup" className="ml-1 rounded-lg bg-upm px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-upm-dark transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
