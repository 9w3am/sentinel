// ─────────────────────────────────────────────
// 러닝 기능: 교신 기록(역극) · 상황실 무전 · 특별 훈련(추첨 · 짝 · 투표 · 제출) · 의뢰함 · 휴직/전출 · MPC · 기록 태그
// 시연 모드는 playLocal, 실사이트는 playSupabase(005_play.sql 필요)가 같은 모양으로 구현한다.
// ─────────────────────────────────────────────
import type { CharacterBrief } from './types'

export type PostKind = 'line' | 'action' | 'narration'

export interface Thread {
  id: string
  title: string
  place: string | null
  summary: string | null
  status: 'open' | 'closed'
  open_join: boolean
  members: string[]
  starter_id: string | null
  created_by: string
  created_at: string
  last_at: string
  post_count: number
  last_character_id: string | null
  is_mine: boolean
  memberBriefs: CharacterBrief[]
}
export interface ThreadInput {
  title: string
  place: string
  summary: string
  open_join: boolean
  starter_id: string
  members: string[]
  first: { kind: PostKind; body: string }
}
export interface ThreadPost {
  id: string
  thread_id: string
  character_id: string
  kind: PostKind
  body: string
  created_at: string
  hidden: boolean
  is_mine: boolean
  character: CharacterBrief | null
}

export interface RadioMsg {
  id: string
  character_id: string
  channel: string
  body: string
  created_at: string
  hidden: boolean
  is_mine: boolean
  character: CharacterBrief | null
  team_name: string | null
}

export type EventKind = 'lottery' | 'pair' | 'poll' | 'submit'
export interface PlayEvent {
  id: string
  kind: EventKind
  title: string
  body: string
  options: string[]
  status: 'open' | 'drawn' | 'closed'
  created_at: string
  entry_count: number
}
export interface EventEntry {
  id: string
  event_id: string
  character_id: string
  text: string
  created_at: string
  is_mine: boolean
  character: CharacterBrief | null
  owner_name?: string
}
export interface EventResult {
  character_id: string
  character: CharacterBrief | null
  partner_id: string | null
  partner: CharacterBrief | null
  text: string | null
}

export interface MissionChoice {
  label: string
  outcome: string
}
export interface Mission {
  id: string
  title: string
  body: string
  area: string | null
  slots: number
  choices: MissionChoice[]
  status: 'open' | 'closed'
  created_at: string
  run_count: number
}
export interface MissionRun {
  id: string
  mission_id: string
  character_id: string
  partner_id: string | null
  choice: number
  note: string | null
  created_at: string
  is_mine: boolean
  character: CharacterBrief | null
  partner: CharacterBrief | null
}

export type DutyKind = 'active' | 'leave' | 'transfer'
export interface Duty {
  character_id: string
  duty: DutyKind
  note: string | null
  gauge: number | null
  updated_at: string
}

export interface Activity {
  thread_posts: number
  threads: number
  radio: number
  missions: number
  events: number
  gates: number
  clues: number
}

export interface PlayApi {
  // 교신 기록 (역극 스레드)
  listThreads(): Promise<Thread[]>
  getThread(id: string): Promise<Thread | null>
  listThreadsOf(characterId: string): Promise<Thread[]>
  createThread(t: ThreadInput): Promise<string>
  updateThread(id: string, patch: Partial<Pick<Thread, 'title' | 'place' | 'summary' | 'open_join' | 'status' | 'members'>>): Promise<void>
  deleteThread(id: string): Promise<void>
  listThreadPosts(threadId: string): Promise<ThreadPost[]>
  addThreadPost(threadId: string, p: { character_id: string; kind: PostKind; body: string }): Promise<void>
  deleteThreadPost(id: string): Promise<void>
  setThreadPostHidden(id: string, hidden: boolean): Promise<void> // 관리부

  // 상황실 무전
  listRadio(channel: string): Promise<RadioMsg[]>
  sendRadio(characterId: string, channel: string, body: string): Promise<void>
  deleteRadio(id: string): Promise<void>
  setRadioHidden(id: string, hidden: boolean): Promise<void> // 관리부

  // 특별 훈련 (이벤트 · 투표)
  listEvents(): Promise<PlayEvent[]>
  getEvent(id: string): Promise<PlayEvent | null>
  saveEvent(e: Partial<PlayEvent> & { kind: EventKind; title: string }): Promise<string> // 관리부
  deleteEvent(id: string): Promise<void> // 관리부
  listMyEntries(eventId: string): Promise<EventEntry[]>
  enterEvent(eventId: string, characterId: string, text: string): Promise<void>
  leaveEvent(entryId: string): Promise<void>
  listEntriesAdmin(eventId: string): Promise<EventEntry[]> // 관리부
  drawEvent(eventId: string): Promise<void> // 관리부
  setEventStatus(eventId: string, status: PlayEvent['status']): Promise<void> // 관리부
  listEventResults(eventId: string): Promise<EventResult[]>
  listEventCounts(eventId: string): Promise<{ text: string; count: number }[]>

  // 의뢰함
  listMissions(): Promise<Mission[]>
  saveMission(m: Partial<Mission> & { title: string }): Promise<string> // 관리부
  deleteMission(id: string): Promise<void> // 관리부
  listMissionRuns(missionId?: string): Promise<MissionRun[]>
  runMission(missionId: string, r: { character_id: string; partner_id: string | null; choice: number; note: string }): Promise<void>
  deleteMissionRun(id: string): Promise<void>

  // 휴직 · 전출 / MPC
  listDuties(): Promise<Duty[]>
  setDuty(characterId: string, duty: DutyKind, note: string, gauge?: number | null): Promise<void>
  listMpc(): Promise<string[]>
  setMpc(characterId: string, on: boolean): Promise<void> // 관리부

  // 활동 기록 태그
  getPostTags(postId: string): Promise<string[]>
  setPostTags(postId: string, ids: string[]): Promise<void>
  listTaggedPostIds(characterId: string): Promise<string[]>

  // 활동 요약 (개인 관측창 · 표창)
  getActivity(characterId: string): Promise<Activity>
}

export const EVENT_KINDS: { value: EventKind; label: string; desc: string }[] = [
  { value: 'lottery', label: '추첨', desc: '각자 한 줄씩 제출하면 섞어서 다른 사람이 적은 것을 받습니다.' },
  { value: 'pair', label: '짝 뽑기', desc: '참가한 캐릭터끼리 무작위로 짝을 짓습니다.' },
  { value: 'poll', label: '투표', desc: '보기 중 하나를 고릅니다. 결과는 마감 뒤 공개됩니다.' },
  { value: 'submit', label: '제출', desc: '답이나 한 줄을 제출합니다. 마감 뒤 모두 공개됩니다.' },
]
export const eventKindLabel = (k: string) => EVENT_KINDS.find((x) => x.value === k)?.label ?? k

export const POST_KINDS: { value: PostKind; label: string; hint: string }[] = [
  { value: 'line', label: '대사', hint: '따옴표 없이 대사만 적어요' },
  { value: 'action', label: '행동', hint: '캐릭터가 하는 행동 · 표정' },
  { value: 'narration', label: '서술', hint: '장면 · 분위기 묘사' },
]

export const DUTY_LABELS: Record<DutyKind, string> = { active: '근무 중', leave: '휴직', transfer: '전출' }

/** 표창: 활동 기록이 쌓이면 붙는다. 순위 · 벌칙은 없다 */
export const AWARDS: { key: string; label: string; test: (a: Activity) => boolean }[] = [
  { key: 'thread1', label: '첫 교신', test: (a) => a.thread_posts >= 1 },
  { key: 'thread30', label: '교신 30회', test: (a) => a.thread_posts >= 30 },
  { key: 'radio50', label: '무전 50회', test: (a) => a.radio >= 50 },
  { key: 'mission5', label: '의뢰 5건 수행', test: (a) => a.missions >= 5 },
  { key: 'mission20', label: '의뢰 20건 수행', test: (a) => a.missions >= 20 },
  { key: 'gate3', label: '게이트 3회 투입', test: (a) => a.gates >= 3 },
  { key: 'clue3', label: '단서 3건 발견', test: (a) => a.clues >= 3 },
  { key: 'event3', label: '특별 훈련 3회 수료', test: (a) => a.events >= 3 },
]

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 추첨 결과 만들기. 추첨은 자기가 적은 것을 받지 않고, 짝 뽑기는 둘씩 묶는다(남으면 혼자) */
export function drawResults(kind: EventKind, entries: { character_id: string; text: string }[]) {
  const s = shuffle(entries)
  if (kind === 'lottery') {
    if (s.length < 2) return s.map((e) => ({ character_id: e.character_id, partner_id: null, text: e.text }))
    return s.map((e, i) => ({ character_id: e.character_id, partner_id: null, text: s[(i + 1) % s.length].text }))
  }
  if (kind === 'pair') {
    const out: { character_id: string; partner_id: string | null; text: string | null }[] = []
    for (let i = 0; i < s.length; i += 2) {
      const a = s[i]
      const b = s[i + 1]
      out.push({ character_id: a.character_id, partner_id: b?.character_id ?? null, text: null })
      if (b) out.push({ character_id: b.character_id, partner_id: a.character_id, text: null })
    }
    return out
  }
  return []
}
