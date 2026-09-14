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
