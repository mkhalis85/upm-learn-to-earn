"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import type { Conversion, Profile } from "@/lib/types";

const RATE = 100; // points per PTR

type Eth = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export default function WalletPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [points, setPoints] = useState(RATE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p as Profile);
    const { data: c } = await supabase.from("conversions").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setConversions((c as Conversion[]) ?? []);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function connectWallet() {
    setErr(null); setMsg(null);
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) { setErr("MetaMask not detected. Install the MetaMask extension, then reload this page."); return; }
    setBusy(true);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("No account returned.");
      const { error } = await supabase.from("profiles")
        .update({ wallet_address: address }).eq("id", profile!.id);
      if (error) throw error;
      setMsg("Wallet linked.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Wallet connection failed.");
    } finally { setBusy(false); }
  }

  async function unlink() {
    setBusy(true); setErr(null); setMsg(null);
    await supabase.from("profiles").update({ wallet_address: null }).eq("id", profile!.id);
    setBusy(false); await load();
  }

  async function redeem() {
    setErr(null); setMsg(null);
    setBusy(true);
    const { error } = await supabase.rpc("redeem_points", { p_points: points });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg(`Redeemed ${points} points → ${points / RATE} PTR. Minting to your wallet is queued.`);
    await load();
  }

  if (!profile) return <div className="text-upm-muted">Loading…</div>;

  const short = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);
  const STATUS_STYLE: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-300",
    minted: "bg-upm-light text-upm-gold border border-upm-gold/40",
    rejected: "bg-red-50 text-red-600 border border-red-300",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight">
        PutraToken <span className="text-upm-gold">wallet</span>
      </h1>
      <p className="mt-1 text-sm text-upm-muted">
        Convert your points into PTR — {RATE} points = 1 PTR, minted to your own wallet.
      </p>

      <div className="card mt-6 p-6">
        <h2 className="font-bold">1 · Link your wallet</h2>
        {profile.wallet_address ? (
          <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
            <span className="chip bg-upm-light text-upm-goldDark font-mono">{short(profile.wallet_address)}</span>
            <button onClick={unlink} disabled={busy}
              className="text-xs font-semibold text-upm-muted hover:text-red-600">Unlink</button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-upm-muted">
              Connect MetaMask — only your public address is stored; your keys stay with you.
            </p>
            <button onClick={connectWallet} disabled={busy} className="btn-primary mt-4">
              {busy ? "Connecting…" : "🦊 Connect MetaMask"}
            </button>
          </>
        )}
      </div>

      <div className="card mt-4 p-6">
        <h2 className="font-bold">2 · Redeem points</h2>
        <p className="mt-2 text-sm text-upm-muted">
          Balance: <span className="font-black text-upm-gold">{profile.points.toLocaleString()} points</span>
          {" "}(= {(profile.points / RATE).toFixed(2)} PTR max)
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <input type="number" min={RATE} step={RATE} value={points}
            onChange={(e) => setPoints(parseInt(e.target.value || "0", 10))}
            className="input w-40" />
          <span className="text-sm font-bold text-upm-muted">→ {points >= RATE ? points / RATE : 0} PTR</span>
          <button onClick={redeem}
            disabled={busy || !profile.wallet_address || points < RATE || points % RATE !== 0 || points > profile.points}
            className="btn-primary">
            {busy ? "Redeeming…" : "Redeem"}
          </button>
        </div>
        {!profile.wallet_address && (
          <p className="mt-3 text-xs text-upm-muted">Link a wallet first to enable redemption.</p>
        )}
      </div>

      {(msg || err) && (
        <p className={`mt-4 text-sm font-semibold ${err ? "text-red-600" : "text-upm-gold"}`}>{err ?? msg}</p>
      )}

      <h2 className="mt-8 text-lg font-black">Conversion history</h2>
      {conversions.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-upm-muted">No conversions yet.</div>
      ) : (
        <ul className="card mt-3 divide-y divide-upm-border/60 overflow-hidden">
          {conversions.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-2">
              <span className="text-sm font-semibold">
                −{c.points_spent.toLocaleString()} pts → <span className="text-upm-gold font-black">{Number(c.ptr_amount)} PTR</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-upm-muted/80">{new Date(c.created_at).toLocaleDateString()}</span>
                <span className={`chip capitalize ${STATUS_STYLE[c.status]}`}>{c.status}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-upm-muted leading-relaxed">
        Pending conversions are minted to your wallet by the platform&apos;s minting service
        (PutraToken ERC-20 on Polygon Amoy testnet — see <span className="font-mono">contracts/</span> in the
        repository). Every redemption is recorded on the audited points ledger.
      </p>
    </div>
  );
}
