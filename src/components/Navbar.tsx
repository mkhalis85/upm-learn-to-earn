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
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        pathname === href
          ? "bg-upm-gold text-white shadow-md shadow-upm-gold/30"
          : "text-upm-muted hover:text-upm-gold hover:bg-upm-gold/10"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-upm-border/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
        <Link href={email ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-extrabold text-upm-text">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-upm-gold to-upm-goldDark text-white text-sm font-black shadow-md shadow-upm-gold/30">
            P
          </span>
          Putra <span className="text-upm-gold">L2E</span>
        </Link>
        <div className="flex items-center gap-1">
          {email ? (
            <>
              {link("/content", "Browse")}
              {link("/upload", "Upload")}
              {link("/leaderboard", "Leaderboard")}
              {link("/wallet", "Wallet")}
              {link("/dashboard", "Dashboard")}
              <button
                onClick={signOut}
                className="ml-2 px-3 py-1.5 rounded-lg text-sm text-upm-muted/70 transition-colors hover:text-upm-goldDark hover:bg-upm-light"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {link("/login", "Log in")}
              <Link href="/signup" className="ml-1 rounded-lg bg-upm-gold px-4 py-1.5 text-sm font-bold text-white shadow-md shadow-upm-gold/30 hover:brightness-110 transition-all">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
