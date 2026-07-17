-- Optional demo content. Run AFTER at least one educator/admin exists.
-- It attaches sample content to the first educator/admin profile it finds.
do $$
declare v_author uuid;
declare v_content uuid;
begin
  select id into v_author from profiles
    where role in ('educator','admin') order by created_at limit 1;
  if v_author is null then
    raise notice 'No educator/admin profile found — sign up one first, then re-run seed.sql';
    return;
  end if;

  insert into content (title, description, type, category, body, author_id, status)
  values (
    'Newton''s Laws of Motion — A Refresher',
    'Concise walkthrough of the three laws with worked intuition.',
    'article', 'Physics',
    E'# Newton''s Laws\n\n**First law:** an object stays at rest or in uniform motion unless acted on by a net force.\n\n**Second law:** F = ma.\n\n**Third law:** every action has an equal and opposite reaction.\n\nTry the quiz below to earn points!',
    v_author, 'approved')
  returning id into v_content;

  insert into quizzes (content_id, question, options, correct_index)
  values (v_content,
    'Which law is expressed as F = ma?',
    '["First law","Second law","Third law","Zeroth law"]'::jsonb, 1);

  insert into content (title, description, type, category, body, author_id, status)
  values (
    'Intro to Stellar Nucleosynthesis',
    'How stars forge the elements — a short primer.',
    'article', 'Astronomy',
    E'# Stellar Nucleosynthesis\n\nStars fuse hydrogen into helium, then heavier elements up to iron. Elements heavier than iron form in supernovae and neutron-star mergers.',
    v_author, 'approved');

  raise notice 'Seed complete for author %', v_author;
end $$;
