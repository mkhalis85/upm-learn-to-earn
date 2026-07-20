-- Migration 3: authors may read quiz attempts on their own content (for results view)
drop policy if exists attempts_read_author on quiz_attempts;
create policy attempts_read_author on quiz_attempts for select using (
  exists (select 1 from content c where c.id = content_id and c.author_id = auth.uid())
);
