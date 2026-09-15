-- ════════════════════════════════════════════════════════════════
-- 센티넬 협회 누리집 — Supabase 스키마 (1회 실행)
-- Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 다시 실행해도 안전하도록 가능한 한 IF NOT EXISTS / OR REPLACE 로 작성함
-- ════════════════════════════════════════════════════════════════

-- ── 0. 권한 enum ─────────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

-- ── 1. 계정 / 권한 ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key,                       -- auth.users.id 와 같은 값
  display_name text not null default '요원',
  created_at timestamptz not null default now()
);
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- RLS 재귀 방지용 security definer 함수
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid())
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_member() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_member() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_member());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_member());

-- ── 2. 편입 인가 번호(초대 코드) ─────────────────────────────────
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  note text,
  grant_admin boolean not null default false,
  used_by uuid,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
revoke all on public.invites from anon, authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant all on public.invites to service_role;
alter table public.invites enable row level security;
drop policy if exists invites_admin_all on public.invites;
create policy invites_admin_all on public.invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 가입 전에 번호만 확인 (번호 목록은 노출되지 않음)
create or replace function public.check_invite(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invites where code = upper(trim(p_code)) and used_by is null)
$$;
revoke execute on function public.check_invite(text) from public;
grant execute on function public.check_invite(text) to anon, authenticated;

-- 가입(auth.users INSERT) 시점에 초대 코드를 검증·소진한다.
-- 코드가 없거나 이미 쓰였으면 예외 → 계정 생성 자체가 롤백된다 (공개 가입 차단).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_invite public.invites%rowtype;
begin
  select * into v_invite from public.invites where code = v_code and used_by is null for update;
  if not found then
    raise exception 'INVALID_INVITE' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, display_name) values (new.id, coalesce(v_name, '요원'))
    on conflict (id) do update set display_name = excluded.display_name;
  insert into public.user_roles (user_id, role)
    values (new.id, case when v_invite.grant_admin then 'admin'::public.app_role else 'member'::public.app_role end)
    on conflict do nothing;
  update public.invites set used_by = new.id, used_at = now() where id = v_invite.id;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관리부: 권한 변경 ('admin' | 'member' | 'none')
create or replace function public.set_member_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'CANNOT_DEMOTE_SELF'; end if;
  delete from public.user_roles where user_id = p_user;
  if p_role in ('admin', 'member') then
    insert into public.user_roles (user_id, role) values (p_user, p_role::public.app_role);
  end if;
end $$;
revoke execute on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- ── 3. 각성자 등록증 ─────────────────────────────────────────────
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  codename text,
  kind text not null default 'sentinel' check (kind in ('sentinel', 'guide', 'normal', 'undetermined')),
  grade text not null default 'C',
  affiliation text,
  avatar_url text,
  details jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  locked boolean not null default false,       -- 관리부 강제 비공개
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists characters_owner_idx on public.characters (owner_id);
revoke all on public.characters from anon, authenticated;
grant select on public.characters to anon;
grant select, insert, update, delete on public.characters to authenticated;
grant all on public.characters to service_role;
alter table public.characters enable row level security;

drop policy if exists characters_select_anon on public.characters;
create policy characters_select_anon on public.characters for select to anon
  using (is_public and not locked and status = 'approved');
drop policy if exists characters_select_auth on public.characters;
create policy characters_select_auth on public.characters for select to authenticated
  using ((is_public and not locked and status = 'approved') or owner_id = auth.uid() or public.is_admin());
drop policy if exists characters_insert_own on public.characters;
create policy characters_insert_own on public.characters for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member());
drop policy if exists characters_update_own on public.characters;
create policy characters_update_own on public.characters for update to authenticated
  using ((owner_id = auth.uid() and public.is_member()) or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists characters_delete_own on public.characters;
create policy characters_delete_own on public.characters for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- 본인이 심사 상태를 스스로 '승인'으로 바꾸지 못하게 한다.
-- 내용이 바뀌면 재심사(pending), 공개 여부만 바꾸면 상태 유지.
create or replace function public.characters_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.status := 'pending';
    new.review_note := null;
    new.locked := false;
  else
    new.owner_id := old.owner_id;
    new.locked := old.locked;
    if (new.name, new.codename, new.kind, new.grade, new.affiliation, new.avatar_url, new.details)
       is distinct from
       (old.name, old.codename, old.kind, old.grade, old.affiliation, old.avatar_url, old.details) then
      new.status := 'pending';
      new.review_note := null;
    else
      new.status := old.status;
      new.review_note := old.review_note;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists characters_guard on public.characters;
create trigger characters_guard before insert or update on public.characters
  for each row execute function public.characters_guard();

-- 비밀 설정: 본인·관리부만 열람
create table if not exists public.character_secrets (
  character_id uuid primary key references public.characters (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);
revoke all on public.character_secrets from anon, authenticated;
grant select, insert, update, delete on public.character_secrets to authenticated;
grant all on public.character_secrets to service_role;
alter table public.character_secrets enable row level security;
drop policy if exists secrets_owner_all on public.character_secrets;
create policy secrets_owner_all on public.character_secrets for all to authenticated
  using (public.is_admin() or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()));

-- ── 4. 결속(관계) ────────────────────────────────────────────────
create table if not exists public.relations (
  id uuid primary key default gen_random_uuid(),
  from_character_id uuid not null references public.characters (id) on delete cascade,
  to_character_id uuid not null references public.characters (id) on delete cascade,
  kind text not null default '각인',
  description text,
  status text not null default 'requested' check (status in ('requested', 'accepted')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (from_character_id, to_character_id),
  check (from_character_id <> to_character_id)
);
revoke all on public.relations from anon, authenticated;
grant select on public.relations to anon;
grant select, insert, delete on public.relations to authenticated;
grant all on public.relations to service_role;
alter table public.relations enable row level security;

drop policy if exists relations_select_anon on public.relations;
create policy relations_select_anon on public.relations for select to anon
  using (status = 'accepted');
drop policy if exists relations_select_auth on public.relations;
create policy relations_select_auth on public.relations for select to authenticated
  using (
    status = 'accepted' or public.is_admin()
    or exists (select 1 from public.characters c where c.owner_id = auth.uid()
               and c.id in (from_character_id, to_character_id))
  );
drop policy if exists relations_insert_own on public.relations;
create policy relations_insert_own on public.relations for insert to authenticated
  with check (
    created_by = auth.uid() and public.is_member()
    and exists (select 1 from public.characters c where c.id = from_character_id and c.owner_id = auth.uid())
  );
drop policy if exists relations_delete on public.relations;
create policy relations_delete on public.relations for delete to authenticated
  using (
    created_by = auth.uid() or public.is_admin()
    or exists (select 1 from public.characters c where c.id = to_character_id and c.owner_id = auth.uid())
  );

-- 신청 시 상태는 항상 'requested'. 상대도 내 등록증이면 바로 성립.
create or replace function public.relations_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  if exists (select 1 from public.characters c where c.id = new.to_character_id and c.owner_id = auth.uid()) then
    new.status := 'accepted';
  else
    new.status := 'requested';
  end if;
  return new;
end $$;
drop trigger if exists relations_guard on public.relations;
create trigger relations_guard before insert on public.relations
  for each row execute function public.relations_guard();

-- 상대 등록증 소유자의 수락 / 반려
create or replace function public.respond_relation(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_to uuid;
begin
  select r.to_character_id into v_to from public.relations r where r.id = p_id;
  if v_to is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_admin() or exists (select 1 from public.characters c where c.id = v_to and c.owner_id = auth.uid())) then
    raise exception 'FORBIDDEN';
  end if;
  if p_accept then
    update public.relations set status = 'accepted' where id = p_id;
  else
    delete from public.relations where id = p_id;
  end if;
end $$;
revoke execute on function public.respond_relation(uuid, boolean) from public, anon;
grant execute on function public.respond_relation(uuid, boolean) to authenticated;

-- ── 5. 게시판 / 댓글 ─────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid(),
  character_id uuid references public.characters (id) on delete set null,
  category text not null default 'general' check (category in ('general', 'report', 'request')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
revoke all on public.posts from anon, authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (public.is_member());
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_member()
    and (character_id is null or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())));
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid(),
  character_id uuid references public.characters (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id);
revoke all on public.comments from anon, authenticated;
grant select, insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (public.is_member());
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_member()
    and (character_id is null or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())));
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ── 6. 고시 / 균열 현황 / 경보 단계 ──────────────────────────────
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  doc_no integer generated always as identity,
  title text not null,
  body text not null,
  level text not null default 'normal' check (level in ('normal', 'warning', 'critical')),
  pinned boolean not null default false,
  author_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
revoke all on public.notices from anon, authenticated;
grant select on public.notices to anon;
grant select, insert, update, delete on public.notices to authenticated;
grant all on public.notices to service_role;
alter table public.notices enable row level security;
drop policy if exists notices_select on public.notices;
create policy notices_select on public.notices for select to anon, authenticated using (true);
drop policy if exists notices_admin on public.notices;
create policy notices_admin on public.notices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  location text not null default '',
  grade text not null default 'C',
  status text not null default 'open' check (status in ('open', 'responding', 'closed')),
  body text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
revoke all on public.incidents from anon, authenticated;
grant select on public.incidents to anon;
grant select, insert, update, delete on public.incidents to authenticated;
grant all on public.incidents to service_role;
alter table public.incidents enable row level security;
drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to anon, authenticated using (true);
drop policy if exists incidents_admin on public.incidents;
create policy incidents_admin on public.incidents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  alert_level integer not null default 2 check (alert_level between 1 and 5),
  alert_message text,
  updated_at timestamptz not null default now()
);
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
drop policy if exists settings_select on public.site_settings;
create policy settings_select on public.site_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin on public.site_settings;
create policy settings_admin on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── 7. 증명사진 저장소 ───────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 8. 초기 데이터 ───────────────────────────────────────────────
insert into public.site_settings (id, alert_level, alert_message)
values (1, 2, 'B급 이상 요원은 대기 상태를 유지하십시오. 활성 게이트 반경 500m 안쪽은 비각성자 출입이 통제됩니다.')
on conflict (id) do nothing;

-- 최초 운영자용 편입 인가 번호는 무작위로 만든다. 실행 후 아래 쿼리로 번호를 확인할 것:
--   select code from public.invites where grant_admin and used_by is null;
insert into public.invites (code, note, grant_admin)
select 'SNTL-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4)), '최초 운영자 계정 발급용', true
where not exists (select 1 from public.invites where grant_admin);

insert into public.notices (title, body, level, pinned)
select * from (values
  ('경보 2단계 발령 및 출입 통제 안내',
   E'경보 2단계(주의)를 발령합니다.\n\n1. B급 이상 요원은 소속 지부에서 대기합니다.\n2. 활성 게이트 반경 500m 안쪽은 비각성자 출입을 통제합니다.\n3. 해제 시각은 상황실 판단에 따라 따로 알립니다.',
   'warning', true),
  ('하반기 정기 등급 재측정 일정',
   E'등록 요원 전원을 대상으로 하반기 정기 등급 재측정을 실시합니다.\n\n일정은 소속별로 따로 안내합니다.',
   'normal', false),
  ('신규 가이드 등록 접수 (상시)',
   E'가이드 발현이 확인된 분은 편입 절차를 거쳐 등록증을 신청하십시오.',
   'normal', false)
) as v(title, body, level, pinned)
where not exists (select 1 from public.notices);

insert into public.incidents (code, title, location, grade, status, body, occurred_at)
select * from (values
  ('G-0917', 'A급 게이트 개방', '구역 07', 'A', 'responding', '대응 1조 투입. 반경 500m 통제.', now() - interval '2 hours'),
  ('G-0916', 'C급 게이트 반응', '구역 12', 'C', 'open', '출입 통제 중.', now() - interval '5 hours'),
  ('G-0915', 'D급 감응 관측', '구역 03', 'D', 'open', '개방 여부 확인 중.', now() - interval '9 hours'),
  ('G-0914', 'B급 게이트 봉쇄', '구역 21', 'B', 'closed', '봉쇄 완료.', now() - interval '26 hours')
) as v(code, title, location, grade, status, body, occurred_at)
where not exists (select 1 from public.incidents);

-- API 스키마 캐시 새로고침
notify pgrst, 'reload schema';


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


-- ════════════════════════════════════════════════════════════════
-- 003 — 기수 · 팀 · 편입 신청서 · 대나무숲 · 운영진 문의함 · 선택형 결속 조율 · 조사
-- schema.sql 과 002 를 실행한 DB 에 한 번 더 실행한다. 여러 번 실행해도 안전.
-- ════════════════════════════════════════════════════════════════

-- ── 1. 기수 ─────────────────────────────────────────────────────
create table if not exists public.cohorts (
  no integer primary key check (no > 0),
  title text not null,
  status text not null default 'ready' check (status in ('ready', 'recruiting', 'running', 'closed')),
  note text,
  created_at timestamptz not null default now()
);
revoke all on public.cohorts from anon, authenticated;
grant select on public.cohorts to anon;
grant select, insert, update, delete on public.cohorts to authenticated;
grant all on public.cohorts to service_role;
alter table public.cohorts enable row level security;
drop policy if exists cohorts_select on public.cohorts;
create policy cohorts_select on public.cohorts for select to anon, authenticated using (true);
drop policy if exists cohorts_admin on public.cohorts;
create policy cohorts_admin on public.cohorts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.cohorts (no, title, status) values (1, '제1기 편입', 'ready')
on conflict (no) do nothing;

-- ── 2. 팀 ───────────────────────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  callsign text,
  color text not null default '#f0c419',
  motto text,
  description text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
revoke all on public.teams from anon, authenticated;
grant select on public.teams to anon;
grant select, insert, update, delete on public.teams to authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to anon, authenticated using (true);
drop policy if exists teams_admin on public.teams;
create policy teams_admin on public.teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.characters add column if not exists team_id uuid references public.teams (id) on delete set null;
alter table public.characters add column if not exists team_role text;
alter table public.characters add column if not exists cohort_no integer references public.cohorts (no) on delete set null;
create index if not exists characters_team_idx on public.characters (team_id);

-- 팀·역할·기수는 관리부만 바꾼다. 새 등록증은 지금 모집(또는 활동) 중인 기수로 들어간다.
create or replace function public.characters_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.status := 'pending';
    new.review_note := null;
    new.locked := false;
    new.team_id := null;
    new.team_role := null;
    new.cohort_no := (
      select c.no from public.cohorts c
      order by case c.status when 'recruiting' then 0 when 'running' then 1 when 'ready' then 2 else 3 end, c.no desc
      limit 1
    );
  else
    new.owner_id := old.owner_id;
    new.locked := old.locked;
    new.team_id := old.team_id;
    new.team_role := old.team_role;
    new.cohort_no := old.cohort_no;
    if (new.name, new.codename, new.kind, new.grade, new.affiliation, new.avatar_url, new.details)
       is distinct from
       (old.name, old.codename, old.kind, old.grade, old.affiliation, old.avatar_url, old.details) then
      new.status := 'pending';
      new.review_note := null;
    else
      new.status := old.status;
      new.review_note := old.review_note;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ── 3. 편입 신청서 (계정 없이 제출, 접수번호 + 확인 코드로 결과 조회) ──
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  receipt text not null unique,
  pin_hash text not null,
  cohort_no integer references public.cohorts (no) on delete set null,
  owner_nick text not null,
  contact text,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected')),
  result_note text,
  invite_id uuid references public.invites (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
revoke all on public.applications from anon, authenticated;
grant select, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
drop policy if exists applications_admin on public.applications;
create policy applications_admin on public.applications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_application(p_nick text, p_contact text, p_answers jsonb)
returns table (out_receipt text, out_pin text)
language plpgsql security definer set search_path = public as $$
declare
  v_cohort integer;
  v_receipt text;
  v_pin text;
begin
  select c.no into v_cohort from public.cohorts c where c.status = 'recruiting' order by c.no desc limit 1;
  if v_cohort is null then raise exception 'NOT_RECRUITING'; end if;
  if coalesce(trim(p_nick), '') = '' or length(p_nick) > 40 or length(coalesce(p_contact, '')) > 120
     or octet_length(coalesce(p_answers, '{}'::jsonb)::text) > 30000 then
    raise exception 'INVALID_FORM';
  end if;
  loop
    v_receipt := v_cohort::text || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.applications a where a.receipt = v_receipt);
  end loop;
  v_pin := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into public.applications (receipt, pin_hash, cohort_no, owner_nick, contact, answers)
  values (v_receipt, md5(v_receipt || ':' || v_pin), v_cohort, trim(p_nick), nullif(trim(coalesce(p_contact, '')), ''), coalesce(p_answers, '{}'::jsonb));
  return query select v_receipt, v_pin;
end $$;
revoke execute on function public.submit_application(text, text, jsonb) from public;
grant execute on function public.submit_application(text, text, jsonb) to anon, authenticated;

create or replace function public.check_application(p_receipt text, p_pin text)
returns table (out_status text, out_note text, out_invite text, out_cohort integer, out_created timestamptz)
language sql stable security definer set search_path = public as $$
  select a.status, a.result_note,
         case when a.status = 'accepted' then (select i.code from public.invites i where i.id = a.invite_id and i.used_by is null) end,
         a.cohort_no, a.created_at
  from public.applications a
  where a.receipt = upper(trim(p_receipt))
    and a.pin_hash = md5(upper(trim(p_receipt)) || ':' || upper(trim(p_pin)))
$$;
revoke execute on function public.check_application(text, text) from public;
grant execute on function public.check_application(text, text) to anon, authenticated;

-- ── 4. 대나무숲 (캐입 익명 게시판) ───────────────────────────────
-- 다른 요원은 아래 RPC 로만 읽는다. RPC 는 작성자 정보를 돌려주지 않는다.
create table if not exists public.anon_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  reveal text not null default 'none' check (reveal in ('none', 'dept', 'team')),
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 20000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists anon_posts_created_idx on public.anon_posts (created_at desc);
revoke all on public.anon_posts from anon, authenticated;
grant select, insert, update, delete on public.anon_posts to authenticated;
grant all on public.anon_posts to service_role;
alter table public.anon_posts enable row level security;
drop policy if exists anon_posts_select on public.anon_posts;
create policy anon_posts_select on public.anon_posts for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
drop policy if exists anon_posts_insert on public.anon_posts;
create policy anon_posts_insert on public.anon_posts for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member() and not hidden
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid() and c.status = 'approved'));
drop policy if exists anon_posts_update on public.anon_posts;
create policy anon_posts_update on public.anon_posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists anon_posts_delete on public.anon_posts;
create policy anon_posts_delete on public.anon_posts for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create table if not exists public.anon_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.anon_posts (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists anon_comments_post_idx on public.anon_comments (post_id);
revoke all on public.anon_comments from anon, authenticated;
grant select, insert, update, delete on public.anon_comments to authenticated;
grant all on public.anon_comments to service_role;
alter table public.anon_comments enable row level security;
drop policy if exists anon_comments_select on public.anon_comments;
create policy anon_comments_select on public.anon_comments for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
drop policy if exists anon_comments_insert on public.anon_comments;
create policy anon_comments_insert on public.anon_comments for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member() and not hidden
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid() and c.status = 'approved')
    and exists (select 1 from public.anon_posts p where p.id = post_id and not p.hidden));
drop policy if exists anon_comments_update on public.anon_comments;
create policy anon_comments_update on public.anon_comments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists anon_comments_delete on public.anon_comments;
create policy anon_comments_delete on public.anon_comments for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create or replace function public.list_anon_posts()
returns table (out_id uuid, out_title text, out_preview text, out_dept text, out_created timestamptz, out_comments integer, out_mine boolean, out_hidden boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.title, left(p.body, 140),
         case p.reveal when 'dept' then ch.affiliation when 'team' then t.name end,
         p.created_at,
         (select count(*)::int from public.anon_comments c where c.post_id = p.id and not c.hidden),
         p.owner_id = auth.uid(),
         p.hidden
  from public.anon_posts p
  join public.characters ch on ch.id = p.character_id
  left join public.teams t on t.id = ch.team_id
  where public.is_member() and (not p.hidden or public.is_admin() or p.owner_id = auth.uid())
  order by p.created_at desc
  limit 300
$$;

create or replace function public.get_anon_post(p_id uuid)
returns table (out_id uuid, out_title text, out_body text, out_dept text, out_created timestamptz, out_mine boolean, out_hidden boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.title, p.body,
         case p.reveal when 'dept' then ch.affiliation when 'team' then t.name end,
         p.created_at, p.owner_id = auth.uid(), p.hidden
  from public.anon_posts p
  join public.characters ch on ch.id = p.character_id
  left join public.teams t on t.id = ch.team_id
  where p.id = p_id and public.is_member() and (not p.hidden or public.is_admin() or p.owner_id = auth.uid())
$$;

-- 댓글 표시 이름: 글쓴이 등록증이면 '글쓴이', 나머지는 처음 댓글 단 순서대로 '익명1', '익명2' …
create or replace function public.list_anon_comments(p_post uuid)
returns table (out_id uuid, out_alias text, out_body text, out_created timestamptz, out_mine boolean, out_hidden boolean)
language sql stable security definer set search_path = public as $$
  with post as (
    select p.character_id from public.anon_posts p
    where p.id = p_post and public.is_member() and (not p.hidden or public.is_admin() or p.owner_id = auth.uid())
  ),
  firsts as (
    select c.character_id, min(c.created_at) as first_at
    from public.anon_comments c
    where c.post_id = p_post and c.character_id <> (select character_id from post)
    group by c.character_id
  ),
  ranked as (
    select f.character_id, row_number() over (order by f.first_at) as n from firsts f
  )
  select c.id,
         case when c.character_id = (select character_id from post) then '글쓴이' else '익명' || r.n end,
         case when c.hidden and not public.is_admin() then '' else c.body end,
         c.created_at, c.owner_id = auth.uid(), c.hidden
  from public.anon_comments c
  left join ranked r on r.character_id = c.character_id
  where c.post_id = p_post and exists (select 1 from post)
  order by c.created_at
$$;

revoke execute on function public.list_anon_posts() from public, anon;
revoke execute on function public.get_anon_post(uuid) from public, anon;
revoke execute on function public.list_anon_comments(uuid) from public, anon;
grant execute on function public.list_anon_posts() to authenticated;
grant execute on function public.get_anon_post(uuid) to authenticated;
grant execute on function public.list_anon_comments(uuid) to authenticated;

-- ── 5. 운영진 문의함 ─────────────────────────────────────────────
-- 보낸 사람은 자기 글만 본다. 운영진은 RPC 로만 읽으며, 익명 글에는 이름이 넘어가지 않는다.
create table if not exists public.inbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  anonymous boolean not null default true,
  category text not null default 'question' check (category in ('question', 'suggestion', 'report', 'break', 'etc')),
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 8000),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
revoke all on public.inbox from anon, authenticated;
grant select, insert, delete on public.inbox to authenticated;
grant all on public.inbox to service_role;
alter table public.inbox enable row level security;
drop policy if exists inbox_select_own on public.inbox;
create policy inbox_select_own on public.inbox for select to authenticated using (owner_id = auth.uid());
drop policy if exists inbox_insert_own on public.inbox;
create policy inbox_insert_own on public.inbox for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member() and reply is null and replied_at is null);
drop policy if exists inbox_delete_own on public.inbox;
create policy inbox_delete_own on public.inbox for delete to authenticated using (owner_id = auth.uid());

create or replace function public.list_inbox_admin()
returns table (out_id uuid, out_category text, out_title text, out_body text, out_anonymous boolean, out_sender text, out_reply text, out_replied timestamptz, out_created timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.category, i.title, i.body, i.anonymous,
         case when i.anonymous then null else coalesce(pr.display_name, '요원') end,
         i.reply, i.replied_at, i.created_at
  from public.inbox i
  left join public.profiles pr on pr.id = i.owner_id
  where public.is_admin()
  order by (i.reply is null) desc, i.created_at desc
$$;

create or replace function public.reply_inbox(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.inbox
     set reply = nullif(trim(coalesce(p_reply, '')), ''),
         replied_at = case when nullif(trim(coalesce(p_reply, '')), '') is null then null else now() end
   where id = p_id;
end $$;

create or replace function public.delete_inbox_admin(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.inbox where id = p_id;
end $$;

revoke execute on function public.list_inbox_admin() from public, anon;
revoke execute on function public.reply_inbox(uuid, text) from public, anon;
revoke execute on function public.delete_inbox_admin(uuid) from public, anon;
grant execute on function public.list_inbox_admin() to authenticated;
grant execute on function public.reply_inbox(uuid, text) to authenticated;
grant execute on function public.delete_inbox_admin(uuid) to authenticated;

-- ── 6. 선택형 결속 조율 ──────────────────────────────────────────
-- options = { "allow": ["mission", ...], "temp": "light" | "normal" | "deep" }
alter table public.relations add column if not exists options jsonb not null default '{}'::jsonb;

-- 수락할 때 받는 쪽이 고른 항목만 남긴다 (신청한 항목과의 교집합)
create or replace function public.respond_relation_opts(p_id uuid, p_accept boolean, p_allow text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_to uuid;
  v_opts jsonb;
begin
  select r.to_character_id, r.options into v_to, v_opts from public.relations r where r.id = p_id;
  if v_to is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_admin() or exists (select 1 from public.characters c where c.id = v_to and c.owner_id = auth.uid())) then
    raise exception 'FORBIDDEN';
  end if;
  if p_accept then
    update public.relations
       set status = 'accepted',
           options = jsonb_set(
             coalesce(v_opts, '{}'::jsonb), '{allow}',
             coalesce((
               select jsonb_agg(x)
               from jsonb_array_elements_text(coalesce(v_opts -> 'allow', '[]'::jsonb)) as x
               where x = any (coalesce(p_allow, '{}'::text[]))
             ), '[]'::jsonb))
     where id = p_id;
  else
    delete from public.relations where id = p_id;
  end if;
end $$;
revoke execute on function public.respond_relation_opts(uuid, boolean, text[]) from public, anon;
grant execute on function public.respond_relation_opts(uuid, boolean, text[]) to authenticated;

-- ── 7. 조사 ─────────────────────────────────────────────────────
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  briefing text not null default '',
  incident_id uuid references public.incidents (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  question text,
  choices jsonb not null default '[]'::jsonb,
  answer integer,
  conclusion text,
  created_at timestamptz not null default now()
);
revoke all on public.cases from anon, authenticated;
grant select, insert, update, delete on public.cases to authenticated;
grant all on public.cases to service_role;
alter table public.cases enable row level security;
drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases for select to authenticated using (public.is_member());
drop policy if exists cases_admin on public.cases;
create policy cases_admin on public.cases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.case_targets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  name text not null,
  detail text,
  sort integer not null default 0
);
revoke all on public.case_targets from anon, authenticated;
grant select, insert, update, delete on public.case_targets to authenticated;
grant all on public.case_targets to service_role;
alter table public.case_targets enable row level security;
drop policy if exists case_targets_select on public.case_targets;
create policy case_targets_select on public.case_targets for select to authenticated using (public.is_member());
drop policy if exists case_targets_admin on public.case_targets;
create policy case_targets_admin on public.case_targets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 단서 원문은 관리부만 직접 읽는다. 요원은 조사해서 찾은 것만 RPC 로 본다.
create table if not exists public.case_clues (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  target_id uuid not null references public.case_targets (id) on delete cascade,
  approach text not null check (approach in ('sense', 'psyche', 'records', 'interview', 'search')),
  body text not null,
  unique (target_id, approach)
);
revoke all on public.case_clues from anon, authenticated;
grant select, insert, update, delete on public.case_clues to authenticated;
grant all on public.case_clues to service_role;
alter table public.case_clues enable row level security;
drop policy if exists case_clues_admin on public.case_clues;
create policy case_clues_admin on public.case_clues for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.case_findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  target_id uuid not null references public.case_targets (id) on delete cascade,
  approach text not null,
  clue_id uuid references public.case_clues (id) on delete set null,
  character_id uuid not null references public.characters (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (target_id, approach, character_id)
);
revoke all on public.case_findings from anon, authenticated;
grant select, delete on public.case_findings to authenticated;
grant all on public.case_findings to service_role;
alter table public.case_findings enable row level security;
drop policy if exists case_findings_select on public.case_findings;
create policy case_findings_select on public.case_findings for select to authenticated using (public.is_member());
drop policy if exists case_findings_admin on public.case_findings;
create policy case_findings_admin on public.case_findings for delete to authenticated using (public.is_admin());

create table if not exists public.case_answers (
  case_id uuid not null references public.cases (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  choice integer not null check (choice >= 0),
  created_at timestamptz not null default now(),
  primary key (case_id, character_id)
);
revoke all on public.case_answers from anon, authenticated;
grant select, insert, update, delete on public.case_answers to authenticated;
grant all on public.case_answers to service_role;
alter table public.case_answers enable row level security;
drop policy if exists case_answers_select on public.case_answers;
create policy case_answers_select on public.case_answers for select to authenticated using (public.is_member());
drop policy if exists case_answers_insert on public.case_answers;
create policy case_answers_insert on public.case_answers for insert to authenticated
  with check (owner_id = auth.uid() and public.is_member()
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid() and c.status = 'approved')
    and exists (select 1 from public.cases s where s.id = case_id and s.status = 'open'));
drop policy if exists case_answers_update on public.case_answers;
create policy case_answers_update on public.case_answers for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.cases s where s.id = case_id and s.status = 'open'));
drop policy if exists case_answers_delete on public.case_answers;
create policy case_answers_delete on public.case_answers for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- 조사 실행: 주사위 없음. 대상 × 방법에 단서가 있으면 찾고, 없으면 '흔적 없음'.
create or replace function public.investigate(p_case uuid, p_target uuid, p_approach text, p_character uuid)
returns table (out_found boolean, out_body text)
language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
  v_status text;
  v_clue_id uuid;
  v_clue_body text;
begin
  if not public.is_member() then raise exception 'FORBIDDEN'; end if;
  select ch.kind into v_kind from public.characters ch
   where ch.id = p_character and ch.owner_id = auth.uid() and ch.status = 'approved';
  if v_kind is null then raise exception 'FORBIDDEN'; end if;
  select s.status into v_status from public.cases s where s.id = p_case;
  if v_status is null then raise exception 'NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'CASE_CLOSED'; end if;
  if not exists (select 1 from public.case_targets t where t.id = p_target and t.case_id = p_case) then
    raise exception 'NOT_FOUND';
  end if;
  if p_approach not in ('sense', 'psyche', 'records', 'interview', 'search') then raise exception 'INVALID_FORM'; end if;
  if (p_approach = 'sense' and v_kind <> 'sentinel') or (p_approach = 'psyche' and v_kind <> 'guide') then
    raise exception 'APPROACH_KIND';
  end if;
  if exists (select 1 from public.case_findings f where f.target_id = p_target and f.approach = p_approach and f.character_id = p_character) then
    raise exception 'ALREADY_INVESTIGATED';
  end if;
  select c.id, c.body into v_clue_id, v_clue_body from public.case_clues c where c.target_id = p_target and c.approach = p_approach;
  insert into public.case_findings (case_id, target_id, approach, clue_id, character_id, owner_id)
  values (p_case, p_target, p_approach, v_clue_id, p_character, auth.uid());
  return query select v_clue_id is not null, v_clue_body;
end $$;

create or replace function public.list_case_findings(p_case uuid)
returns table (out_id uuid, out_target uuid, out_target_name text, out_approach text, out_found boolean, out_clue text,
               out_character uuid, out_character_name text, out_character_kind text, out_team text, out_created timestamptz, out_mine boolean)
language sql stable security definer set search_path = public as $$
  select f.id, f.target_id, t.name, f.approach, f.clue_id is not null, cl.body,
         f.character_id,
         case when (ch.is_public and not ch.locked) or ch.owner_id = auth.uid() or public.is_admin() then ch.name else '비공개 요원' end,
         ch.kind, tm.name, f.created_at, f.owner_id = auth.uid()
  from public.case_findings f
  join public.case_targets t on t.id = f.target_id
  left join public.case_clues cl on cl.id = f.clue_id
  join public.characters ch on ch.id = f.character_id
  left join public.teams tm on tm.id = ch.team_id
  where f.case_id = p_case and public.is_member()
  order by f.created_at desc
$$;

revoke execute on function public.investigate(uuid, uuid, text, uuid) from public, anon;
revoke execute on function public.list_case_findings(uuid) from public, anon;
grant execute on function public.investigate(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.list_case_findings(uuid) to authenticated;

notify pgrst, 'reload schema';
