-- 게시판 댓글 (SQL Editor에서 schema-board.sql 이후 실행)

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  post_id bigint not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_email text not null,
  body text not null,
  constraint post_comments_body_length check (char_length(body) between 1 and 2000)
);

create index if not exists post_comments_post_id_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "post_comments_select_authenticated" on public.post_comments;
drop policy if exists "post_comments_insert_authenticated" on public.post_comments;
drop policy if exists "post_comments_delete_admin_or_author" on public.post_comments;

create policy "post_comments_select_authenticated"
  on public.post_comments
  for select
  to authenticated
  using (true);

create policy "post_comments_insert_authenticated"
  on public.post_comments
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and lower(author_email) = lower(coalesce(auth.email(), ''))
  );

create policy "post_comments_delete_admin_or_author"
  on public.post_comments
  for delete
  to authenticated
  using (
    author_id = auth.uid()
    or lower(coalesce(auth.email(), '')) = lower('hello261014@lumen.kr')
  );
