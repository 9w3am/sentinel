// 실사이트용 러닝 기능. supabase/005_play.sql 이 실행돼 있어야 한다. 실행 전이면 목록은 빈 값으로 보인다.
import type { SupabaseClient } from '@supabase/supabase-js'
import { drawResults, type Activity, type Duty, type EventEntry, type EventResult, type Mission, type MissionRun, type PlayApi, type PlayEvent, type RadioMsg, type Thread, type ThreadPost } from './playTypes'
import type { Api, CharacterBrief } from './types'

const BRIEF = 'id,name,codename,kind,grade,avatar_url'

export function createSupabasePlay(sb: SupabaseClient, api: Api): PlayApi {
  const missing = (e: unknown) => {
    const code = (e as { code?: string } | null)?.code
    return code === 'PGRST205' || code === 'PGRST204' || code === 'PGRST202' || code === '42P01' || code === '42703' || code === '42883'
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function must<T = any>(r: { data?: unknown; error: unknown }): T {
    if (r.error) {
      if (missing(r.error)) throw new Error('PLAY_NOT_READY')
      throw r.error
    }
    return r.data as T
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function orEmpty<T = any>(r: { data?: unknown; error: unknown }, empty: T): T {
    if (r.error) {
      if (missing(r.error)) return empty
      throw r.error
    }
    return (r.data ?? empty) as T
  }
  const uidNow = async () => (await sb.auth.getSession()).data.session?.user.id ?? null
  const requireUid = async () => {
    const id = await uidNow()
    if (!id) throw new Error('로그인이 필요합니다.')
    return id
  }
  async function briefs(ids: (string | null | undefined)[]) {
    const uniq = [...new Set(ids.filter(Boolean))] as string[]
    const map = new Map<string, CharacterBrief>()
    if (!uniq.length) return map
    const { data } = await sb.from('characters').select(BRIEF).in('id', uniq)
    for (const c of (data ?? []) as CharacterBrief[]) map.set(c.id, c)
    return map
  }
  const count = (v: unknown) => (Array.isArray(v) ? Number((v[0] as { count?: number })?.count ?? 0) : 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function threadsOut(rows: any[]): Promise<Thread[]> {
    const me = await uidNow()
    const m = await briefs(rows.flatMap((t) => t.members ?? []))
    const last = new Map<string, string>()
    if (rows.length) {
      const recent = orEmpty<{ thread_id: string; character_id: string }[]>(await sb.from('thread_posts').select('thread_id,character_id').in('thread_id', rows.map((t) => t.id)).eq('hidden', false).order('created_at', { ascending: false }).limit(2000), [])
      for (const p of recent) if (!last.has(p.thread_id)) last.set(p.thread_id, p.character_id)
    }
    return rows.map(({ thread_posts, ...t }) => ({
      ...t,
      members: t.members ?? [],
      post_count: count(thread_posts),
      last_character_id: last.get(t.id) ?? null,
      is_mine: t.created_by === me,
      memberBriefs: (t.members ?? []).map((id: string) => m.get(id)).filter(Boolean),
    }))
  }

  return {
    // ── 교신 기록
    async listThreads() {
      return threadsOut(orEmpty(await sb.from('threads').select('*,thread_posts(count)').order('last_at', { ascending: false }).limit(200), []))
    },
    async getThread(id) {
      const r = orEmpty(await sb.from('threads').select('*,thread_posts(count)').eq('id', id).maybeSingle(), null)
      return r ? (await threadsOut([r]))[0] : null
    },
    async listThreadsOf(characterId) {
      return threadsOut(orEmpty(await sb.from('threads').select('*,thread_posts(count)').contains('members', [characterId]).order('last_at', { ascending: false }).limit(50), []))
    },
    async createThread(t) {
      const me = await requireUid()
      if (!t.title.trim()) throw new Error('INVALID_FORM')
      const members = [...new Set([t.starter_id, ...t.members])]
      const row = must<{ id: string }>(
        await sb
          .from('threads')
          .insert({ created_by: me, starter_id: t.starter_id, title: t.title.trim().slice(0, 80), place: t.place.trim() || null, summary: t.summary.trim().slice(0, 300) || null, open_join: t.open_join, members })
          .select('id')
          .single(),
      )
      if (t.first.body.trim()) must(await sb.from('thread_posts').insert({ thread_id: row.id, owner_id: me, character_id: t.starter_id, kind: t.first.kind, body: t.first.body.trim().slice(0, 3000) }))
      return row.id
    },
    async updateThread(id, patch) {
      must(await sb.from('threads').update(patch).eq('id', id))
    },
    async deleteThread(id) {
      must(await sb.from('threads').delete().eq('id', id))
    },
    async listThreadPosts(threadId): Promise<ThreadPost[]> {
      const me = await uidNow()
      const rows = orEmpty<{ owner_id: string; character_id: string }[]>(await sb.from('thread_posts').select('*').eq('thread_id', threadId).order('created_at').limit(2000), [])
      const m = await briefs(rows.map((r) => r.character_id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rows.map(({ owner_id, ...r }: any) => ({ ...r, is_mine: owner_id === me, character: m.get(r.character_id) ?? null }))
    },
    async addThreadPost(threadId, p) {
      const me = await requireUid()
      const t = orEmpty<{ status: string; open_join: boolean; created_by: string; members: string[] } | null>(await sb.from('threads').select('status,open_join,created_by,members').eq('id', threadId).maybeSingle(), null)
      if (!t) throw new Error('NOT_FOUND')
      if (t.status !== 'open') throw new Error('THREAD_CLOSED')
      if (!(t.open_join || t.created_by === me || t.members.includes(p.character_id))) throw new Error('THREAD_MEMBERS_ONLY')
      if (!p.body.trim()) throw new Error('INVALID_FORM')
      must(await sb.from('thread_posts').insert({ thread_id: threadId, owner_id: me, character_id: p.character_id, kind: p.kind, body: p.body.trim().slice(0, 3000) }))
    },
    async deleteThreadPost(id) {
      must(await sb.from('thread_posts').delete().eq('id', id))
    },
    async setThreadPostHidden(id, hidden) {
      must(await sb.from('thread_posts').update({ hidden }).eq('id', id))
    },

    // ── 상황실 무전
    async listRadio(channel): Promise<RadioMsg[]> {
      const me = await uidNow()
      const rows = orEmpty<{ owner_id: string; character_id: string }[]>(await sb.from('radio').select('*').eq('channel', channel).order('created_at', { ascending: false }).limit(150), []).reverse()
      const ids = [...new Set(rows.map((r) => r.character_id))]
      const [chars, teams] = await Promise.all([ids.length ? sb.from('characters').select(`${BRIEF},team_id`).in('id', ids) : Promise.resolve({ data: [] }), api.listTeams()])
      const m = new Map<string, CharacterBrief & { team_id?: string | null }>()
      for (const c of (chars.data ?? []) as (CharacterBrief & { team_id?: string | null })[]) m.set(c.id, c)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rows.map(({ owner_id, ...r }: any) => {
        const c = m.get(r.character_id)
        return { ...r, is_mine: owner_id === me, character: c ? { id: c.id, name: c.name, codename: c.codename, kind: c.kind, grade: c.grade, avatar_url: c.avatar_url } : null, team_name: teams.find((t) => t.id === c?.team_id)?.name ?? null }
      })
    },
    async sendRadio(characterId, channel, body) {
      const me = await requireUid()
      if (!body.trim()) throw new Error('INVALID_FORM')
      must(await sb.from('radio').insert({ owner_id: me, character_id: characterId, channel, body: body.trim().slice(0, 300) }))
    },
    async deleteRadio(id) {
      must(await sb.from('radio').delete().eq('id', id))
    },
    async setRadioHidden(id, hidden) {
      must(await sb.from('radio').update({ hidden }).eq('id', id))
    },

    // ── 특별 훈련
    async listEvents(): Promise<PlayEvent[]> {
      const [rows, stats] = await Promise.all([sb.from('play_events').select('*').order('created_at', { ascending: false }), sb.rpc('list_event_stats')])
      const c = new Map<string, number>()
      for (const s of orEmpty<{ out_event: string; out_count: number }[]>(stats, [])) c.set(s.out_event, Number(s.out_count))
      return orEmpty<Omit<PlayEvent, 'entry_count'>[]>(rows, []).map((e) => ({ ...e, options: e.options ?? [], entry_count: c.get(e.id) ?? 0 }))
    },
    async getEvent(id) {
      return (await this.listEvents()).find((e) => e.id === id) ?? null
    },
    async saveEvent(e) {
      const row = { kind: e.kind, title: e.title.trim(), body: e.body ?? '', options: (e.options ?? []).map((o) => o.trim()).filter(Boolean), ...(e.status ? { status: e.status } : {}) }
      if (e.id) {
        must(await sb.from('play_events').update(row).eq('id', e.id))
        return e.id
      }
      return must<{ id: string }>(await sb.from('play_events').insert(row).select('id').single()).id
    },
    async deleteEvent(id) {
      must(await sb.from('play_events').delete().eq('id', id))
    },
    async listMyEntries(eventId): Promise<EventEntry[]> {
      const me = await uidNow()
      if (!me) return []
      const rows = orEmpty<EventEntry[]>(await sb.from('play_event_entries').select('id,event_id,character_id,text,created_at').eq('event_id', eventId).eq('owner_id', me), [])
      const m = await briefs(rows.map((r) => r.character_id))
      return rows.map((r) => ({ ...r, is_mine: true, character: m.get(r.character_id) ?? null }))
    },
    async enterEvent(eventId, characterId, text) {
      const me = await requireUid()
      const e = await this.getEvent(eventId)
      if (!e || e.status !== 'open') throw new Error('EVENT_CLOSED')
      if ((e.kind === 'lottery' || e.kind === 'submit') && !text.trim()) throw new Error('INVALID_FORM')
      if (e.kind === 'poll' && !e.options.includes(text)) throw new Error('INVALID_FORM')
      must(await sb.from('play_event_entries').upsert({ event_id: eventId, owner_id: me, character_id: characterId, text: text.trim().slice(0, 500) }, { onConflict: 'event_id,character_id' }))
    },
    async leaveEvent(entryId) {
      must(await sb.from('play_event_entries').delete().eq('id', entryId))
    },
    async listEntriesAdmin(eventId): Promise<EventEntry[]> {
      const rows = must<(EventEntry & { owner_id: string })[]>(await sb.from('play_event_entries').select('id,event_id,character_id,owner_id,text,created_at').eq('event_id', eventId).order('created_at'))
      const m = await briefs(rows.map((r) => r.character_id))
      const names = new Map<string, string>()
      const owners = [...new Set(rows.map((r) => r.owner_id))]
      if (owners.length) for (const p of (await sb.from('profiles').select('id,display_name').in('id', owners)).data ?? []) names.set(p.id, p.display_name)
      return rows.map(({ owner_id, ...r }) => ({ ...r, is_mine: false, character: m.get(r.character_id) ?? null, owner_name: names.get(owner_id) ?? '요원' }))
    },
    async drawEvent(eventId) {
      const e = await this.getEvent(eventId)
      if (!e) throw new Error('NOT_FOUND')
      const entries = must<{ character_id: string; text: string }[]>(await sb.from('play_event_entries').select('character_id,text').eq('event_id', eventId))
      const rows = drawResults(e.kind, entries)
      must(await sb.from('play_event_results').delete().eq('event_id', eventId))
      if (rows.length) must(await sb.from('play_event_results').insert(rows.map((r) => ({ ...r, event_id: eventId }))))
      must(await sb.from('play_events').update({ status: 'drawn' }).eq('id', eventId))
    },
    async setEventStatus(eventId, status) {
      must(await sb.from('play_events').update({ status }).eq('id', eventId))
    },
    async listEventResults(eventId): Promise<EventResult[]> {
      const e = await this.getEvent(eventId)
      if (!e || e.status === 'open') return []
      if (e.kind === 'submit') {
        const rows = orEmpty<{ out_character: string; out_text: string }[]>(await sb.rpc('list_event_submissions', { p_event: eventId }), [])
        const m = await briefs(rows.map((r) => r.out_character))
        return rows.map((r) => ({ character_id: r.out_character, character: m.get(r.out_character) ?? null, partner_id: null, partner: null, text: r.out_text }))
      }
      const rows = orEmpty<{ character_id: string; partner_id: string | null; text: string | null }[]>(await sb.from('play_event_results').select('character_id,partner_id,text').eq('event_id', eventId), [])
      const m = await briefs(rows.flatMap((r) => [r.character_id, r.partner_id]))
      return rows.map((r) => ({ ...r, character: m.get(r.character_id) ?? null, partner: r.partner_id ? m.get(r.partner_id) ?? null : null }))
    },
    async listEventCounts(eventId) {
      const e = await this.getEvent(eventId)
      if (!e || e.kind !== 'poll') return []
      const rows = orEmpty<{ out_text: string; out_count: number }[]>(await sb.rpc('list_event_counts', { p_event: eventId }), [])
      return e.options.map((o) => ({ text: o, count: Number(rows.find((r) => r.out_text === o)?.out_count ?? 0) }))
    },

    // ── 의뢰함
    async listMissions(): Promise<Mission[]> {
      const rows = orEmpty<(Omit<Mission, 'run_count'> & { mission_runs: unknown })[]>(await sb.from('missions').select('*,mission_runs(count)').order('created_at', { ascending: false }), [])
      return rows
        .map(({ mission_runs, ...m }) => ({ ...m, choices: Array.isArray(m.choices) ? m.choices : [], run_count: count(mission_runs) }))
        .sort((a, b) => Number(a.status !== 'open') - Number(b.status !== 'open'))
    },
    async saveMission(m) {
      const row = { title: m.title.trim(), body: m.body ?? '', area: m.area?.trim() || null, slots: m.slots === 2 ? 2 : 1, choices: (m.choices ?? []).filter((c) => c.label.trim()), ...(m.status ? { status: m.status } : {}) }
      if (m.id) {
        must(await sb.from('missions').update(row).eq('id', m.id))
        return m.id
      }
      return must<{ id: string }>(await sb.from('missions').insert(row).select('id').single()).id
    },
    async deleteMission(id) {
      must(await sb.from('missions').delete().eq('id', id))
    },
    async listMissionRuns(missionId): Promise<MissionRun[]> {
      const me = await uidNow()
      let q = sb.from('mission_runs').select('*').order('created_at', { ascending: false }).limit(300)
      if (missionId) q = q.eq('mission_id', missionId)
      const rows = orEmpty<(Omit<MissionRun, 'is_mine' | 'character' | 'partner'> & { owner_id: string })[]>(await q, [])
      const m = await briefs(rows.flatMap((r) => [r.character_id, r.partner_id]))
      return rows.map(({ owner_id, ...r }) => ({ ...r, is_mine: owner_id === me, character: m.get(r.character_id) ?? null, partner: r.partner_id ? m.get(r.partner_id) ?? null : null }))
    },
    async runMission(missionId, r) {
      const me = await requireUid()
      const ms = (await this.listMissions()).find((x) => x.id === missionId)
      if (!ms || ms.status !== 'open') throw new Error('MISSION_CLOSED')
      if (r.choice < 0 || r.choice >= ms.choices.length) throw new Error('INVALID_FORM')
      if (r.partner_id === r.character_id) throw new Error('INVALID_FORM')
      const res = await sb.from('mission_runs').insert({ mission_id: missionId, owner_id: me, character_id: r.character_id, partner_id: ms.slots === 2 ? r.partner_id : null, choice: r.choice, note: r.note.trim() || null })
      if ((res.error as { code?: string } | null)?.code === '23505') throw new Error('ALREADY_RUN')
      must(res)
    },
    async deleteMissionRun(id) {
      must(await sb.from('mission_runs').delete().eq('id', id))
    },

    // ── 휴직 · 전출 / MPC
    async listDuties() {
      return orEmpty<Duty[]>(await sb.from('character_duty').select('*'), [])
    },
    async setDuty(characterId, duty, note, gauge) {
      must(await sb.from('character_duty').upsert({ character_id: characterId, duty, note: note.trim() || null, gauge: gauge == null ? null : Math.max(0, Math.min(100, Math.round(gauge))), updated_at: new Date().toISOString() }))
    },
    async listMpc() {
      return orEmpty<{ character_id: string }[]>(await sb.from('mpc_characters').select('character_id'), []).map((r) => r.character_id)
    },
    async setMpc(characterId, on) {
      if (on) must(await sb.from('mpc_characters').upsert({ character_id: characterId }))
      else must(await sb.from('mpc_characters').delete().eq('character_id', characterId))
    },

    // ── 기록 태그
    async getPostTags(postId) {
      return orEmpty<{ character_ids: string[] } | null>(await sb.from('post_tags').select('character_ids').eq('post_id', postId).maybeSingle(), null)?.character_ids ?? []
    },
    async setPostTags(postId, ids) {
      must(await sb.from('post_tags').upsert({ post_id: postId, character_ids: [...new Set(ids)].slice(0, 20) }))
    },
    async listTaggedPostIds(characterId) {
      return orEmpty<{ post_id: string }[]>(await sb.from('post_tags').select('post_id').contains('character_ids', [characterId]), []).map((r) => r.post_id)
    },

    // ── 활동 요약
    async getActivity(characterId): Promise<Activity> {
      const rows = orEmpty<Record<string, number>[]>(await sb.rpc('character_activity', { p_character: characterId }), [])
      const r = rows[0] ?? {}
      const n = (k: string) => Number(r[k] ?? 0)
      return { thread_posts: n('out_thread_posts'), threads: n('out_threads'), radio: n('out_radio'), missions: n('out_missions'), events: n('out_events'), gates: n('out_gates'), clues: n('out_clues') }
    },
  }
}
