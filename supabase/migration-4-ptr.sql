-- Migration 4: PTR wallet linking + point-to-token conversion
alter table profiles add column if not exists wallet_address text;

create table if not exists conversions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  points_spent   integer not null,
  ptr_amount     numeric not null,
  wallet_address text not null,
  status         text not null default 'pending' check (status in ('pending','minted','rejected')),
  tx_hash        text,
  created_at     timestamptz not null default now()
);
create index if not exists conversions_user_idx on conversions(user_id);

-- Redeem points for PTR (100 points = 1 PTR). Server-authoritative.
create or replace function redeem_points(p_points integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_bal    integer;
  v_wallet text;
  v_id     uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_points is null or p_points < 100 or p_points % 100 <> 0 then
    raise exception 'Redeem in multiples of 100 points (minimum 100).';
  end if;

  select points, wallet_address into v_bal, v_wallet
  from profiles where id = v_user for update;

  if v_wallet is null or v_wallet = '' then
    raise exception 'Link your wallet before redeeming.';
  end if;
  if v_bal < p_points then
    raise exception 'Insufficient points (balance: %).', v_bal;
  end if;

  update profiles set points = points - p_points where id = v_user;

  insert into point_transactions (user_id, amount, reason, ref_id)
  values (v_user, -p_points, 'ptr_conversion', null);

  insert into conversions (user_id, points_spent, ptr_amount, wallet_address)
  values (v_user, p_points, p_points / 100.0, v_wallet)
  returning id into v_id;

  return v_id;
end $$;

alter table conversions enable row level security;

drop policy if exists conversions_read_own on conversions;
create policy conversions_read_own on conversions for select using (
  user_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
