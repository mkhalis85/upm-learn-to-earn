# Phase 3 — automated PTR minting service

`/api/mint` is a server-only route that mints PTR to every `pending` conversion
and marks it `minted` with the on-chain tx hash. It never runs in the browser and
the minter key is only ever read from Vercel environment variables.

## Environment variables (set in Vercel → Project → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` secret |
| `PTR_CONTRACT_ADDRESS` | Deployed PutraToken address (Amoy) |
| `PTR_RPC_URL` | `https://rpc-amoy.polygon.technology` |
| `MINTER_PRIVATE_KEY` | Private key holding `MINTER_ROLE` — **testnet key only** |
| `MINT_ADMIN_SECRET` | Any long random string (for manual triggering) |
| `CRON_SECRET` | Vercel injects this automatically for scheduled runs |

> Security: only ever put a **testnet** key here, and grant it `MINTER_ROLE`
> (the deployer already has it). Never place a key with real value in an env var.

## How it runs

- **Automatically** — `vercel.json` schedules an hourly cron that calls `GET /api/mint`.
  Vercel authenticates the cron with `CRON_SECRET`. (Hobby plan runs crons up to
  hourly; upgrade for finer schedules.)
- **On demand** — trigger a mint pass yourself:

  ```bash
  curl -X POST https://<your-app>.vercel.app/api/mint \
    -H "Authorization: Bearer $MINT_ADMIN_SECRET"
  ```

  Response: `{ "minted": N, "results": [ { "id": "...", "tx": "0x..." } ] }`.

## Flow

1. Learner redeems points -> a `pending` row lands in `conversions`.
2. The cron (or a manual POST) picks it up, calls `mint(wallet, amount)` on the
   PutraToken contract, waits for confirmation.
3. The row flips to `minted` with its `tx_hash`; the learner's Wallet page shows
   the green "minted" chip, and the PTR appears in their MetaMask.

If minting fails (e.g. RPC hiccup) the row stays `pending` and is retried next run.
