-- ============================================================================
-- Migration 2: standalone quizzes + questionnaires with point rewards
-- ============================================================================

alter type content_type add value if not exists 'quiz';
alter type content_type add value if not exists 'questionnaire';

insert into point_rules (reason, points, description) values
  ('questionnaire_completed', 15, 'Learner submitted a questionnaire')
on conflict (reason) do nothing;

create table if not exists survey_questions (
  id         uuid primary key default gen_random_uuid(),
  content_id uuid not null references content(id) on delete cascade,
  question   text not null,
  kind       text not null default 'text' check (kind in ('text','choice')),
  options    jsonb,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists survey_q_content_idx on survey_questions(content_id);

create table if not exists survey_responses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  content_id uuid not null references content(id) on delete cascade,
  answers    jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, content_id)
);
create index if not exists survey_r_content_idx on survey_responses(content_id);

create or replace function submit_survey(p_content uuid, p_answers jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from survey_questions where content_id = p_content) then
    raise exception 'Questionnaire not found';
  end if;

  insert into survey_responses (user_id, content_id, answers)
  values (v_user, p_content, p_answers)
  on conflict (user_id, content_id) do nothing
  returning id into v_id;

  if v_id is not null then
    perform award_points(v_user, 'questionnaire_completed', p_content);
    return true;
  end if;
  return false;
end $$;

alter table survey_questions enable row level security;
alter table survey_responses enable row level security;

drop policy if exists survey_q_read on survey_questions;
create policy survey_q_read on survey_questions for select using (true);

drop policy if exists survey_q_insert on survey_questions;
create policy survey_q_insert on survey_questions for insert with check (
  exists (select 1 from content c where c.id = content_id and c.author_id = auth.uid())
);

drop policy if exists survey_r_read on survey_responses;
create policy survey_r_read on survey_responses for select using (
  user_id = auth.uid()
  or exists (select 1 from content c where c.id = content_id and c.author_id = auth.uid())
);
