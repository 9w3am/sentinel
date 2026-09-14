-- ════════════════════════════════════════════════════════════════
-- 002 — 협회 규정 문서 · 게이트 참여 신청 · 게시글↔게이트 연결
-- 이미 schema.sql 을 실행한 DB 에 한 번 더 실행한다. 여러 번 실행해도 안전.
-- ════════════════════════════════════════════════════════════════

-- ── 고정 문서 (협회 규정 등)
create table if not exists public.site_pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);
revoke all on public.site_pages from anon, authenticated;
grant select on public.site_pages to anon;
grant select, insert, update, delete on public.site_pages to authenticated;
grant all on public.site_pages to service_role;
alter table public.site_pages enable row level security;
drop policy if exists site_pages_select on public.site_pages;
create policy site_pages_select on public.site_pages for select to anon, authenticated using (true);
drop policy if exists site_pages_admin on public.site_pages;
create policy site_pages_admin on public.site_pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.site_pages (slug, title, body)
values ('rules', '센티넬 협회 운영 규정', E'제1조 (목적)\n이 규정은 센티넬 협회 누리집 이용과 요원 활동에 필요한 사항을 정한다.\n\n제2조 (편입)\n편입 인가 번호는 관리부가 한 사람에게 하나씩 발급한다. 번호는 다른 사람에게 넘길 수 없다.\n\n제3조 (등록증)\n요원은 등록증을 신청하고 관리부 심사를 거쳐 요원 명부에 오른다.\n\n제4조 (게시판)\n협회 게시판의 기안은 등록증 명의 또는 개인 명의로 작성한다. 다른 요원을 비방하거나 분쟁을 부추기는 기안은 삭제한다.\n\n제5조 (결속)\n결속은 상대 관리인이 수락해야 성립한다. 거절된 신청을 반복하지 않는다.\n\n제6조 (게이트)\n관리부가 공지한 게이트에는 종결 전까지 참여 신청을 할 수 있다.\n\n제7조 (자격 정지)\n규정을 거듭 어기면 관리부가 자격을 정지할 수 있다.\n\n부칙\n이 규정은 누리집 개설일부터 시행한다.')
on conflict (slug) do nothing;

-- ── 게이트 참여 신청
create table if not exists public.incident_entries (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  note text,
  created_at timestamptz not null default now(),
  unique (incident_id, character_id)
);
revoke all on public.incident_entries from anon, authenticated;
grant select on public.incident_entries to anon;
grant select, insert, delete on public.incident_entries to authenticated;
grant all on public.incident_entries to service_role;
alter table public.incident_entries enable row level security;
drop policy if exists entries_select on public.incident_entries;
create policy entries_select on public.incident_entries for select to anon, authenticated using (true);
drop policy if exists entries_insert on public.incident_entries;
create policy entries_insert on public.incident_entries for insert to authenticated
  with check (
    owner_id = auth.uid() and public.is_member()
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid() and c.status = 'approved')
    and exists (select 1 from public.incidents i where i.id = incident_id and i.status <> 'closed')
  );
drop policy if exists entries_delete on public.incident_entries;
create policy entries_delete on public.incident_entries for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ── 임무 보고서를 게이트에 연결
alter table public.posts add column if not exists incident_id uuid references public.incidents (id) on delete set null;
create index if not exists posts_incident_idx on public.posts (incident_id);

notify pgrst, 'reload schema';
