// 시연 모드용 러닝 기능. 등록증 · 세션은 기존 시연 백엔드(api)에서 읽고, 러닝 기록만 따로 저장한다.
import { drawResults, type Activity, type Duty, type EventEntry, type EventResult, type Mission, type MissionRun, type PlayApi, type PlayEvent, type PostKind, type RadioMsg, type Thread, type ThreadPost } from './playTypes'
import type { Api, Character, CharacterBrief } from './types'
import { uid } from './util'

const KEY = 'sa-local-play-v1'
const now = () => new Date().toISOString()
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const NPC = 'npc-archive'

interface LThread extends Omit<Thread, 'post_count' | 'last_character_id' | 'is_mine' | 'memberBriefs'> {}
interface LTPost extends Omit<ThreadPost, 'is_mine' | 'character'> {
  owner_id: string
}
interface LRadio extends Omit<RadioMsg, 'is_mine' | 'character' | 'team_name'> {
  owner_id: string
}
interface LEvent extends Omit<PlayEvent, 'entry_count'> {}
interface LEntry {
  id: string
  event_id: string
  character_id: string
  owner_id: string
  text: string
  created_at: string
}
interface LResult {
  event_id: string
  character_id: string
  partner_id: string | null
  text: string | null
}
interface LMission extends Omit<Mission, 'run_count'> {}
interface LRun extends Omit<MissionRun, 'is_mine' | 'character' | 'partner'> {
  owner_id: string
}
interface PDB {
  threads: LThread[]
  posts: LTPost[]
  radio: LRadio[]
  events: LEvent[]
  entries: LEntry[]
  results: LResult[]
  missions: LMission[]
  runs: LRun[]
  duties: Duty[]
  mpc: string[]
  tags: { post_id: string; character_ids: string[] }[]
}

function seed(): PDB {
  const tp = (thread_id: string, character_id: string, kind: PostKind, body: string, h: number): LTPost => ({ id: uid(), thread_id, character_id, owner_id: NPC, kind, body, created_at: ago(h), hidden: false })
  const rd = (character_id: string, channel: string, body: string, h: number): LRadio => ({ id: uid(), character_id, owner_id: NPC, channel, body, created_at: ago(h), hidden: false })
  return {
    threads: [
      { id: 'th-1', title: '복귀 브리핑 끝나고', place: '본부 지하 2층 · 제1팀 팀실', summary: '게이트에서 막 돌아온 밤. 팀실에 둘만 남았다.', status: 'open', open_join: false, members: ['c-test1', 'c-test2'], starter_id: 'c-test1', created_by: NPC, created_at: ago(30), last_at: ago(3) },
      { id: 'th-2', title: '야간 매점 앞', place: '본부 1층 매점', summary: '누구나 들어와도 되는 교신입니다.', status: 'open', open_join: true, members: ['c-test3'], starter_id: 'c-test3', created_by: NPC, created_at: ago(12), last_at: ago(11) },
    ],
    posts: [
      tp('th-1', 'c-test2', 'narration', '형광등 하나가 깜빡였다. 복도 끝에서 사이렌 소리가 천천히 잦아들었다.', 29),
      tp('th-1', 'c-test1', 'action', '헤드폰을 목에 건 채 소파에 털썩 앉는다. 장갑을 벗는 손이 조금 떨린다.', 28),
      tp('th-1', 'c-test1', 'line', '……다음엔 네가 뒤에 서.', 27.5),
      tp('th-1', 'c-test2', 'line', '앞에 서면 네가 폭주 수치 90 찍잖아. 손 줘.', 3),
      tp('th-2', 'c-test3', 'line', '자판기 또 멈췄는데, 이거 발로 차도 되는 거죠?', 11),
    ],
    radio: [
      rd('c-test3', 'main', '구역 12 통제선 풀렸나요? 퇴근길이 거기라서요.', 6),
      rd('c-test1', 'main', '아직. 제1팀 복귀 중.', 5.8),
      rd('c-test2', 'main', '매점에 딸기 우유 들어왔대요.', 5.5),
      rd('c-test1', 't-1', '팀실 불 꺼지면 보고해.', 4),
    ],
    events: [
      { id: 'ev-1', kind: 'lottery', title: '봉인된 약병', body: '약병에 담긴 효과를 한 줄씩 적어 제출하세요.\n마감 뒤 섞어서 나눠 드립니다. 자기가 적은 효과는 받지 않습니다.\n받은 효과로 짧은 로그를 남겨 주세요.', options: [], status: 'open', created_at: ago(20) },
      { id: 'ev-2', kind: 'pair', title: '수갑 훈련', body: '참가한 요원끼리 무작위로 짝을 짓습니다. 짝과 하루 동안 붙어 다니는 로그를 남겨 주세요.', options: [], status: 'open', created_at: ago(18) },
      { id: 'ev-3', kind: 'poll', title: '제3팀 호출부호 투표', body: '제3팀 호출부호 후보입니다. 요원이면 누구나 한 표씩 낼 수 있어요.', options: ['지하 2층', '야근조', '불침번'], status: 'open', created_at: ago(15) },
    ],
    entries: [{ id: uid(), event_id: 'ev-1', character_id: 'c-test3', owner_id: NPC, text: '하루 동안 말끝마다 "요원님"을 붙인다', created_at: ago(10) }],
    results: [],
    missions: [
      {
        id: 'ms-1', title: '밤마다 들리는 노크', body: '구역 12 주민 신고. 새벽마다 벽 안쪽에서 노크 소리가 난다고 합니다.', area: '구역 12', slots: 1, status: 'open', created_at: ago(40),
        choices: [
          { label: '감각으로 소리가 나는 자리를 짚는다', outcome: '벽 너머 배관에 끼인 작은 게이트 파편을 찾았다. 수거 완료.' },
          { label: '주민에게 기록을 받아 시간을 맞춘다', outcome: '노크는 늘 새벽 2시 14분. 다음 날 같은 시각에 잠복해 파편을 수거했다.' },
        ],
      },
      {
        id: 'ms-2', title: '교육원 신입 훈련 보조', body: '교육원에서 모의 게이트 훈련 보조 요원을 찾습니다. 둘이 함께 맡아도 됩니다.', area: '교육원', slots: 2, status: 'open', created_at: ago(26),
        choices: [
          { label: '괴수 역할을 맡는다', outcome: '신입들이 생각보다 매서웠다. 멍이 두 개 늘었다.' },
          { label: '안전 요원으로 뒤에 선다', outcome: '폭주 직전까지 간 신입 하나를 붙잡았다. 교관이 고개를 끄덕였다.' },
        ],
      },
      {
        id: 'ms-3', title: '사라진 고양이 찾기', body: '구역 03 할머니 댁 고양이가 게이트 통제선 안으로 들어갔습니다.', area: '구역 03', slots: 1, status: 'open', created_at: ago(8),
        choices: [
          { label: '통제선 안을 직접 수색한다', outcome: '고양이는 무너진 간판 아래서 자고 있었다. 할머니가 떡을 주셨다.' },
          { label: '방송차로 이름을 부른다', outcome: '고양이 대신 동네 고양이 여섯 마리가 모였다. 목표는 그중에 있었다.' },
        ],
      },
    ],
    runs: [],
    duties: [],
    mpc: [],
    tags: [],
  }
}

export function createLocalPlay(api: Api): PlayApi {
  let db: PDB
  try {
    db = JSON.parse(localStorage.getItem(KEY) || 'null') ?? seed()
  } catch {
    db = seed()
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch (e) {
      throw new Error('브라우저 저장 공간이 부족합니다.', { cause: e })
    }
  }
  save()

  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
  const need = (ok: boolean) => {
    if (!ok) throw new Error('FORBIDDEN')
  }
  const who = async () => {
    const s = await api.getSession()
    return { uid: s?.userId ?? null, member: !!s?.role, admin: s?.role === 'admin' }
  }
  const mineApproved = async (id: string) => (await api.listMyCharacters()).find((c) => c.id === id && c.status === 'approved') ?? null
  const charMap = async () => {
    const s = await api.getSession()
    const lists = await Promise.all([api.listPublicCharacters(), s ? api.listMyCharacters() : Promise.resolve([]), s?.role === 'admin' ? api.listAllCharacters() : Promise.resolve([])])
    const m = new Map<string, Character>()
    for (const l of lists) for (const c of l) m.set(c.id, c)
    return m
  }
  const toBrief = (c?: Character | null): CharacterBrief | null => (c ? { id: c.id, name: c.name, codename: c.codename, kind: c.kind, grade: c.grade, avatar_url: c.avatar_url } : null)
  const threadOut = (t: LThread, m: Map<string, Character>, me: string | null, admin: boolean): Thread => ({
    ...t,
    post_count: db.posts.filter((p) => p.thread_id === t.id && (!p.hidden || admin || p.owner_id === me)).length,
    last_character_id: [...db.posts].filter((p) => p.thread_id === t.id && !p.hidden).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.character_id ?? null,
    is_mine: t.created_by === me,
    memberBriefs: t.members.map((id) => toBrief(m.get(id))).filter(Boolean) as CharacterBrief[],
  })

  return {
    // ── 교신 기록
    async listThreads() {
      const w = await who()
      need(w.member)
      const m = await charMap()
      return clone([...db.threads].sort((a, b) => b.last_at.localeCompare(a.last_at)).map((t) => threadOut(t, m, w.uid, w.admin)))
    },
    async getThread(id) {
      const w = await who()
      need(w.member)
      const t = db.threads.find((x) => x.id === id)
      return t ? clone(threadOut(t, await charMap(), w.uid, w.admin)) : null
    },
    async listThreadsOf(characterId) {
      const w = await who()
      if (!w.member) return []
      const m = await charMap()
      return clone(db.threads.filter((t) => t.members.includes(characterId)).sort((a, b) => b.last_at.localeCompare(a.last_at)).map((t) => threadOut(t, m, w.uid, w.admin)))
    },
    async createThread(t) {
      const w = await who()
      need(w.member && !!(await mineApproved(t.starter_id)))
      if (!t.title.trim()) throw new Error('INVALID_FORM')
      const id = uid()
      const members = [...new Set([t.starter_id, ...t.members])]
      db.threads.push({ id, title: t.title.trim().slice(0, 80), place: t.place.trim() || null, summary: t.summary.trim() || null, status: 'open', open_join: t.open_join, members, starter_id: t.starter_id, created_by: w.uid!, created_at: now(), last_at: now() })
      if (t.first.body.trim()) db.posts.push({ id: uid(), thread_id: id, character_id: t.starter_id, owner_id: w.uid!, kind: t.first.kind, body: t.first.body.trim(), created_at: now(), hidden: false })
      save()
      return id
    },
    async updateThread(id, patch) {
      const w = await who()
      const t = db.threads.find((x) => x.id === id)
      need(!!t && (t.created_by === w.uid || w.admin))
      Object.assign(t!, patch)
      save()
    },
    async deleteThread(id) {
      const w = await who()
      const t = db.threads.find((x) => x.id === id)
      need(!!t && (t.created_by === w.uid || w.admin))
      db.threads = db.threads.filter((x) => x.id !== id)
      db.posts = db.posts.filter((p) => p.thread_id !== id)
      save()
    },
    async listThreadPosts(threadId) {
      const w = await who()
      need(w.member)
      const m = await charMap()
      return clone(
        db.posts
          .filter((p) => p.thread_id === threadId && (!p.hidden || w.admin || p.owner_id === w.uid))
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map(({ owner_id, ...p }) => ({ ...p, is_mine: owner_id === w.uid, character: toBrief(m.get(p.character_id)) })),
      )
    },
    async addThreadPost(threadId, p) {
      const w = await who()
      need(w.member && !!(await mineApproved(p.character_id)))
      const t = db.threads.find((x) => x.id === threadId)
      if (!t) throw new Error('NOT_FOUND')
      if (t.status !== 'open') throw new Error('THREAD_CLOSED')
      if (!(t.open_join || t.created_by === w.uid || t.members.includes(p.character_id))) throw new Error('THREAD_MEMBERS_ONLY')
      if (!p.body.trim()) throw new Error('INVALID_FORM')
      db.posts.push({ id: uid(), thread_id: threadId, character_id: p.character_id, owner_id: w.uid!, kind: p.kind, body: p.body.trim().slice(0, 3000), created_at: now(), hidden: false })
      t.last_at = now()
      if (!t.members.includes(p.character_id)) t.members.push(p.character_id)
      save()
    },
    async deleteThreadPost(id) {
      const w = await who()
      const p = db.posts.find((x) => x.id === id)
      need(!!p && (p.owner_id === w.uid || w.admin))
      db.posts = db.posts.filter((x) => x.id !== id)
      save()
    },
    async setThreadPostHidden(id, hidden) {
      need((await who()).admin)
      const p = db.posts.find((x) => x.id === id)
      if (p) p.hidden = hidden
      save()
    },

    // ── 상황실 무전
    async listRadio(channel) {
      const w = await who()
      need(w.member)
      const [m, teams] = await Promise.all([charMap(), api.listTeams()])
      return clone(
        db.radio
          .filter((r) => r.channel === channel && (!r.hidden || w.admin || r.owner_id === w.uid))
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .slice(-150)
          .map(({ owner_id, ...r }) => {
            const c = m.get(r.character_id)
            return { ...r, is_mine: owner_id === w.uid, character: toBrief(c), team_name: teams.find((t) => t.id === c?.team_id)?.name ?? null }
          }),
      )
    },
    async sendRadio(characterId, channel, body) {
      const w = await who()
      need(w.member && !!(await mineApproved(characterId)))
      if (!body.trim()) throw new Error('INVALID_FORM')
      db.radio.push({ id: uid(), character_id: characterId, owner_id: w.uid!, channel, body: body.trim().slice(0, 300), created_at: now(), hidden: false })
      save()
    },
    async deleteRadio(id) {
      const w = await who()
      const r = db.radio.find((x) => x.id === id)
      need(!!r && (r.owner_id === w.uid || w.admin))
      db.radio = db.radio.filter((x) => x.id !== id)
      save()
    },
    async setRadioHidden(id, hidden) {
      need((await who()).admin)
      const r = db.radio.find((x) => x.id === id)
      if (r) r.hidden = hidden
      save()
    },

    // ── 특별 훈련
    async listEvents() {
      need((await who()).member)
      return clone([...db.events].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((e) => ({ ...e, entry_count: db.entries.filter((x) => x.event_id === e.id).length })))
    },
    async getEvent(id) {
      need((await who()).member)
      const e = db.events.find((x) => x.id === id)
      return e ? clone({ ...e, entry_count: db.entries.filter((x) => x.event_id === e.id).length }) : null
    },
    async saveEvent(e) {
      need((await who()).admin)
      const prev = e.id ? db.events.find((x) => x.id === e.id) : undefined
      const row: LEvent = { id: prev?.id ?? uid(), kind: e.kind, title: e.title.trim(), body: e.body ?? '', options: (e.options ?? []).map((o) => o.trim()).filter(Boolean), status: e.status ?? prev?.status ?? 'open', created_at: prev?.created_at ?? now() }
      db.events = [...db.events.filter((x) => x.id !== row.id), row]
      save()
      return row.id
    },
    async deleteEvent(id) {
      need((await who()).admin)
      db.events = db.events.filter((x) => x.id !== id)
      db.entries = db.entries.filter((x) => x.event_id !== id)
      db.results = db.results.filter((x) => x.event_id !== id)
      save()
    },
    async listMyEntries(eventId) {
      const w = await who()
      need(w.member)
      const m = await charMap()
      return clone(db.entries.filter((x) => x.event_id === eventId && x.owner_id === w.uid).map(({ owner_id: _o, ...x }) => ({ ...x, is_mine: true, character: toBrief(m.get(x.character_id)) })))
    },
    async enterEvent(eventId, characterId, text) {
      const w = await who()
      need(w.member && !!(await mineApproved(characterId)))
      const e = db.events.find((x) => x.id === eventId)
      if (!e || e.status !== 'open') throw new Error('EVENT_CLOSED')
      if ((e.kind === 'lottery' || e.kind === 'submit') && !text.trim()) throw new Error('INVALID_FORM')
      if (e.kind === 'poll' && !e.options.includes(text)) throw new Error('INVALID_FORM')
      db.entries = [...db.entries.filter((x) => !(x.event_id === eventId && x.character_id === characterId)), { id: uid(), event_id: eventId, character_id: characterId, owner_id: w.uid!, text: text.trim().slice(0, 500), created_at: now() }]
      save()
    },
    async leaveEvent(entryId) {
      const w = await who()
      const x = db.entries.find((y) => y.id === entryId)
      const e = x && db.events.find((y) => y.id === x.event_id)
      need(!!x && ((x.owner_id === w.uid && e?.status === 'open') || w.admin))
      db.entries = db.entries.filter((y) => y.id !== entryId)
      save()
    },
    async listEntriesAdmin(eventId) {
      need((await who()).admin)
      const [m, members] = await Promise.all([charMap(), api.listMembers()])
      return clone(
        db.entries
          .filter((x) => x.event_id === eventId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map(({ owner_id, ...x }): EventEntry => ({ ...x, is_mine: false, character: toBrief(m.get(x.character_id)), owner_name: members.find((u) => u.user_id === owner_id)?.display_name ?? (owner_id === NPC ? '기록관리실' : '요원') })),
      )
    },
    async drawEvent(eventId) {
      need((await who()).admin)
      const e = db.events.find((x) => x.id === eventId)
      need(!!e)
      const rows = drawResults(e!.kind, db.entries.filter((x) => x.event_id === eventId))
      db.results = [...db.results.filter((r) => r.event_id !== eventId), ...rows.map((r) => ({ ...r, event_id: eventId }))]
      e!.status = 'drawn'
      save()
    },
    async setEventStatus(eventId, status) {
      need((await who()).admin)
      const e = db.events.find((x) => x.id === eventId)
      if (e) e.status = status
      save()
    },
    async listEventResults(eventId) {
      need((await who()).member)
      const e = db.events.find((x) => x.id === eventId)
      if (!e || e.status === 'open') return []
      const m = await charMap()
      if (e.kind === 'submit') return clone(db.entries.filter((x) => x.event_id === eventId).map((x): EventResult => ({ character_id: x.character_id, character: toBrief(m.get(x.character_id)), partner_id: null, partner: null, text: x.text })))
      return clone(db.results.filter((r) => r.event_id === eventId).map((r): EventResult => ({ character_id: r.character_id, character: toBrief(m.get(r.character_id)), partner_id: r.partner_id, partner: toBrief(r.partner_id ? m.get(r.partner_id) : null), text: r.text })))
    },
    async listEventCounts(eventId) {
      need((await who()).member)
      const e = db.events.find((x) => x.id === eventId)
      if (!e || e.kind !== 'poll') return []
      return e.options.map((o) => ({ text: o, count: db.entries.filter((x) => x.event_id === eventId && x.text === o).length }))
    },

    // ── 의뢰함
    async listMissions() {
      need((await who()).member)
      return clone([...db.missions].sort((a, b) => Number(a.status !== 'open') - Number(b.status !== 'open') || b.created_at.localeCompare(a.created_at)).map((ms) => ({ ...ms, run_count: db.runs.filter((r) => r.mission_id === ms.id).length })))
    },
    async saveMission(ms) {
      need((await who()).admin)
      const prev = ms.id ? db.missions.find((x) => x.id === ms.id) : undefined
      const row: LMission = {
        id: prev?.id ?? uid(), title: ms.title.trim(), body: ms.body ?? '', area: ms.area?.trim() || null, slots: ms.slots === 2 ? 2 : 1,
        choices: (ms.choices ?? []).filter((c) => c.label.trim()), status: ms.status ?? prev?.status ?? 'open', created_at: prev?.created_at ?? now(),
      }
      db.missions = [...db.missions.filter((x) => x.id !== row.id), row]
      save()
      return row.id
    },
    async deleteMission(id) {
      need((await who()).admin)
      db.missions = db.missions.filter((x) => x.id !== id)
      db.runs = db.runs.filter((r) => r.mission_id !== id)
      save()
    },
    async listMissionRuns(missionId) {
      const w = await who()
      need(w.member)
      const m = await charMap()
      return clone(
        db.runs
          .filter((r) => !missionId || r.mission_id === missionId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(({ owner_id, ...r }) => ({ ...r, is_mine: owner_id === w.uid, character: toBrief(m.get(r.character_id)), partner: toBrief(r.partner_id ? m.get(r.partner_id) : null) })),
      )
    },
    async runMission(missionId, r) {
      const w = await who()
      need(w.member && !!(await mineApproved(r.character_id)))
      const ms = db.missions.find((x) => x.id === missionId)
      if (!ms || ms.status !== 'open') throw new Error('MISSION_CLOSED')
      if (r.choice < 0 || r.choice >= ms.choices.length) throw new Error('INVALID_FORM')
      if (db.runs.some((x) => x.mission_id === missionId && x.character_id === r.character_id)) throw new Error('ALREADY_RUN')
      if (r.partner_id === r.character_id) throw new Error('INVALID_FORM')
      db.runs.push({ id: uid(), mission_id: missionId, character_id: r.character_id, partner_id: ms.slots === 2 ? r.partner_id : null, choice: r.choice, note: r.note.trim() || null, created_at: now(), owner_id: w.uid! })
      save()
    },
    async deleteMissionRun(id) {
      const w = await who()
      const r = db.runs.find((x) => x.id === id)
      need(!!r && (r.owner_id === w.uid || w.admin))
      db.runs = db.runs.filter((x) => x.id !== id)
      save()
    },

    // ── 휴직 · 전출 / MPC
    async listDuties() {
      return clone(db.duties)
    },
    async setDuty(characterId, duty, note, gauge) {
      const w = await who()
      const own = (await api.listMyCharacters()).some((c) => c.id === characterId)
      need(own || w.admin)
      db.duties = [...db.duties.filter((d) => d.character_id !== characterId), { character_id: characterId, duty, note: note.trim() || null, gauge: gauge == null ? null : Math.max(0, Math.min(100, Math.round(gauge))), updated_at: now() }]
      save()
    },
    async listMpc() {
      return clone(db.mpc)
    },
    async setMpc(characterId, on) {
      need((await who()).admin)
      db.mpc = on ? [...new Set([...db.mpc, characterId])] : db.mpc.filter((x) => x !== characterId)
      save()
    },

    // ── 기록 태그
    async getPostTags(postId) {
      need((await who()).member)
      return clone(db.tags.find((t) => t.post_id === postId)?.character_ids ?? [])
    },
    async setPostTags(postId, ids) {
      const w = await who()
      const post = await api.getPost(postId)
      need(!!post && (post.author_id === w.uid || w.admin))
      db.tags = [...db.tags.filter((t) => t.post_id !== postId), { post_id: postId, character_ids: [...new Set(ids)].slice(0, 20) }]
      save()
    },
    async listTaggedPostIds(characterId) {
      if (!(await who()).member) return []
      return db.tags.filter((t) => t.character_ids.includes(characterId)).map((t) => t.post_id)
    },

    // ── 활동 요약
    async getActivity(characterId): Promise<Activity> {
      const w = await who()
      const gates = (await api.listAllEntries()).filter((e) => e.character_id === characterId).length
      let clues = 0
      if (w.member) {
        const cases = await api.listCases()
        const all = await Promise.all(cases.map((c) => api.listCaseFindings(c.id)))
        clues = all.flat().filter((f) => f.character_id === characterId && f.found).length
      }
      return {
        thread_posts: db.posts.filter((p) => p.character_id === characterId && !p.hidden).length,
        threads: db.threads.filter((t) => t.starter_id === characterId).length,
        radio: db.radio.filter((r) => r.character_id === characterId && !r.hidden).length,
        missions: db.runs.filter((r) => r.character_id === characterId || r.partner_id === characterId).length,
        events: db.entries.filter((e) => e.character_id === characterId).length,
        gates,
        clues,
      }
    },
  }
}
