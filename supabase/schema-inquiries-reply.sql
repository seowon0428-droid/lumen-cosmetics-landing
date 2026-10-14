-- 문의 상태·관리자 답변 (SQL Editor에서 실행)

alter table public.inquiries
  add column if not exists status text not null default 'new',
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by text;

alter table public.inquiries drop constraint if exists inquiries_status_check;

alter table public.inquiries
  add constraint inquiries_status_check check (status in ('new', 'replied'));

update public.inquiries
set status = 'new'
where status is null or status = '';

drop policy if exists "inquiries_admin_update" on public.inquiries;

create policy "inquiries_admin_update"
  on public.inquiries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('super', 'inquiries')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('super', 'inquiries')
    )
  );
