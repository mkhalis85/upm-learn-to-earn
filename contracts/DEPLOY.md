# Deploying PutraToken (PTR) — Polygon Amoy testnet

Easiest path (no local toolchain): **Remix + MetaMask**.

1. Install MetaMask and add the Polygon Amoy testnet (chainlist.org → "Amoy").
2. Get free test POL from the official faucet: https://faucet.polygon.technology (select Amoy).
3. Open https://remix.ethereum.org → create `PutraToken.sol` → paste this contract.
4. Compile with Solidity 0.8.20+ (Remix auto-installs the OpenZeppelin imports).
5. Deploy tab → Environment: "Injected Provider — MetaMask" (make sure MetaMask is on Amoy).
6. Constructor `cap_`: e.g. `1000000000000000000000000` (1,000,000 PTR with 18 decimals).
7. Deploy, approve in MetaMask, and copy the contract address.

Minting redeemed conversions (prototype flow):
- The platform records each redemption in the `conversions` table (status `pending`)
  with the learner's wallet address and PTR amount.
- As the contract admin, call `mint(wallet, amount * 10^18)` in Remix for each pending
  conversion, then mark it `minted` (update the row's status and tx_hash in Supabase).
- Phase 3 automates this with a server-side minting service holding a MINTER_ROLE key.

The deployed address can be added to the app later (e.g. shown on the wallet page
with an Amoy block-explorer link: https://amoy.polygonscan.com/address/<contract>).
