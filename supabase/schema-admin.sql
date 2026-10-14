-- 관리자 문의 조회 — schema-admin-roles.sql 사용을 권장합니다.
-- 역할 테이블 없이 쓰려면 아래 정책만 실행 (단일 이메일).

drop policy if exists "inquiries_admin_select" on public.inquiries;

create policy "inquiries_admin_select"
  on public.inquiries
  for select
  to authenticated
  using (lower(auth.email()) = lower('hello261014@lumen.kr'));
