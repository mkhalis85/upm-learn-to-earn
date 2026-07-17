"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function LoginStreak() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("register_login").then(() => router.refresh());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
