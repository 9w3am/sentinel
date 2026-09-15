// Supabase 가 연결되지 않았을 때 쓰는 시연용 백엔드.
// 데이터는 이 브라우저의 localStorage 에만 저장된다. 권한 규칙은 schema.sql 과 같게 흉내 낸다.
import type {
  AnonAdminRow,
  AnonComment,
  AnonPost,
  Api,
  Application,
  Case,
  CaseClue,
  CaseTarget,
  Character,
  CharacterBrief,
  Cohort,
  Comment,
  Incident,
  IncidentEntry,
  InboxItem,
  Invite,
  Notice,
  Post,
  Relation,
  Reveal,
  Role,
  Session,
  Settings,
  SitePage,
  Team,
} from './types'
import { randomCode, uid } from './util'

interface LUser {
  id: string
  email: string
  pw: string
  displayName: string
  created_at: string
}
interface LAnonPost {
  id: string
  owner_id: string
  character_id: string
  reveal: Reveal
  title: string
  body: string
  hidden: boolean
  created_at: string
}
interface LAnonComment {
  id: string
  post_id: string
  owner_id: string
  character_id: string
  body: string
  hidden: boolean
  created_at: string
}
interface LInbox extends InboxItem {
  owner_id: string
}
interface LApplication extends Omit<Application, 'invite_code' | 'invite_used'> {
  pin: string
  invite_id: string | null
}
interface LFinding {
  id: string
  case_id: string
  target_id: string
  approach: CaseClue['approach']
  clue_id: string | null
  character_id: string
  owner_id: string
  created_at: string
}
interface DB {
  users: LUser[]
  roles: { user_id: string; role: Role; created_at: string }[]
  invites: (Invite & { created_by: string | null })[]
  characters: Character[]
  secrets: Record<string, string>
  relations: Relation[]
  posts: Post[]
  comments: Comment[]
  notices: Notice[]
  incidents: Incident[]
  settings: Settings
  pages: SitePage[]
  entries: IncidentEntry[]
  cohorts: Cohort[]
  teams: Team[]
  applications: LApplication[]
  anonPosts: LAnonPost[]
  anonComments: LAnonComment[]
  inbox: LInbox[]
  cases: Case[]
  targets: CaseTarget[]
  clues: CaseClue[]
  findings: LFinding[]
  answers: { case_id: string; character_id: string; owner_id: string; choice: number }[]
  session: string | null
  docSeq: number
}

const KEY = 'sa-local-db-v3'
const now = () => new Date().toISOString()
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

async function hash(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sa:' + s))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function seed(): DB {
  const npc = 'npc-archive'
  const mk = (id: string, c: Partial<Character>, hoursAgo: number): Character => ({
    id,
    owner_id: npc,
    name: '',
    codename: null,
    kind: 'sentinel',
    grade: 'C',
    affiliation: null,
    avatar_url: null,
    details: {},
    is_public: true,
    locked: false,
    status: 'approved',
    review_note: null,
    created_at: ago(hoursAgo),
    updated_at: ago(hoursAgo),
    team_id: null,
    team_role: null,
    cohort_no: 1,
    ...c,
  })
  return {
    users: [],
    roles: [],
    // 시연 모드 전용 번호. 실제 Supabase DB의 번호와는 무관하다.
    invites: [{ id: uid(), code: 'DEMO-ADMIN', note: '시연용 운영자 계정', grant_admin: true, used_by: null, used_at: null, created_at: now(), created_by: null }],
    characters: [
      mk('c-test1', { name: '테스트1', kind: 'sentinel', grade: 'S', affiliation: '본부 · 대응국', team_id: 't-1', team_role: '선봉' }, 300),
      mk('c-test2', { name: '테스트2', kind: 'guide', grade: 'A', affiliation: '본부 · 가이딩센터', team_id: 't-1', team_role: '앵커' }, 280),
      mk('c-test3', { name: '테스트3', kind: 'sentinel', grade: 'B', affiliation: '제1지부', team_id: 't-2', team_role: '선봉' }, 100),
    ],
    secrets: {},
    relations: [
      { id: uid(), from_character_id: 'c-test1', to_character_id: 'c-test2', kind: '전담 페어', description: null, status: 'accepted', created_by: npc, created_at: ago(200), options: { allow: ['mission', 'guiding', 'crisis'], temp: 'normal' } },
    ],
    posts: [],
    comments: [],
    pages: [],
    entries: [],
    notices: [
      { id: uid(), doc_no: 1, title: '경보 2단계 발령 및 출입 통제 안내', body: '경보 2단계(주의)를 발령합니다.\n\n1. B급 이상 요원은 소속 지부에서 대기합니다.\n2. 활성 게이트 반경 500m 안쪽은 비각성자 출입을 통제합니다.\n3. 해제 시각은 상황실 판단에 따라 따로 알립니다.', level: 'warning', pinned: true, created_at: ago(1) },
      { id: uid(), doc_no: 2, title: '하반기 정기 등급 재측정 일정', body: '등록 요원 전원을 대상으로 하반기 정기 등급 재측정을 실시합니다.\n\n일정은 소속별로 따로 안내합니다.', level: 'normal', pinned: false, created_at: ago(50) },
      { id: uid(), doc_no: 3, title: '제1기 편입 신청 접수', body: '제1기 편입 신청을 받습니다.\n\n신청서는 누리집 편입 신청서 화면에서 제출합니다. 계정이 없어도 됩니다.', level: 'normal', pinned: false, created_at: ago(98) },
      { id: uid(), doc_no: 4, title: '결속 신고서 양식 변경 안내', body: '결속 신고는 집무실의 결속 관계 메뉴에서만 받습니다. 기존 양식은 사용할 수 없습니다.', level: 'normal', pinned: false, created_at: ago(260) },
    ],
    incidents: [
      { id: 'g-0917', code: 'G-0917', title: 'A급 게이트 개방', location: '구역 07', grade: 'A', status: 'responding', body: '대응 1조 투입. 반경 500m 통제.', occurred_at: ago(2) },
      { id: uid(), code: 'G-0916', title: 'C급 게이트 반응', location: '구역 12', grade: 'C', status: 'open', body: '출입 통제 중.', occurred_at: ago(5.4) },
      { id: uid(), code: 'G-0915', title: 'D급 감응 관측', location: '구역 03', grade: 'D', status: 'open', body: '개방 여부 확인 중.', occurred_at: ago(9.9) },
      { id: uid(), code: 'G-0914', title: 'B급 게이트 봉쇄', location: '구역 21', grade: 'B', status: 'closed', body: '봉쇄 완료.', occurred_at: ago(26) },
      { id: uid(), code: 'G-0913', title: 'E급 게이트 소멸', location: '구역 16', grade: 'E', status: 'closed', body: '자연 소멸 확인.', occurred_at: ago(31) },
    ],
    settings: { alert_level: 2, alert_message: 'B급 이상 요원은 대기 상태를 유지하십시오. 활성 게이트 반경 500m 안쪽은 비각성자 출입이 통제됩니다.', updated_at: ago(1) },
    cohorts: [{ no: 1, title: '제1기 편입', status: 'recruiting', note: null, created_at: ago(120) }],
    teams: [
      { id: 't-1', name: '제1팀', callsign: null, color: '#f0c419', motto: null, description: null, sort: 1, created_at: ago(400) },
      { id: 't-2', name: '제2팀', callsign: null, color: '#8fb4dc', motto: null, description: null, sort: 2, created_at: ago(400) },
      { id: 't-3', name: '제3팀', callsign: null, color: '#e8892a', motto: null, description: null, sort: 3, created_at: ago(400) },
    ],
    applications: [],
    anonPosts: [{ id: 'ap-1', owner_id: npc, character_id: 'c-test3', reveal: 'team', title: '지하 2층 자판기 또 멈춤', body: '오늘만 세 번째. 결정 넣으면 돌아가는 거 아니었냐', hidden: false, created_at: ago(5) }],
    anonComments: [{ id: 'ac-1', post_id: 'ap-1', owner_id: npc, character_id: 'c-test1', body: '어제 누가 발로 찬 뒤로 그렇다는 소문', hidden: false, created_at: ago(4) }],
    inbox: [],
    cases: [
      {
        id: 'case-1',
        code: 'C-01',
        title: '구역 07 반복 개방',
        briefing: '구역 07에서 7년 사이 게이트가 열한 번 열렸다. 다른 구역보다 네 배 많다.\n관측 기록, 현장, 주민 증언을 모아 원인을 찾는다.',
        incident_id: 'g-0917',
        status: 'open',
        question: '구역 07에서 게이트가 유독 자주 열리는 까닭은?',
        choices: ['지하 배수로에 남은 옛 게이트 흔적', '결정 정제소에서 새어 나오는 힘', '누군가 일부러 여는 것'],
        answer: null,
        conclusion: null,
        created_at: ago(30),
      },
    ],
    targets: [
      { id: 'tg-1', case_id: 'case-1', name: '지하 배수로', detail: '구역 07 남쪽. 게이트 개방 지점 세 곳과 이어진다.', sort: 1 },
      { id: 'tg-2', case_id: 'case-1', name: '정제소 야간 근무자', detail: '개방 당일 밤마다 근무했다.', sort: 2 },
      { id: 'tg-3', case_id: 'case-1', name: '구역 관측 기록', detail: '7년 치 개방 시각과 등급.', sort: 3 },
    ],
    clues: [
      { id: 'cl-1', case_id: 'case-1', target_id: 'tg-1', approach: 'sense', body: '배수로 안쪽 벽에서 금속을 긁는 소리가 일정한 간격으로 들린다. 사람 발소리는 아니다.' },
      { id: 'cl-2', case_id: 'case-1', target_id: 'tg-1', approach: 'search', body: '벽면 아래에 불에 탄 듯 검게 굳은 자국이 원 모양으로 남아 있다. 지름 2m 남짓.' },
      { id: 'cl-3', case_id: 'case-1', target_id: 'tg-2', approach: 'interview', body: '"게이트 열리기 전날 밤엔 꼭 정전이 한 번 나요. 3초쯤. 기록엔 안 남는대요."' },
      { id: 'cl-4', case_id: 'case-1', target_id: 'tg-2', approach: 'psyche', body: '근무자에게서 오래 눌러 둔 공포가 읽힌다. 무언가를 봤지만 말하지 않았다.' },
      { id: 'cl-5', case_id: 'case-1', target_id: 'tg-3', approach: 'records', body: '개방 11건 중 9건이 새벽 3시에서 4시 사이. 모두 정제소 교대 시간과 겹친다.' },
    ],
    findings: [],
    answers: [],
    session: null,
    docSeq: 4,
  }
}

export function createLocalApi(): Api {
  let db: DB
  try {
    db = JSON.parse(localStorage.getItem(KEY) || 'null') ?? seed()
  } catch {
    db = seed()
  }
  const listeners = new Set<() => void>()
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch (e) {
      throw new Error('브라우저 저장 공간이 부족합니다. 사진 용량을 줄여 주세요.', { cause: e })
    }
  }
  save()

  const me = () => db.session
  const roleOf = (u: string | null): Role | null => {
    if (!u) return null
    const rs = db.roles.filter((r) => r.user_id === u).map((r) => r.role)
    return rs.includes('admin') ? 'admin' : rs.includes('member') ? 'member' : null
  }
  const isAdmin = () => roleOf(me()) === 'admin'
  const isMember = () => roleOf(me()) !== null
  const need = (ok: boolean) => {
    if (!ok) throw new Error('FORBIDDEN')
  }
  const nameOf = (u: string) => db.users.find((x) => x.id === u)?.displayName ?? (u === 'npc-archive' ? '기록관리실' : '요원')
  const visible = (c: Character) => (c.is_public && !c.locked && c.status === 'approved') || c.owner_id === me() || isAdmin()
  const brief = (id: string | null): CharacterBrief | null => {
    const c = id ? db.characters.find((x) => x.id === id) : null
    if (!c || !visible(c)) return null
    return { id: c.id, name: c.name, codename: c.codename, kind: c.kind, grade: c.grade, avatar_url: c.avatar_url }
  }
  const anyBrief = (id: string): CharacterBrief | null => {
    const c = db.characters.find((x) => x.id === id)
    return c ? { id: c.id, name: c.name, codename: c.codename, kind: c.kind, grade: c.grade, avatar_url: c.avatar_url } : null
  }
  const ownApproved = (characterId: string) => {
    const c = db.characters.find((x) => x.id === characterId)
    return !!c && c.owner_id === me() && c.status === 'approved' ? c : null
  }
  const withBriefs = (rs: Relation[]) => rs.map((r) => ({ ...r, from: brief(r.from_character_id), to: brief(r.to_character_id) }))
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
  const emit = () => listeners.forEach((l) => setTimeout(l, 0))
  const tick = () => new Promise((r) => setTimeout(r, 60))
  const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, n).toUpperCase()

  const anonVisible = (p: LAnonPost) => !p.hidden || isAdmin() || p.owner_id === me()
  const deptOf = (p: LAnonPost) => {
    const c = db.characters.find((x) => x.id === p.character_id)
    if (p.reveal === 'dept') return c?.affiliation ?? null
    if (p.reveal === 'team') return db.teams.find((t) => t.id === c?.team_id)?.name ?? null
    return null
  }

  return {
    mode: 'local',

    async getSession(): Promise<Session | null> {
      const u = db.users.find((x) => x.id === me())
      if (!u) return null
      return { userId: u.id, email: u.email, displayName: u.displayName, role: roleOf(u.id) }
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email, password) {
      await tick()
      const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!u || u.pw !== (await hash(password))) throw new Error('Invalid login credentials')
      db.session = u.id
      save()
      emit()
    },
    async signUp(code, email, password, displayName) {
      await tick()
      const inv = db.invites.find((i) => i.code === code.trim().toUpperCase() && !i.used_by)
      if (!inv) throw new Error('INVALID_INVITE')
      if (password.length < 6) throw new Error('Password should be at least 6 characters')
      if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('User already registered')
      const u: LUser = { id: uid(), email: email.trim(), pw: await hash(password), displayName: displayName.trim() || '요원', created_at: now() }
      db.users.push(u)
      db.roles.push({ user_id: u.id, role: inv.grant_admin ? 'admin' : 'member', created_at: now() })
      inv.used_by = u.id
      inv.used_at = now()
      db.session = u.id
      save()
      emit()
    },
    async signOut() {
      db.session = null
      save()
      emit()
    },
    async updateDisplayName(name) {
      const u = db.users.find((x) => x.id === me())
      need(!!u)
      u!.displayName = name.trim()
      save()
      emit()
    },

    async getSettings() {
      return clone(db.settings)
    },
    async updateSettings(s) {
      need(isAdmin())
      db.settings = { alert_level: s.alert_level, alert_message: s.alert_message, updated_at: now() }
      save()
    },
    async listNotices() {
      return clone([...db.notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at)))
    },
    async getNotice(id) {
      return clone(db.notices.find((n) => n.id === id) ?? null)
    },
    async saveNotice(n) {
      need(isAdmin())
      const existing = n.id ? db.notices.find((x) => x.id === n.id) : null
      if (existing) Object.assign(existing, { title: n.title, body: n.body, level: n.level ?? 'normal', pinned: !!n.pinned })
      else db.notices.push({ id: uid(), doc_no: ++db.docSeq, title: n.title, body: n.body, level: n.level ?? 'normal', pinned: !!n.pinned, created_at: now() })
      save()
    },
    async deleteNotice(id) {
      need(isAdmin())
      db.notices = db.notices.filter((n) => n.id !== id)
      save()
    },
    async listIncidents() {
      return clone([...db.incidents].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)))
    },
    async saveIncident(i) {
      need(isAdmin())
      const row: Incident = {
        id: i.id ?? uid(), code: i.code ?? '', title: i.title, location: i.location ?? '', grade: i.grade ?? 'C',
        status: i.status ?? 'open', body: i.body ?? null, occurred_at: i.occurred_at ?? now(),
      }
      const idx = db.incidents.findIndex((x) => x.id === row.id)
      if (idx >= 0) db.incidents[idx] = row
      else db.incidents.push(row)
      save()
    },
    async deleteIncident(id) {
      need(isAdmin())
      db.incidents = db.incidents.filter((x) => x.id !== id)
      db.entries = db.entries.filter((e) => e.incident_id !== id)
      for (const c of db.cases) if (c.incident_id === id) c.incident_id = null
      save()
    },
    async getIncident(id) {
      return clone(db.incidents.find((x) => x.id === id) ?? null)
    },

    async getPage(slug) {
      return clone(db.pages.find((p) => p.slug === slug) ?? null)
    },
    async savePage(p) {
      need(isAdmin())
      const row: SitePage = { ...p, updated_at: now() }
      const idx = db.pages.findIndex((x) => x.slug === p.slug)
      if (idx >= 0) db.pages[idx] = row
      else db.pages.push(row)
      save()
    },

    async listEntries(incidentId) {
      return clone(
        db.entries
          .filter((e) => e.incident_id === incidentId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((e) => ({ ...e, character: brief(e.character_id) })),
      )
    },
    async listAllEntries() {
      return clone(db.entries)
    },
    async joinIncident(incidentId, characterId, note) {
      need(isMember())
      const inc = db.incidents.find((x) => x.id === incidentId)
      need(!!ownApproved(characterId) && !!inc && inc.status !== 'closed')
      if (db.entries.some((e) => e.incident_id === incidentId && e.character_id === characterId)) throw new Error('이미 참여 신청한 등록증입니다.')
      db.entries.push({ id: uid(), incident_id: incidentId, character_id: characterId, owner_id: me()!, note: note.trim() || null, created_at: now() })
      save()
    },
    async leaveIncident(entryId) {
      const e = db.entries.find((x) => x.id === entryId)
      need(!!e && (e.owner_id === me() || isAdmin()))
      db.entries = db.entries.filter((x) => x.id !== entryId)
      save()
    },
    async listPostsByIncident(incidentId) {
      need(isMember())
      return clone(
        db.posts
          .filter((p) => p.incident_id === incidentId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((p) => ({ ...p, author_name: nameOf(p.author_id), character: brief(p.character_id) })),
      )
    },

    async listPublicCharacters() {
      return clone(db.characters.filter((c) => c.is_public && !c.locked && c.status === 'approved').sort((a, b) => a.created_at.localeCompare(b.created_at)))
    },
    async listMyCharacters() {
      return clone(db.characters.filter((c) => c.owner_id === me()))
    },
    async listAllCharacters() {
      need(isAdmin())
      return clone(db.characters.map((c) => ({ ...c, owner_name: nameOf(c.owner_id) })).sort((a, b) => b.created_at.localeCompare(a.created_at)))
    },
    async getCharacter(id) {
      const c = db.characters.find((x) => x.id === id)
      if (!c || !visible(c)) return null
      return clone({ ...c, owner_name: isMember() ? nameOf(c.owner_id) : undefined })
    },
    async saveCharacter(input) {
      need(isMember())
      await tick()
      const fields = {
        name: input.name.trim(), codename: input.codename?.trim() || null, kind: input.kind, grade: input.grade,
        affiliation: input.affiliation || null, details: input.details, is_public: input.is_public, avatar_url: input.avatar_url,
      }
      if (input.id) {
        const c = db.characters.find((x) => x.id === input.id)
        need(!!c && (c.owner_id === me() || isAdmin()))
        const contentKeys = ['name', 'codename', 'kind', 'grade', 'affiliation', 'avatar_url', 'details'] as const
        const changed = contentKeys.some((k) => JSON.stringify(c![k]) !== JSON.stringify(fields[k]))
        Object.assign(c!, fields, { updated_at: now() })
        if (changed && !isAdmin()) {
          c!.status = 'pending'
          c!.review_note = null
        }
        save()
        return c!.id
      }
      const order = ['recruiting', 'running', 'ready', 'closed']
      const cohort = [...db.cohorts].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.no - a.no)[0]
      const c: Character = {
        id: uid(), owner_id: me()!, ...fields, locked: false, status: isAdmin() ? 'approved' : 'pending', review_note: null, created_at: now(), updated_at: now(),
        team_id: null, team_role: null, cohort_no: cohort?.no ?? null,
      }
      db.characters.push(c)
      save()
      return c.id
    },
    async deleteCharacter(id) {
      const c = db.characters.find((x) => x.id === id)
      need(!!c && (c.owner_id === me() || isAdmin()))
      db.characters = db.characters.filter((x) => x.id !== id)
      db.relations = db.relations.filter((r) => r.from_character_id !== id && r.to_character_id !== id)
      delete db.secrets[id]
      for (const p of db.posts) if (p.character_id === id) p.character_id = null
      for (const p of db.comments) if (p.character_id === id) p.character_id = null
      db.anonPosts = db.anonPosts.filter((p) => p.character_id !== id)
      db.anonComments = db.anonComments.filter((p) => p.character_id !== id)
      db.findings = db.findings.filter((f) => f.character_id !== id)
      db.answers = db.answers.filter((a) => a.character_id !== id)
      db.entries = db.entries.filter((e) => e.character_id !== id)
      save()
    },
    async reviewCharacter(id, status, note) {
      need(isAdmin())
      const c = db.characters.find((x) => x.id === id)
      if (c) Object.assign(c, { status, review_note: note, updated_at: now() })
      save()
    },
    async setCharacterLock(id, locked) {
      need(isAdmin())
      const c = db.characters.find((x) => x.id === id)
      if (c) c.locked = locked
      save()
    },
    async assignCharacter(id, patch) {
      need(isAdmin())
      const c = db.characters.find((x) => x.id === id)
      if (c) Object.assign(c, patch)
      save()
    },
    async getSecret(characterId) {
      const c = db.characters.find((x) => x.id === characterId)
      if (!c || !(c.owner_id === me() || isAdmin())) return null
      return db.secrets[characterId] ?? null
    },
    async saveSecret(characterId, body) {
      const c = db.characters.find((x) => x.id === characterId)
      need(!!c && (c.owner_id === me() || isAdmin()))
      db.secrets[characterId] = body
      save()
    },
    async uploadAvatar(blob) {
      need(isMember())
      return await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.onerror = rej
        r.readAsDataURL(blob)
      })
    },

    // ── 기수 · 팀
    async listCohorts() {
      return clone([...db.cohorts].sort((a, b) => a.no - b.no))
    },
    async saveCohort(c) {
      need(isAdmin())
      const row: Cohort = { no: c.no, title: c.title.trim(), status: c.status, note: c.note?.trim() || null, created_at: db.cohorts.find((x) => x.no === c.no)?.created_at ?? now() }
      db.cohorts = [...db.cohorts.filter((x) => x.no !== c.no), row]
      save()
    },
    async deleteCohort(no) {
      need(isAdmin())
      db.cohorts = db.cohorts.filter((x) => x.no !== no)
      for (const c of db.characters) if (c.cohort_no === no) c.cohort_no = null
      save()
    },
    async listTeams() {
      return clone([...db.teams].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'ko')))
    },
    async saveTeam(t) {
      need(isAdmin())
      const prev = t.id ? db.teams.find((x) => x.id === t.id) : undefined
      const row: Team = {
        id: prev?.id ?? uid(), name: t.name.trim(), callsign: t.callsign?.trim() || null, color: t.color ?? '#f0c419',
        motto: t.motto?.trim() || null, description: t.description?.trim() || null, sort: t.sort ?? 0, created_at: prev?.created_at ?? now(),
      }
      db.teams = [...db.teams.filter((x) => x.id !== row.id), row]
      save()
    },
    async deleteTeam(id) {
      need(isAdmin())
      db.teams = db.teams.filter((x) => x.id !== id)
      for (const c of db.characters) if (c.team_id === id) c.team_id = null
      save()
    },

    // ── 편입 신청서
    async submitApplication(a) {
      await tick()
      const cohort = [...db.cohorts].filter((c) => c.status === 'recruiting').sort((x, y) => y.no - x.no)[0]
      if (!cohort) throw new Error('NOT_RECRUITING')
      if (!a.owner_nick.trim() || a.owner_nick.length > 40) throw new Error('INVALID_FORM')
      let receipt = ''
      do receipt = `${cohort.no}-${hex(6)}`
      while (db.applications.some((x) => x.receipt === receipt))
      const pin = hex(8)
      db.applications.push({
        id: uid(), receipt, pin, cohort_no: cohort.no, owner_nick: a.owner_nick.trim(), contact: a.contact.trim() || null, answers: a.answers,
        status: 'submitted', result_note: null, invite_id: null, created_at: now(), decided_at: null,
      })
      save()
      return { receipt, pin }
    },
    async checkApplication(receipt, pin) {
      await tick()
      const a = db.applications.find((x) => x.receipt === receipt.trim().toUpperCase() && x.pin === pin.trim().toUpperCase())
      if (!a) return null
      const inv = a.invite_id ? db.invites.find((i) => i.id === a.invite_id) : null
      return { status: a.status, result_note: a.result_note, invite_code: a.status === 'accepted' && inv && !inv.used_by ? inv.code : null, cohort_no: a.cohort_no, created_at: a.created_at }
    },
    async listApplications() {
      need(isAdmin())
      return clone(
        [...db.applications]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(({ pin: _pin, ...a }) => {
            const inv = a.invite_id ? db.invites.find((i) => i.id === a.invite_id) : null
            return { ...a, invite_code: inv?.code ?? null, invite_used: !!inv?.used_by }
          }),
      )
    },
    async decideApplication(id, accept, note) {
      need(isAdmin())
      const a = db.applications.find((x) => x.id === id)
      need(!!a)
      if (accept) {
        if (!a!.invite_id) {
          const inv = { id: uid(), code: randomCode(), note: `제${a!.cohort_no ?? '?'}기 합격 · ${a!.owner_nick}`, grant_admin: false, used_by: null, used_at: null, created_at: now(), created_by: me() }
          db.invites.push(inv)
          a!.invite_id = inv.id
        }
        Object.assign(a!, { status: 'accepted', result_note: note, decided_at: now() })
      } else {
        if (a!.invite_id) db.invites = db.invites.filter((i) => !(i.id === a!.invite_id && !i.used_by))
        Object.assign(a!, { status: 'rejected', result_note: note, invite_id: null, decided_at: now() })
      }
      save()
    },

    // ── 결속
    async listRelationsOf(characterId) {
      return clone(withBriefs(db.relations.filter((r) => r.status === 'accepted' && (r.from_character_id === characterId || r.to_character_id === characterId))))
    },
    async listAcceptedRelations() {
      return clone(withBriefs(db.relations.filter((r) => r.status === 'accepted')))
    },
    async listMyRelations() {
      const mine = new Set(db.characters.filter((c) => c.owner_id === me()).map((c) => c.id))
      return clone(withBriefs(db.relations.filter((r) => mine.has(r.from_character_id) || mine.has(r.to_character_id)).sort((a, b) => b.created_at.localeCompare(a.created_at))))
    },
    async requestRelation(fromId, toId, kind, description, options) {
      need(isMember())
      const from = db.characters.find((c) => c.id === fromId)
      const to = db.characters.find((c) => c.id === toId)
      need(!!from && from.owner_id === me() && !!to)
      if (fromId === toId) throw new Error('같은 등록증끼리는 결속할 수 없습니다.')
      if (db.relations.some((r) => r.from_character_id === fromId && r.to_character_id === toId)) throw new Error('duplicate key relations')
      db.relations.push({
        id: uid(), from_character_id: fromId, to_character_id: toId, kind, description: description.trim() || null,
        status: to!.owner_id === me() ? 'accepted' : 'requested', created_by: me()!, created_at: now(), options: options ?? {},
      })
      save()
    },
    async respondRelation(id, accept, allow) {
      const r = db.relations.find((x) => x.id === id)
      const to = r && db.characters.find((c) => c.id === r.to_character_id)
      need(!!to && (to.owner_id === me() || isAdmin()))
      if (accept) {
        r!.status = 'accepted'
        if (allow) r!.options = { ...(r!.options ?? {}), allow: (r!.options?.allow ?? []).filter((x) => allow.includes(x)) }
      } else db.relations = db.relations.filter((x) => x.id !== id)
      save()
    },
    async deleteRelation(id) {
      const r = db.relations.find((x) => x.id === id)
      const to = r && db.characters.find((c) => c.id === r.to_character_id)
      need(!!r && (r.created_by === me() || isAdmin() || to?.owner_id === me()))
      db.relations = db.relations.filter((x) => x.id !== id)
      save()
    },

    // ── 게시판
    async listPosts(category) {
      need(isMember())
      return clone(
        db.posts
          .filter((p) => !category || p.category === category)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((p) => ({ ...p, author_name: nameOf(p.author_id), character: brief(p.character_id), comment_count: db.comments.filter((c) => c.post_id === p.id).length })),
      )
    },
    async getPost(id) {
      need(isMember())
      const p = db.posts.find((x) => x.id === id)
      return p ? clone({ ...p, author_name: nameOf(p.author_id), character: brief(p.character_id) }) : null
    },
    async createPost(p) {
      need(isMember())
      if (p.character_id) need(db.characters.some((c) => c.id === p.character_id && c.owner_id === me()))
      const row: Post = { id: uid(), author_id: me()!, created_at: now(), ...p }
      db.posts.push(row)
      save()
      return row.id
    },
    async deletePost(id) {
      const p = db.posts.find((x) => x.id === id)
      need(!!p && (p.author_id === me() || isAdmin()))
      db.posts = db.posts.filter((x) => x.id !== id)
      db.comments = db.comments.filter((c) => c.post_id !== id)
      save()
    },
    async listComments(postId) {
      need(isMember())
      return clone(
        db.comments
          .filter((c) => c.post_id === postId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((c) => ({ ...c, author_name: nameOf(c.author_id), character: brief(c.character_id) })),
      )
    },
    async addComment(postId, body, characterId) {
      need(isMember())
      db.comments.push({ id: uid(), post_id: postId, author_id: me()!, character_id: characterId, body, created_at: now() })
      save()
    },
    async deleteComment(id) {
      const c = db.comments.find((x) => x.id === id)
      need(!!c && (c.author_id === me() || isAdmin()))
      db.comments = db.comments.filter((x) => x.id !== id)
      save()
    },

    // ── 대나무숲
    async listAnonPosts() {
      need(isMember())
      return clone(
        db.anonPosts
          .filter(anonVisible)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(
            (p): AnonPost => ({
              id: p.id, title: p.title, body: p.body.slice(0, 140), dept: deptOf(p), created_at: p.created_at,
              comment_count: db.anonComments.filter((c) => c.post_id === p.id && !c.hidden).length, is_mine: p.owner_id === me(), hidden: p.hidden,
            }),
          ),
      )
    },
    async getAnonPost(id) {
      need(isMember())
      const p = db.anonPosts.find((x) => x.id === id)
      if (!p || !anonVisible(p)) return null
      return clone({ id: p.id, title: p.title, body: p.body, dept: deptOf(p), created_at: p.created_at, comment_count: 0, is_mine: p.owner_id === me(), hidden: p.hidden })
    },
    async createAnonPost(p) {
      need(isMember() && !!ownApproved(p.character_id))
      const row: LAnonPost = { id: uid(), owner_id: me()!, character_id: p.character_id, reveal: p.reveal, title: p.title.trim(), body: p.body, hidden: false, created_at: now() }
      db.anonPosts.push(row)
      save()
      return row.id
    },
    async deleteAnonPost(id) {
      const p = db.anonPosts.find((x) => x.id === id)
      need(!!p && (p.owner_id === me() || isAdmin()))
      db.anonPosts = db.anonPosts.filter((x) => x.id !== id)
      db.anonComments = db.anonComments.filter((c) => c.post_id !== id)
      save()
    },
    async listAnonComments(postId) {
      need(isMember())
      const post = db.anonPosts.find((x) => x.id === postId)
      if (!post || !anonVisible(post)) return []
      const rows = db.anonComments.filter((c) => c.post_id === postId).sort((a, b) => a.created_at.localeCompare(b.created_at))
      const order: string[] = []
      for (const c of rows) if (c.character_id !== post.character_id && !order.includes(c.character_id)) order.push(c.character_id)
      return clone(
        rows.map(
          (c): AnonComment => ({
            id: c.id,
            alias: c.character_id === post.character_id ? '글쓴이' : `익명${order.indexOf(c.character_id) + 1}`,
            body: c.hidden && !isAdmin() ? '' : c.body,
            created_at: c.created_at,
            is_mine: c.owner_id === me(),
            hidden: c.hidden,
          }),
        ),
      )
    },
    async addAnonComment(postId, characterId, body) {
      const post = db.anonPosts.find((x) => x.id === postId)
      need(isMember() && !!ownApproved(characterId) && !!post && !post.hidden)
      db.anonComments.push({ id: uid(), post_id: postId, owner_id: me()!, character_id: characterId, body: body.trim(), hidden: false, created_at: now() })
      save()
    },
    async deleteAnonComment(id) {
      const c = db.anonComments.find((x) => x.id === id)
      need(!!c && (c.owner_id === me() || isAdmin()))
      db.anonComments = db.anonComments.filter((x) => x.id !== id)
      save()
    },
    async listAnonAdmin() {
      need(isAdmin())
      const titles = new Map(db.anonPosts.map((p) => [p.id, p.title]))
      const rows: AnonAdminRow[] = [
        ...db.anonPosts.map((p) => ({ kind: 'post' as const, id: p.id, post_id: p.id, title: p.title, body: p.body, hidden: p.hidden, created_at: p.created_at, character: anyBrief(p.character_id), owner_name: nameOf(p.owner_id) })),
        ...db.anonComments.map((c) => ({ kind: 'comment' as const, id: c.id, post_id: c.post_id, title: titles.get(c.post_id) ?? null, body: c.body, hidden: c.hidden, created_at: c.created_at, character: anyBrief(c.character_id), owner_name: nameOf(c.owner_id) })),
      ]
      return clone(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)))
    },
    async setAnonHidden(kind, id, hidden) {
      need(isAdmin())
      const row = kind === 'post' ? db.anonPosts.find((x) => x.id === id) : db.anonComments.find((x) => x.id === id)
      if (row) row.hidden = hidden
      save()
    },

    // ── 운영진 문의함
    async listMyInbox() {
      need(isMember())
      return clone(
        db.inbox
          .filter((i) => i.owner_id === me())
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(({ owner_id: _o, ...i }) => ({ ...i, sender: null })),
      )
    },
    async sendInbox(i) {
      need(isMember())
      db.inbox.push({ id: uid(), owner_id: me()!, category: i.category, title: i.title.trim(), body: i.body, anonymous: i.anonymous, sender: null, reply: null, replied_at: null, created_at: now() })
      save()
    },
    async deleteMyInbox(id) {
      const i = db.inbox.find((x) => x.id === id)
      need(!!i && i.owner_id === me())
      db.inbox = db.inbox.filter((x) => x.id !== id)
      save()
    },
    async listInboxAdmin() {
      need(isAdmin())
      return clone(
        [...db.inbox]
          .sort((a, b) => Number(!!a.reply) - Number(!!b.reply) || b.created_at.localeCompare(a.created_at))
          .map(({ owner_id, ...i }) => ({ ...i, sender: i.anonymous ? null : nameOf(owner_id) })),
      )
    },
    async replyInbox(id, reply) {
      need(isAdmin())
      const i = db.inbox.find((x) => x.id === id)
      if (i) Object.assign(i, { reply: reply.trim() || null, replied_at: reply.trim() ? now() : null })
      save()
    },
    async deleteInboxAdmin(id) {
      need(isAdmin())
      db.inbox = db.inbox.filter((x) => x.id !== id)
      save()
    },

    // ── 조사
    async listCases() {
      need(isMember())
      return clone([...db.cases].sort((a, b) => b.created_at.localeCompare(a.created_at)))
    },
    async getCase(id) {
      need(isMember())
      return clone(db.cases.find((c) => c.id === id) ?? null)
    },
    async listCaseTargets(caseId) {
      need(isMember())
      return clone(db.targets.filter((t) => t.case_id === caseId).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'ko')))
    },
    async investigate(caseId, targetId, approach, characterId) {
      need(isMember())
      await tick()
      const ch = ownApproved(characterId)
      need(!!ch)
      const cs = db.cases.find((c) => c.id === caseId)
      if (!cs || !db.targets.some((t) => t.id === targetId && t.case_id === caseId)) throw new Error('NOT_FOUND')
      if (cs.status !== 'open') throw new Error('CASE_CLOSED')
      if ((approach === 'sense' && ch!.kind !== 'sentinel') || (approach === 'psyche' && ch!.kind !== 'guide')) throw new Error('APPROACH_KIND')
      if (db.findings.some((f) => f.target_id === targetId && f.approach === approach && f.character_id === characterId)) throw new Error('ALREADY_INVESTIGATED')
      const clue = db.clues.find((c) => c.target_id === targetId && c.approach === approach)
      db.findings.push({ id: uid(), case_id: caseId, target_id: targetId, approach, clue_id: clue?.id ?? null, character_id: characterId, owner_id: me()!, created_at: now() })
      save()
      return { found: !!clue, body: clue?.body ?? null }
    },
    async listCaseFindings(caseId) {
      need(isMember())
      return clone(
        db.findings
          .filter((f) => f.case_id === caseId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((f) => {
            const ch = db.characters.find((c) => c.id === f.character_id)
            const clue = f.clue_id ? db.clues.find((c) => c.id === f.clue_id) : null
            return {
              id: f.id,
              target_id: f.target_id,
              target_name: db.targets.find((t) => t.id === f.target_id)?.name ?? '—',
              approach: f.approach,
              found: !!clue,
              clue: clue?.body ?? null,
              character_id: f.character_id,
              character_name: ch && visible(ch) ? ch.name : '비공개 요원',
              character_kind: ch?.kind ?? 'normal',
              team_name: db.teams.find((t) => t.id === ch?.team_id)?.name ?? null,
              created_at: f.created_at,
              is_mine: f.owner_id === me(),
            }
          }),
      )
    },
    async listCaseAnswers(caseId) {
      need(isMember())
      return clone(db.answers.filter((a) => a.case_id === caseId).map((a) => ({ character_id: a.character_id, choice: a.choice, is_mine: a.owner_id === me() })))
    },
    async answerCase(caseId, characterId, choice) {
      need(isMember() && !!ownApproved(characterId))
      const cs = db.cases.find((c) => c.id === caseId)
      if (!cs || cs.status !== 'open') throw new Error('CASE_CLOSED')
      db.answers = [...db.answers.filter((a) => !(a.case_id === caseId && a.character_id === characterId)), { case_id: caseId, character_id: characterId, owner_id: me()!, choice }]
      save()
    },
    async saveCase(c) {
      need(isAdmin())
      const prev = c.id ? db.cases.find((x) => x.id === c.id) : undefined
      const row: Case = {
        id: prev?.id ?? uid(), code: c.code.trim(), title: c.title.trim(), briefing: c.briefing ?? '', incident_id: c.incident_id || null,
        status: c.status ?? 'open', question: c.question?.trim() || null, choices: c.choices ?? [], answer: c.answer ?? null,
        conclusion: c.conclusion?.trim() || null, created_at: prev?.created_at ?? now(),
      }
      db.cases = [...db.cases.filter((x) => x.id !== row.id), row]
      save()
      return row.id
    },
    async deleteCase(id) {
      need(isAdmin())
      db.cases = db.cases.filter((x) => x.id !== id)
      const targetIds = new Set(db.targets.filter((t) => t.case_id === id).map((t) => t.id))
      db.targets = db.targets.filter((t) => t.case_id !== id)
      db.clues = db.clues.filter((c) => !targetIds.has(c.target_id))
      db.findings = db.findings.filter((f) => f.case_id !== id)
      db.answers = db.answers.filter((a) => a.case_id !== id)
      save()
    },
    async saveCaseTarget(t) {
      need(isAdmin())
      const prev = t.id ? db.targets.find((x) => x.id === t.id) : undefined
      const row: CaseTarget = { id: prev?.id ?? uid(), case_id: t.case_id, name: t.name.trim(), detail: t.detail?.trim() || null, sort: t.sort ?? 0 }
      db.targets = [...db.targets.filter((x) => x.id !== row.id), row]
      save()
    },
    async deleteCaseTarget(id) {
      need(isAdmin())
      db.targets = db.targets.filter((x) => x.id !== id)
      db.clues = db.clues.filter((c) => c.target_id !== id)
      db.findings = db.findings.filter((f) => f.target_id !== id)
      save()
    },
    async listCaseClues(caseId) {
      need(isAdmin())
      return clone(db.clues.filter((c) => c.case_id === caseId))
    },
    async saveCaseClue(c) {
      need(isAdmin())
      const rest = db.clues.filter((x) => !(x.target_id === c.target_id && x.approach === c.approach))
      const prev = db.clues.find((x) => x.target_id === c.target_id && x.approach === c.approach)
      db.clues = c.body.trim() ? [...rest, { id: prev?.id ?? uid(), case_id: c.case_id, target_id: c.target_id, approach: c.approach, body: c.body.trim() }] : rest
      if (!c.body.trim() && prev) for (const f of db.findings) if (f.clue_id === prev.id) f.clue_id = null
      save()
    },

    // ── 관리부
    async listInvites() {
      need(isAdmin())
      return clone(db.invites.map((i) => ({ ...i, used_by_name: i.used_by ? nameOf(i.used_by) : undefined })).sort((a, b) => b.created_at.localeCompare(a.created_at)))
    },
    async createInvite(note, grantAdmin) {
      need(isAdmin())
      const code = randomCode()
      db.invites.push({ id: uid(), code, note: note.trim() || null, grant_admin: grantAdmin, used_by: null, used_at: null, created_at: now(), created_by: me() })
      save()
      return code
    },
    async deleteInvite(id) {
      need(isAdmin())
      db.invites = db.invites.filter((i) => i.id !== id)
      save()
    },
    async listMembers() {
      need(isAdmin())
      return db.users
        .filter((u) => roleOf(u.id))
        .map((u) => ({ user_id: u.id, display_name: u.displayName, role: roleOf(u.id)!, created_at: u.created_at, character_count: db.characters.filter((c) => c.owner_id === u.id).length }))
    },
    async setMemberRole(userId, role) {
      need(isAdmin())
      if (userId === me() && role !== 'admin') throw new Error('CANNOT_DEMOTE_SELF')
      db.roles = db.roles.filter((r) => r.user_id !== userId)
      if (role !== 'none') db.roles.push({ user_id: userId, role, created_at: now() })
      save()
    },
  }
}
