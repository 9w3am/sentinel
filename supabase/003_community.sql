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
