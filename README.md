# UPM Learn-to-Earn — Phase 1

A learn-to-earn platform for Universiti Putra Malaysia. Learners browse and
complete content (PDFs and markdown articles), pass short quizzes, and keep a
daily login streak — all of which award **off-chain points** tracked in
Supabase. Educators upload content and earn points when it's published.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase**.

## Phase 1 scope

- **Auth** — email/password via Supabase Auth, with `student` / `educator` /
  `admin` roles. Signup is restricted to UPM email domains (configurable).
- **Content** — upload PDFs (Supabase Storage) or write markdown articles;
  browse with search + category/type filters; view with an in-page reader.
- **Off-chain points** — awarded for: approved upload (50), completing content
  (10), passing a quiz (25), daily login (5). All balances are server-authored
  by SECURITY DEFINER Postgres functions and logged in an append-only ledger.
- **Dashboard & leaderboard** — points, streak, rank, recent activity, and a
  top-50 board.

Point values live in the `point_rules` table, so an admin can retune the
economy without touching code.

## Prerequisites

- Node.js 18.18+ (20+ recommended)
- A Supabase project (free tier is fine)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create the database schema**

   In the Supabase dashboard → SQL Editor, run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, RLS
   policies, points functions/triggers, and the `content-files` storage bucket.

3. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in from Supabase → Settings → API:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=upm.edu.my,student.upm.edu.my
   ```

   Leave `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` blank to allow any email (handy
   for local testing).

4. **(Optional) Email confirmation**

   For fast local testing, disable "Confirm email" in Supabase → Authentication
   → Providers → Email. Otherwise users must confirm before logging in.

5. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

6. **(Optional) Seed demo content**

   Sign up one account, then in Supabase SQL Editor promote it to educator:

   ```sql
   update profiles set role = 'admin' where id = (select id from auth.users limit 1);
   ```

   Then run [`supabase/seed.sql`](supabase/seed.sql) to add two sample articles
   with a quiz.

## How the points engine works

| Action | Reason code | Points | Awarded by |
|---|---|---|---|
| Upload published (status `approved`) | `content_upload_approved` | 50 | trigger `trg_content_approved` |
| Content marked complete (first time) | `content_completed` | 10 | trigger `trg_content_completed` |
| Quiz passed (first pass) | `quiz_passed` | 25 | RPC `submit_quiz()` |
| Daily login | `daily_login` | 5 | RPC `register_login()` |

Clients never write points directly. RLS blocks direct edits to `points`; every
change flows through a `SECURITY DEFINER` function that also writes a row to
`point_transactions` (the audit ledger). Quizzes are graded **server-side** in
`submit_quiz()` so the correct answer never reaches the browser.

In Phase 1, uploads are auto-`approved` on insert. To add a moderation step
later, change the `content` default status to `pending` and have an admin flip
it to `approved` — the same trigger will award the upload points at that point.

## Project structure

```
src/
  app/
    page.tsx                 Landing (redirects to /dashboard if signed in)
    login/ signup/           Auth pages
    dashboard/               Points, streak, rank, activity
    content/                 Browse + filters
    content/[id]/            Reader + mark-complete + quiz
    upload/                  Educator upload form (PDF or markdown + quiz)
    leaderboard/             Top 50
  components/
    Navbar, ContentActions, Markdown, LoginStreak
  lib/
    supabase-client.ts       Browser client
    supabase-server.ts       Server (RSC) client
    constants.ts             Domain allow-list, reason labels
    types.ts                 Shared TS types
  middleware.ts              Session refresh + route protection
supabase/
  schema.sql                 Tables, RLS, points engine, storage bucket
  seed.sql                   Optional demo content
```

## Roles

New users pick `student` or `educator` at signup. Only educators/admins can
upload. Promote or grant `admin` by updating the `profiles.role` column in
Supabase.

## Next phases (not in scope here)

Phase 2 would introduce the on-chain layer: mapping accumulated off-chain
points to a token/NFT reward, wallet linking, and a redemption flow. The ledger
in `point_transactions` is designed to make that migration auditable.
