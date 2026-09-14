// Supabase 가 연결되지 않았을 때 쓰는 시연용 백엔드.
// 데이터는 이 브라우저의 localStorage 에만 저장된다. 권한 규칙은 schema.sql 과 같게 흉내 낸다.
import type { Api, Character, CharacterBrief, Comment, Incident, IncidentEntry, Invite, Notice, Post, Relation, Role, Session, Settings, SitePage } from './types'
import { randomCode, uid } from './util'

interface LUser {
  id: string
  email: string
  pw: string
  displayName: string
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
  session: string | null
  docSeq: number
}

const KEY = 'sa-local-db-v2'
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
    ...c,
  })
  return {
    users: [],
    roles: [],
    // 시연 모드 전용 번호. 실제 Supabase DB의 번호와는 무관하다.
    invites: [{ id: uid(), code: 'DEMO-ADMIN', note: '시연용 운영자 계정', grant_admin: true, used_by: null, used_at: null, created_at: now(), created_by: null }],
    characters: [
      mk('c-test1', { name: '테스트1', kind: 'sentinel', grade: 'S', affiliation: '본부 · 대응국' }, 300),
      mk('c-test2', { name: '테스트2', kind: 'guide', grade: 'A', affiliation: '본부 · 가이딩센터' }, 280),
      mk('c-test3', { name: '테스트3', kind: 'sentinel', grade: 'B', affiliation: '제1지부' }, 100),
    ],
    secrets: {},
    relations: [{ id: uid(), from_character_id: 'c-test1', to_character_id: 'c-test2', kind: '전담 페어', description: null, status: 'accepted', created_by: npc, created_at: ago(200) }],
    posts: [],
    comments: [],
    pages: [],
    entries: [],
    notices: [
      { id: uid(), doc_no: 1, title: '경보 2단계 발령 및 출입 통제 안내', body: '경보 2단계(주의)를 발령합니다.\n\n1. B급 이상 요원은 소속 지부에서 대기합니다.\n2. 활성 게이트 반경 500m 안쪽은 비각성자 출입을 통제합니다.\n3. 해제 시각은 상황실 판단에 따라 따로 알립니다.', level: 'warning', pinned: true, created_at: ago(1) },
      { id: uid(), doc_no: 2, title: '하반기 정기 등급 재측정 일정', body: '등록 요원 전원을 대상으로 하반기 정기 등급 재측정을 실시합니다.\n\n일정은 소속별로 따로 안내합니다.', level: 'normal', pinned: false, created_at: ago(50) },
      { id: uid(), doc_no: 3, title: '신규 가이드 등록 접수 (상시)', body: '가이드 발현이 확인된 분은 편입 절차를 거쳐 등록증을 신청하십시오.', level: 'normal', pinned: false, created_at: ago(98) },
      { id: uid(), doc_no: 4, title: '결속 신고서 양식 변경 안내', body: '결속 신고는 집무실의 결속 관계 메뉴에서만 받습니다. 기존 양식은 사용할 수 없습니다.', level: 'normal', pinned: false, created_at: ago(260) },
    ],
    incidents: [
      { id: uid(), code: 'G-0917', title: 'A급 게이트 개방', location: '구역 07', grade: 'A', status: 'responding', body: '대응 1조 투입. 반경 500m 통제.', occurred_at: ago(2) },
      { id: uid(), code: 'G-0916', title: 'C급 게이트 반응', location: '구역 12', grade: 'C', status: 'open', body: '출입 통제 중.', occurred_at: ago(5.4) },
      { id: uid(), code: 'G-0915', title: 'D급 감응 관측', location: '구역 03', grade: 'D', status: 'open', body: '개방 여부 확인 중.', occurred_at: ago(9.9) },
      { id: uid(), code: 'G-0914', title: 'B급 게이트 봉쇄', location: '구역 21', grade: 'B', status: 'closed', body: '봉쇄 완료.', occurred_at: ago(26) },
      { id: uid(), code: 'G-0913', title: 'E급 게이트 소멸', location: '구역 16', grade: 'E', status: 'closed', body: '자연 소멸 확인.', occurred_at: ago(31) },
    ],
    settings: { alert_level: 2, alert_message: 'B급 이상 요원은 대기 상태를 유지하십시오. 활성 게이트 반경 500m 안쪽은 비각성자 출입이 통제됩니다.', updated_at: ago(1) },
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
  // 이전 버전에 저장된 시연 데이터에는 새 항목이 없다
  db.pages ??= []
  db.entries ??= []
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
  const withBriefs = (rs: Relation[]) => rs.map((r) => ({ ...r, from: brief(r.from_character_id), to: brief(r.to_character_id) }))
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
  const emit = () => listeners.forEach((l) => setTimeout(l, 0))
  const tick = () => new Promise((r) => setTimeout(r, 60))

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
    async joinIncident(incidentId, characterId, note) {
      need(isMember())
      const c = db.characters.find((x) => x.id === characterId)
      const inc = db.incidents.find((x) => x.id === incidentId)
      need(!!c && c.owner_id === me() && c.status === 'approved' && !!inc && inc.status !== 'closed')
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
      const c: Character = {
        id: uid(), owner_id: me()!, ...fields, locked: false, status: isAdmin() ? 'approved' : 'pending', review_note: null, created_at: now(), updated_at: now(),
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
    async requestRelation(fromId, toId, kind, description) {
      need(isMember())
      const from = db.characters.find((c) => c.id === fromId)
      const to = db.characters.find((c) => c.id === toId)
      need(!!from && from.owner_id === me() && !!to)
      if (fromId === toId) throw new Error('같은 등록증끼리는 결속할 수 없습니다.')
      if (db.relations.some((r) => r.from_character_id === fromId && r.to_character_id === toId)) throw new Error('duplicate key relations')
      db.relations.push({
        id: uid(), from_character_id: fromId, to_character_id: toId, kind, description: description.trim() || null,
        status: to!.owner_id === me() ? 'accepted' : 'requested', created_by: me()!, created_at: now(),
      })
      save()
    },
    async respondRelation(id, accept) {
      const r = db.relations.find((x) => x.id === id)
      const to = r && db.characters.find((c) => c.id === r.to_character_id)
      need(!!to && (to.owner_id === me() || isAdmin()))
      if (accept) r!.status = 'accepted'
      else db.relations = db.relations.filter((x) => x.id !== id)
      save()
    },
    async deleteRelation(id) {
      const r = db.relations.find((x) => x.id === id)
      const to = r && db.characters.find((c) => c.id === r.to_character_id)
      need(!!r && (r.created_by === me() || isAdmin() || to?.owner_id === me()))
      db.relations = db.relations.filter((x) => x.id !== id)
      save()
    },

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
