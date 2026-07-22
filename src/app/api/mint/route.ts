import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Minimal ABI — only the mint function is needed.
const PTR_ABI = ["function mint(address to, uint256 amount) external"];

interface ConversionRow {
  id: string;
  wallet_address: string;
  ptr_amount: number | string;
  status: string;
}

async function runMint() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const contractAddr = process.env.PTR_CONTRACT_ADDRESS;
  const rpcUrl = process.env.PTR_RPC_URL;
  const minterKey = process.env.MINTER_PRIVATE_KEY;

  if (!url || !serviceKey) {
    return { status: 500, body: { error: "Supabase env not set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)" } };
  }
  if (!contractAddr || !rpcUrl || !minterKey) {
    return { status: 500, body: { error: "Chain env not set (PTR_CONTRACT_ADDRESS, PTR_RPC_URL, MINTER_PRIVATE_KEY)" } };
  }

  // Service-role client bypasses RLS for this trusted server job.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("conversions")
    .select("id, wallet_address, ptr_amount, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) return { status: 500, body: { error: error.message } };

  const pending = (data as ConversionRow[]) ?? [];
  if (pending.length === 0) return { status: 200, body: { minted: 0, message: "No pending conversions" } };

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(minterKey, provider);
  const contract = new ethers.Contract(contractAddr, PTR_ABI, wallet);

  const results: Array<Record<string, unknown>> = [];
  for (const c of pending) {
    try {
      const amount = ethers.parseUnits(String(c.ptr_amount), 18);
      const tx = await contract.mint(c.wallet_address, amount);
      await tx.wait();
      await supabase.from("conversions").update({ status: "minted", tx_hash: tx.hash }).eq("id", c.id);
      results.push({ id: c.id, status: "minted", tx: tx.hash });
    } catch (e) {
      results.push({ id: c.id, status: "error", error: e instanceof Error ? e.message : "mint failed" });
    }
  }
  return { status: 200, body: { minted: results.filter((r) => r.status === "minted").length, results } };
}

function bearer(req: Request): string {
  return (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
}

// Manual/admin trigger: POST with Authorization: Bearer <MINT_ADMIN_SECRET>
export async function POST(req: Request) {
  const secret = process.env.MINT_ADMIN_SECRET;
  if (!secret || bearer(req) !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await runMint();
  return NextResponse.json(r.body, { status: r.status });
}

// Vercel Cron trigger: GET with Authorization: Bearer <CRON_SECRET> (set automatically by Vercel)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || bearer(req) !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await runMint();
  return NextResponse.json(r.body, { status: r.status });
}
