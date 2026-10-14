-- 관리자 역할 (admin1 전체 / admin2 접수문의 / admin3 게시판)
-- SQL Editor에서 실행. Auth에 사용자 생성 후 하단 INSERT를 이메일에 맞게 실행하세요.

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('super', 'inquiries', 'board')),
  created_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

drop policy if exists "admin_roles_select_own" on public.admin_roles;

create policy "admin_roles_select_own"
  on public.admin_roles
  for select
  to authenticated
  using (user_id = auth.uid());

-- 문의: super + inquiries
drop policy if exists "inquiries_admin_select" on public.inquiries;

create policy "inquiries_admin_select"
  on public.inquiries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('super', 'inquiries')
    )
  );

-- 댓글 삭제: 작성자 + super + board
drop policy if exists "post_comments_delete_admin_or_author" on public.post_comments;

create policy "post_comments_delete_admin_or_author"
  on public.post_comments
  for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('super', 'board')
    )
  );

-- 역할 부여 (Authentication에서 사용자 만든 뒤 실행, 이메일 수정 가능)
insert into public.admin_roles (user_id, role)
select id, 'super'
from auth.users
where lower(email) = lower('admin1@lumen.kr')
on conflict (user_id) do update set role = excluded.role;

insert into public.admin_roles (user_id, role)
select id, 'inquiries'
from auth.users
where lower(email) = lower('admin2@lumen.kr')
on conflict (user_id) do update set role = excluded.role;

insert into public.admin_roles (user_id, role)
select id, 'board'
from auth.users
where lower(email) = lower('admin3@lumen.kr')
on conflict (user_id) do update set role = excluded.role;

-- 기존 관리자(hello261014@...)를 admin1과 동일하게 쓰려면 아래 한 줄 실행
-- insert into public.admin_roles (user_id, role)
-- select id, 'super' from auth.users where lower(email) = lower('hello261014@lumen.kr')
-- on conflict (user_id) do update set role = excluded.role;
