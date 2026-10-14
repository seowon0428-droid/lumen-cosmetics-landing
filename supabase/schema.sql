-- LUMEN 문의 폼 → Supabase (SQL Editor에서 실행)

create table if not exists public.inquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  privacy_agreed boolean not null default false,
  status text not null default 'new',
  admin_reply text,
  replied_at timestamptz,
  replied_by text,
  constraint inquiries_status_check check (status in ('new', 'replied'))
);

alter table public.inquiries enable row level security;

-- 익명(랜딩 페이지) INSERT만 허용. 조회는 Supabase 대시보드·service role로.
create policy "inquiries_anon_insert"
  on public.inquiries
  for insert
  to anon
  with check (
    privacy_agreed is true
    and char_length(name) between 2 and 50
    and char_length(message) between 10 and 2000
    and char_length(email) <= 255
    and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  );
