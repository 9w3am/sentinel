-- ─────────────────────────────────────────────────────────────
-- 005 — 러닝 기능
-- 교신 기록(역극 스레드) · 상황실 무전 · 특별 훈련(추첨 · 짝 · 투표 · 제출) · 의뢰함
-- 휴직/전출 · MPC · 기록 태그 · 문의함 '조사 요청' 분류
-- schema.sql(또는 001~004)을 실행한 뒤 SQL Editor에서 한 번 실행한다. 여러 번 실행해도 안전하다.
-- ─────────────────────────────────────────────────────────────

create or replace function public.owns_approved(p_character uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.characters c where c.id = p_character and c.owner_id = auth.uid() and c.status = 'approved')
$$;
revoke execute on function public.owns_approved(uuid) from public, anon;
grant execute on function public.owns_approved(uuid) to authenticated, service_role;

-- ── 1. 교신 기록 ───────────────────────────────────────────────
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  starter_id uuid references public.characters (id) on delete set null,
  title text not null check (length(title) between 1 and 80),
  place text check (place is null or length(place) <= 80),
  summary text check (summary is null or length(summary) <= 300),
  members uuid[] not null default '{}',
  open_join boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists threads_last_idx on public.threads (last_at desc);
revoke all on public.threads from anon, authenticated;
grant select, insert, update, delete on public.threads to authenticated;
grant all on public.threads to service_role;
alter table public.threads enable row level security;
drop policy if exists threads_select on public.threads;
create policy threads_select on public.threads for select to authenticated using (public.is_member());
drop policy if exists threads_insert on public.threads;
create policy threads_insert on public.threads for insert to authenticated
  with check (created_by = auth.uid() and public.is_member() and (starter_id is null or public.owns_approved(starter_id)));
drop policy if exists threads_update on public.threads;
create policy threads_update on public.threads for update to authenticated
  using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
drop policy if exists threads_delete on public.threads;
create policy threads_delete on public.threads for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create table if not exists public.thread_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  kind text not null default 'line' check (kind in ('line', 'action', 'narration')),
  body text not null check (length(body) between 1 and 3000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists thread_posts_thread_idx on public.thread_posts (thread_id, created_at);
create index if not exists thread_posts_character_idx on public.thread_posts (character_id);
revoke all on public.thread_posts from anon, authenticated;
grant select, insert, update, delete on public.thread_posts to authenticated;
grant all on public.thread_posts to service_role;
alter table public.thread_posts enable row level security;
drop policy if exists thread_posts_select on public.thread_posts;
create policy thread_posts_select on public.thread_posts for select to authenticated
  using (public.is_member() and (not hidden or owner_id = auth.uid() or public.is_admin()));
drop policy if exists thread_posts_insert on public.thread_posts;
create policy thread_posts_insert on public.thread_posts for insert to authenticated
  with check (
    owner_id = auth.uid() and hidden = false and public.owns_approved(character_id)
    and exists (
      select 1 from public.threads t
      where t.id = thread_id and t.status = 'open'
        and (t.open_join or t.created_by = auth.uid() or character_id = any (t.members))
    )
  );
drop policy if exists thread_posts_update_admin on public.thread_posts;
create policy thread_posts_update_admin on public.thread_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists thread_posts_delete on public.thread_posts;
create policy thread_posts_delete on public.thread_posts for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- 새 글이 달리면 스레드의 마지막 시각과 참여자를 갱신한다 (작성자가 스레드 주인이 아니어도 되도록 definer)
create or replace function public.thread_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.threads
     set last_at = new.created_at,
         members = case when new.character_id = any (members) then members else array_append(members, new.character_id) end
   where id = new.thread_id;
  return new;
end $$;
drop trigger if exists thread_posts_touch on public.thread_posts;
create trigger thread_posts_touch after insert on public.thread_posts for each row execute function public.thread_touch();

-- ── 2. 상황실 무전 ─────────────────────────────────────────────
create table if not exists public.radio (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  channel text not null default 'main' check (length(channel) between 1 and 40),
  body text not null check (length(body) between 1 and 300),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists radio_channel_idx on public.radio (channel, created_at desc);
revoke all on public.radio from anon, authenticated;
grant select, insert, update, delete on public.radio to authenticated;
grant all on public.radio to service_role;
alter table public.radio enable row level security;
drop policy if exists radio_select on public.radio;
create policy radio_select on public.radio for select to authenticated
  using (public.is_member() and (not hidden or owner_id = auth.uid() or public.is_admin()));
drop policy if exists radio_insert on public.radio;
create policy radio_insert on public.radio for insert to authenticated
  with check (owner_id = auth.uid() and hidden = false and public.owns_approved(character_id));
drop policy if exists radio_update_admin on public.radio;
create policy radio_update_admin on public.radio for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists radio_delete on public.radio;
create policy radio_delete on public.radio for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- ── 3. 특별 훈련 ───────────────────────────────────────────────
create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lottery', 'pair', 'poll', 'submit')),
  title text not null check (length(title) between 1 and 120),
  body text not null default '' check (length(body) <= 4000),
  options text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'drawn', 'closed')),
  created_at timestamptz not null default now()
);
revoke all on public.play_events from anon, authenticated;
grant select, insert, update, delete on public.play_events to authenticated;
grant all on public.play_events to service_role;
alter table public.play_events enable row level security;
drop policy if exists play_events_select on public.play_events;
create policy play_events_select on public.play_events for select to authenticated using (public.is_member());
drop policy if exists play_events_admin on public.play_events;
create policy play_events_admin on public.play_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.play_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.play_events (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  text text not null default '' check (length(text) <= 500),
  created_at timestamptz not null default now(),
  unique (event_id, character_id)
);
revoke all on public.play_event_entries from anon, authenticated;
grant select, insert, update, delete on public.play_event_entries to authenticated;
grant all on public.play_event_entries to service_role;
alter table public.play_event_entries enable row level security;
drop policy if exists play_entries_select on public.play_event_entries;
create policy play_entries_select on public.play_event_entries for select to authenticated using (owner_id = auth.uid() or public.is_admin());
drop policy if exists play_entries_insert on public.play_event_entries;
create policy play_entries_insert on public.play_event_entries for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_approved(character_id)
              and exists (select 1 from public.play_events e where e.id = event_id and e.status = 'open'));
drop policy if exists play_entries_update on public.play_event_entries;
create policy play_entries_update on public.play_event_entries for update to authenticated
  using (owner_id = auth.uid() and exists (select 1 from public.play_events e where e.id = event_id and e.status = 'open'))
  with check (owner_id = auth.uid() and exists (select 1 from public.play_events e where e.id = event_id and e.status = 'open'));
drop policy if exists play_entries_delete on public.play_event_entries;
create policy play_entries_delete on public.play_event_entries for delete to authenticated
  using ((owner_id = auth.uid() and exists (select 1 from public.play_events e where e.id = event_id and e.status = 'open')) or public.is_admin());

create table if not exists public.play_event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.play_events (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  partner_id uuid references public.characters (id) on delete set null,
  text text,
  created_at timestamptz not null default now()
);
revoke all on public.play_event_results from anon, authenticated;
grant select, insert, update, delete on public.play_event_results to authenticated;
grant all on public.play_event_results to service_role;
alter table public.play_event_results enable row level security;
drop policy if exists play_results_select on public.play_event_results;
create policy play_results_select on public.play_event_results for select to authenticated
  using (public.is_member() and exists (select 1 from public.play_events e where e.id = event_id and e.status in ('drawn', 'closed')));
drop policy if exists play_results_admin on public.play_event_results;
create policy play_results_admin on public.play_event_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 참가 수 (제출 내용은 돌려주지 않는다)
create or replace function public.list_event_stats()
returns table (out_event uuid, out_count bigint)
language sql stable security definer set search_path = public as $$
  select e.event_id, count(*) from public.play_event_entries e where public.is_member() group by e.event_id
$$;
revoke execute on function public.list_event_stats() from public, anon;
grant execute on function public.list_event_stats() to authenticated, service_role;

-- 투표 집계
create or replace function public.list_event_counts(p_event uuid)
returns table (out_text text, out_count bigint)
language sql stable security definer set search_path = public as $$
  select x.text, count(*) from public.play_event_entries x
  join public.play_events e on e.id = x.event_id
  where x.event_id = p_event and e.kind = 'poll' and public.is_member()
  group by x.text
$$;
revoke execute on function public.list_event_counts(uuid) from public, anon;
grant execute on function public.list_event_counts(uuid) to authenticated, service_role;

-- 제출형은 마감 뒤 모두 공개
create or replace function public.list_event_submissions(p_event uuid)
returns table (out_character uuid, out_text text)
language sql stable security definer set search_path = public as $$
  select x.character_id, x.text from public.play_event_entries x
  join public.play_events e on e.id = x.event_id
  where x.event_id = p_event and e.kind = 'submit' and e.status = 'closed' and public.is_member()
  order by x.created_at
$$;
revoke execute on function public.list_event_submissions(uuid) from public, anon;
grant execute on function public.list_event_submissions(uuid) to authenticated, service_role;

-- ── 4. 의뢰함 ──────────────────────────────────────────────────
-- choices = [{"label": "...", "outcome": "..."}]. 결과 문구는 화면에서 고른 뒤에만 보여 준다.
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  body text not null default '' check (length(body) <= 4000),
  area text check (area is null or length(area) <= 60),
  slots integer not null default 1 check (slots in (1, 2)),
  choices jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
revoke all on public.missions from anon, authenticated;
grant select, insert, update, delete on public.missions to authenticated;
grant all on public.missions to service_role;
alter table public.missions enable row level security;
drop policy if exists missions_select on public.missions;
create policy missions_select on public.missions for select to authenticated using (public.is_member());
drop policy if exists missions_admin on public.missions;
create policy missions_admin on public.missions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.mission_runs (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  partner_id uuid references public.characters (id) on delete set null,
  choice integer not null check (choice >= 0),
  note text check (note is null or length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (mission_id, character_id)
);
revoke all on public.mission_runs from anon, authenticated;
grant select, insert, delete on public.mission_runs to authenticated;
grant all on public.mission_runs to service_role;
alter table public.mission_runs enable row level security;
drop policy if exists mission_runs_select on public.mission_runs;
create policy mission_runs_select on public.mission_runs for select to authenticated using (public.is_member());
drop policy if exists mission_runs_insert on public.mission_runs;
create policy mission_runs_insert on public.mission_runs for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_approved(character_id) and (partner_id is null or partner_id <> character_id)
              and exists (select 1 from public.missions m where m.id = mission_id and m.status = 'open'));
drop policy if exists mission_runs_delete on public.mission_runs;
create policy mission_runs_delete on public.mission_runs for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- ── 5. 휴직 · 전출 / MPC ───────────────────────────────────────
create table if not exists public.character_duty (
  character_id uuid primary key references public.characters (id) on delete cascade,
  duty text not null default 'active' check (duty in ('active', 'leave', 'transfer')),
  note text check (note is null or length(note) <= 200),
  gauge integer check (gauge is null or gauge between 0 and 100), -- 센티넬 폭주 수치 · 가이드 가이딩 여력
  updated_at timestamptz not null default now()
);
alter table public.character_duty add column if not exists gauge integer check (gauge is null or gauge between 0 and 100);
revoke all on public.character_duty from anon, authenticated;
grant select on public.character_duty to anon;
grant select, insert, update, delete on public.character_duty to authenticated;
grant all on public.character_duty to service_role;
alter table public.character_duty enable row level security;
drop policy if exists duty_select on public.character_duty;
create policy duty_select on public.character_duty for select to anon, authenticated using (true);
drop policy if exists duty_write on public.character_duty;
create policy duty_write on public.character_duty for all to authenticated
  using (public.is_admin() or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()));

create table if not exists public.mpc_characters (
  character_id uuid primary key references public.characters (id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on public.mpc_characters from anon, authenticated;
grant select on public.mpc_characters to anon;
grant select, insert, delete on public.mpc_characters to authenticated;
grant all on public.mpc_characters to service_role;
alter table public.mpc_characters enable row level security;
drop policy if exists mpc_select on public.mpc_characters;
create policy mpc_select on public.mpc_characters for select to anon, authenticated using (true);
drop policy if exists mpc_admin on public.mpc_characters;
create policy mpc_admin on public.mpc_characters for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── 6. 활동 기록 태그 ──────────────────────────────────────────
create table if not exists public.post_tags (
  post_id uuid primary key references public.posts (id) on delete cascade,
  character_ids uuid[] not null default '{}'
);
revoke all on public.post_tags from anon, authenticated;
grant select, insert, update, delete on public.post_tags to authenticated;
grant all on public.post_tags to service_role;
alter table public.post_tags enable row level security;
drop policy if exists post_tags_select on public.post_tags;
create policy post_tags_select on public.post_tags for select to authenticated using (public.is_member());
drop policy if exists post_tags_write on public.post_tags;
create policy post_tags_write on public.post_tags for all to authenticated
  using (public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- ── 7. 문의함에 '조사 요청' 분류 추가 ──────────────────────────
alter table public.inbox drop constraint if exists inbox_category_check;
alter table public.inbox add constraint inbox_category_check
  check (category in ('question', 'suggestion', 'report', 'break', 'investigate', 'etc'));

-- ── 8. 활동 요약 (개인 관측창 · 표창) ──────────────────────────
-- 숫자만 돌려준다. 공개 등록증은 누구나, 비공개는 요원만 볼 수 있다.
create or replace function public.character_activity(p_character uuid)
returns table (out_thread_posts bigint, out_threads bigint, out_radio bigint, out_missions bigint, out_events bigint, out_gates bigint, out_clues bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.thread_posts where character_id = p_character and not hidden),
    (select count(*) from public.threads where starter_id = p_character),
    (select count(*) from public.radio where character_id = p_character and not hidden),
    (select count(*) from public.mission_runs where character_id = p_character or partner_id = p_character),
    (select count(*) from public.play_event_entries where character_id = p_character),
    (select count(*) from public.incident_entries where character_id = p_character),
    (select count(*) from public.case_findings where character_id = p_character and clue_id is not null)
  where exists (
    select 1 from public.characters c
    where c.id = p_character and c.status = 'approved' and (c.is_public or public.is_member())
  )
$$;
revoke execute on function public.character_activity(uuid) from public;
grant execute on function public.character_activity(uuid) to anon, authenticated, service_role;

-- ── 9. 프로필 문서(details.profile_doc)만 고치면 다시 심사하지 않는다 ──
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
    if (new.name, new.codename, new.kind, new.grade, new.affiliation, new.avatar_url, coalesce(new.details, '{}'::jsonb) - 'profile_doc')
       is distinct from
       (old.name, old.codename, old.kind, old.grade, old.affiliation, old.avatar_url, coalesce(old.details, '{}'::jsonb) - 'profile_doc') then
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
