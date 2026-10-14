-- 게시판 (로그인 회원만 읽기·쓰기) — SQL Editor에서 실행

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_email text not null,
  title text not null,
  body text not null,
  constraint posts_title_length check (char_length(title) between 2 and 120),
  constraint posts_body_length check (char_length(body) between 2 and 5000)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts_select_authenticated" on public.posts;
drop policy if exists "posts_insert_authenticated" on public.posts;

create policy "posts_select_authenticated"
  on public.posts
  for select
  to authenticated
  using (true);

create policy "posts_insert_authenticated"
  on public.posts
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and lower(author_email) = lower(coalesce(auth.email(), ''))
  );
