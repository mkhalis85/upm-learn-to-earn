-- ============================================================================
-- UPM Learn-to-Earn — Phase 1 schema, RLS, and off-chain points engine
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================================

-- ---------- Enums ----------------------------------------------------------
do $$ begin
  create type user_role   as enum ('student', 'educator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_type   as enum ('pdf', 'article');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Point values (single source of truth) --------------------------
-- Kept as a table so an admin can tune the economy without code changes.
create table if not exists point_rules (
  reason      text primary key,
  points      integer not null,
  description text
);

insert into point_rules (reason, points, description) values
  ('content_upload_approved', 50, 'Educator/contributor upload approved'),
  ('content_completed',       10, 'Learner marked content complete'),
  ('quiz_passed',             25, 'Learner passed the attached quiz'),
  ('daily_login',              5, 'Daily login streak reward')
on conflict (reason) do nothing;

-- ---------- profiles -------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  role         user_role   not null default 'student',
  points       integer     not null default 0,
  streak       integer     not null default 0,
  last_login   date,
  created_at   timestamptz not null default now()
);

-- ---------- content --------------------------------------------------------
create table if not exists content (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  type        content_type not null,
  category    text,
  file_path   text,          -- Storage path for pdf uploads
  body        text,          -- markdown body for articles
  author_id   uuid        not null references profiles(id) on delete cascade,
  status      content_status not null default 'approved', -- Phase 1: auto-approve
  created_at  timestamptz not null default now()
);
create index if not exists content_status_idx   on content(status);
create index if not exists content_author_idx   on content(author_id);
create index if not exists content_category_idx on content(category);

-- ---------- completions (one per user per content) -------------------------
create table if not exists content_completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  content_id   uuid not null references content(id)  on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, content_id)
);

-- ---------- quizzes (one optional quiz question per content) ---------------
create table if not exists quizzes (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references content(id) on delete cascade,
  question      text not null,
  options       jsonb not null,          -- ["A","B","C","D"]
  correct_index integer not null,
  created_at    timestamptz not null default now()
);
create index if not exists quizzes_content_idx on quizzes(content_id);

-- ---------- quiz attempts --------------------------------------------------
create table if not exists quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  quiz_id    uuid not null references quizzes(id) on delete cascade,
  content_id uuid not null references content(id) on delete cascade,
  passed     boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on quiz_attempts(user_id);

-- ---------- point ledger (append-only audit trail) -------------------------
create table if not exists point_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  amount     integer not null,
  reason     text not null,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index if not exists point_tx_user_idx on point_transactions(user_id);

-- ============================================================================
-- Points engine — SECURITY DEFINER functions keep balances server-authored.
-- ============================================================================

-- Core award helper: logs a transaction and increments the cached balance.
create or replace function award_points(p_user uuid, p_reason text, p_ref uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_points integer;
begin
  select points into v_points from point_rules where reason = p_reason;
  if v_points is null then v_points := 0; end if;
  if v_points = 0 then return; end if;

  insert into point_transactions (user_id, amount, reason, ref_id)
  values (p_user, v_points, p_reason, p_ref);

  update profiles set points = points + v_points where id = p_user;
end $$;

-- New auth user -> profile row (role from signup metadata, default student).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Award on approved upload (fires on insert-approved or pending->approved).
create or replace function on_content_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    perform award_points(new.author_id, 'content_upload_approved', new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_content_approved on content;
create trigger trg_content_approved
  after insert or update on content
  for each row execute function on_content_approved();

-- Award on first completion of a piece of content.
create or replace function on_content_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform award_points(new.user_id, 'content_completed', new.content_id);
  return new;
end $$;

drop trigger if exists trg_content_completed on content_completions;
create trigger trg_content_completed
  after insert on content_completions
  for each row execute function on_content_completed();

-- Grade a quiz server-side, record the attempt, award once on first pass.
create or replace function submit_quiz(p_quiz uuid, p_choice integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct  integer;
  v_content  uuid;
  v_user     uuid := auth.uid();
  v_passed   boolean;
  v_already  boolean;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select correct_index, content_id into v_correct, v_content
  from quizzes where id = p_quiz;
  if v_correct is null then raise exception 'Quiz not found'; end if;

  v_passed := (p_choice = v_correct);

  insert into quiz_attempts (user_id, quiz_id, content_id, passed)
  values (v_user, p_quiz, v_content, v_passed);

  if v_passed then
    select exists(
      select 1 from quiz_attempts
      where user_id = v_user and quiz_id = p_quiz and passed = true
      and id <> (select id from quiz_attempts
                 where user_id = v_user and quiz_id = p_quiz
                 order by created_at desc limit 1)
    ) into v_already;
    if not v_already then
      perform award_points(v_user, 'quiz_passed', v_content);
    end if;
  end if;

  return v_passed;
end $$;

-- Daily login streak — call once per session load. Awards at most once/day.
create or replace function register_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last date;
begin
  if v_user is null then return; end if;
  select last_login into v_last from profiles where id = v_user;

  if v_last = current_date then
    return; -- already counted today
  end if;

  if v_last = current_date - 1 then
    update profiles set streak = streak + 1, last_login = current_date where id = v_user;
  else
    update profiles set streak = 1, last_login = current_date where id = v_user;
  end if;

  perform award_points(v_user, 'daily_login', null);
end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles            enable row level security;
alter table content             enable row level security;
alter table content_completions enable row level security;
alter table quizzes             enable row level security;
alter table quiz_attempts       enable row level security;
alter table point_transactions  enable row level security;
alter table point_rules         enable row level security;

-- profiles: everyone can read (leaderboard); users update only their own,
-- and cannot change points/role/streak directly (guarded below).
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (true);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- content: approved is public; authors see their own; educators/admins insert.
drop policy if exists content_read on content;
create policy content_read on content for select
  using (
    status = 'approved'
    or author_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('educator','admin'))
  );

drop policy if exists content_insert on content;
create policy content_insert on content for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('educator','admin'))
  );

drop policy if exists content_update_own on content;
create policy content_update_own on content for update
  using (author_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- completions: users manage their own rows.
drop policy if exists completions_read on content_completions;
create policy completions_read on content_completions for select using (user_id = auth.uid());

drop policy if exists completions_insert on content_completions;
create policy completions_insert on content_completions for insert with check (user_id = auth.uid());

-- quizzes: readable by all; content authors/admin manage.
drop policy if exists quizzes_read on quizzes;
create policy quizzes_read on quizzes for select using (true);

drop policy if exists quizzes_insert on quizzes;
create policy quizzes_insert on quizzes for insert with check (
  exists (select 1 from content c where c.id = content_id and c.author_id = auth.uid())
);

-- quiz attempts: users read their own (writes go through submit_quiz()).
drop policy if exists attempts_read on quiz_attempts;
create policy attempts_read on quiz_attempts for select using (user_id = auth.uid());

-- point ledger: users read their own.
drop policy if exists tx_read on point_transactions;
create policy tx_read on point_transactions for select using (user_id = auth.uid());

-- point rules: readable by all.
drop policy if exists rules_read on point_rules;
create policy rules_read on point_rules for select using (true);

-- ============================================================================
-- Storage bucket for PDF uploads
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('content-files', 'content-files', true)
on conflict (id) do nothing;

drop policy if exists "content files public read" on storage.objects;
create policy "content files public read" on storage.objects for select
  using (bucket_id = 'content-files');

drop policy if exists "content files auth upload" on storage.objects;
create policy "content files auth upload" on storage.objects for insert
  with check (bucket_id = 'content-files' and auth.role() = 'authenticated');
