import type { Kind } from '../config/world'

export type Role = 'admin' | 'member'
export type CharStatus = 'pending' | 'approved' | 'rejected'

export interface Session {
  userId: string
  email: string
  displayName: string
  role: Role | null // null = 초대 코드 없이 생긴 계정(권한 없음)
}

export interface CharacterBrief {
  id: string
  name: string
  codename: string | null
  kind: Kind
  grade: string
  avatar_url: string | null
}

export interface Character extends CharacterBrief {
  owner_id: string
  affiliation: string | null
  details: Record<string, string>
  is_public: boolean
  locked: boolean
  status: CharStatus
  review_note: string | null
  created_at: string
  updated_at: string
  owner_name?: string
  team_id?: string | null
  team_role?: string | null
  cohort_no?: number | null
}

export type CharacterInput = Pick<Character, 'name' | 'codename' | 'kind' | 'grade' | 'affiliation' | 'details' | 'is_public' | 'avatar_url'> & { id?: string }

/** 선택형 결속 조율: 허용한 전개와 관계 온도 */
export interface RelationOptions {
  allow?: string[]
  temp?: string
}

export interface Relation {
  id: string
  from_character_id: string
  to_character_id: string
  kind: string
  description: string | null
  status: 'requested' | 'accepted'
  created_by: string
  created_at: string
  options?: RelationOptions
  from?: CharacterBrief | null
  to?: CharacterBrief | null
}

export interface SitePage {
  slug: string
  title: string
  body: string
  updated_at: string
}

export interface IncidentEntry {
  id: string
  incident_id: string
  character_id: string
  owner_id: string
  note: string | null
  created_at: string
  character?: CharacterBrief | null
}

export interface Post {
  id: string
  author_id: string
  character_id: string | null
  incident_id?: string | null
  category: string
  title: string
  body: string
  created_at: string
  author_name?: string
  character?: CharacterBrief | null
  comment_count?: number
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  character_id: string | null
  body: string
  created_at: string
  author_name?: string
  character?: CharacterBrief | null
}

export interface Notice {
  id: string
  doc_no: number
  title: string
  body: string
  level: 'normal' | 'warning' | 'critical'
  pinned: boolean
  created_at: string
}

export interface Incident {
  id: string
  code: string
  title: string
  location: string
  grade: string
  status: 'open' | 'responding' | 'closed'
  body: string | null
  occurred_at: string
}

export interface Settings {
  alert_level: number
  alert_message: string | null
  updated_at?: string | null
}

export interface Invite {
  id: string
  code: string
  note: string | null
  grant_admin: boolean
  used_by: string | null
  used_at: string | null
  created_at: string
  used_by_name?: string
}

export interface Member {
  user_id: string
  display_name: string
  role: Role
  created_at: string
  character_count?: number
}

// ── 기수 · 팀
export type CohortStatus = 'ready' | 'recruiting' | 'running' | 'closed'

export interface Cohort {
  no: number
  title: string
  status: CohortStatus
  note: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  callsign: string | null
  color: string
  motto: string | null
  description: string | null
  sort: number
  created_at: string
}

// ── 편입 신청서
export type ApplicationAnswers = Record<string, string | string[]>

export interface Application {
  id: string
  receipt: string
  cohort_no: number | null
  owner_nick: string
  contact: string | null
  answers: ApplicationAnswers
  status: 'submitted' | 'accepted' | 'rejected'
  result_note: string | null
  invite_code: string | null
  invite_used: boolean
  created_at: string
  decided_at: string | null
}

export interface ApplicationCheck {
  status: Application['status']
  result_note: string | null
  invite_code: string | null
  cohort_no: number | null
  created_at: string
}

// ── 대나무숲
export type Reveal = 'none' | 'dept' | 'team'

export interface AnonPost {
  id: string
  title: string
  body: string
  dept: string | null
  created_at: string
  comment_count: number
  is_mine: boolean
  hidden: boolean
}

export interface AnonComment {
  id: string
  alias: string
  body: string
  created_at: string
  is_mine: boolean
  hidden: boolean
}

/** 관리부 전용: 작성자까지 보이는 대나무숲 기록 */
export interface AnonAdminRow {
  kind: 'post' | 'comment'
  id: string
  post_id: string
  title: string | null
  body: string
  hidden: boolean
  created_at: string
  character: CharacterBrief | null
  owner_name: string
}

// ── 운영진 문의함
export type InboxCategory = 'question' | 'suggestion' | 'report' | 'investigate' | 'break' | 'etc'

export interface InboxItem {
  id: string
  category: InboxCategory
  title: string
  body: string
  anonymous: boolean
  sender: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
}

// ── 조사
export type Approach = 'sense' | 'psyche' | 'records' | 'interview' | 'search'

export interface Case {
  id: string
  code: string
  title: string
  briefing: string
  incident_id: string | null
  status: 'open' | 'closed'
  question: string | null
  choices: string[]
  answer: number | null
  conclusion: string | null
  created_at: string
}

export interface CaseTarget {
  id: string
  case_id: string
  name: string
  detail: string | null
  sort: number
}

export interface CaseClue {
  id: string
  case_id: string
  target_id: string
  approach: Approach
  body: string
}

export interface CaseFinding {
  id: string
  target_id: string
  target_name: string
  approach: Approach
  found: boolean
  clue: string | null
  character_id: string
  character_name: string
  character_kind: string
  team_name: string | null
  created_at: string
  is_mine: boolean
}

export interface CaseAnswer {
  character_id: string
  choice: number
  is_mine: boolean
}

export interface Api {
  mode: 'local' | 'supabase'

  // 인증
  getSession(): Promise<Session | null>
  onAuthChange(cb: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(code: string, email: string, password: string, displayName: string): Promise<void>
  signOut(): Promise<void>
  updateDisplayName(name: string): Promise<void>

  // 설정·고시·게이트
  getSettings(): Promise<Settings>
  updateSettings(s: Settings): Promise<void>
  listNotices(): Promise<Notice[]>
  getNotice(id: string): Promise<Notice | null>
  saveNotice(n: Partial<Notice> & { title: string; body: string }): Promise<void>
  deleteNotice(id: string): Promise<void>
  listIncidents(): Promise<Incident[]>
  getIncident(id: string): Promise<Incident | null>
  saveIncident(i: Partial<Incident> & { title: string }): Promise<void>
  deleteIncident(id: string): Promise<void>

  // 고정 문서 (협회 규정 · 커뮤 안내)
  getPage(slug: string): Promise<SitePage | null>
  savePage(p: { slug: string; title: string; body: string }): Promise<void>

  // 게이트 참여
  listEntries(incidentId: string): Promise<IncidentEntry[]>
  listAllEntries(): Promise<IncidentEntry[]>
  joinIncident(incidentId: string, characterId: string, note: string): Promise<void>
  leaveIncident(entryId: string): Promise<void>
  listPostsByIncident(incidentId: string): Promise<Post[]>

  // 등록증
  listPublicCharacters(): Promise<Character[]>
  listMyCharacters(): Promise<Character[]>
  listAllCharacters(): Promise<Character[]> // 관리부
  getCharacter(id: string): Promise<Character | null>
  saveCharacter(c: CharacterInput): Promise<string>
  deleteCharacter(id: string): Promise<void>
  reviewCharacter(id: string, status: CharStatus, note: string | null): Promise<void>
  setCharacterLock(id: string, locked: boolean): Promise<void>
  assignCharacter(id: string, patch: { team_id?: string | null; team_role?: string | null; cohort_no?: number | null }): Promise<void> // 관리부
  getSecret(characterId: string): Promise<string | null>
  saveSecret(characterId: string, body: string): Promise<void>
  uploadAvatar(blob: Blob): Promise<string>

  // 기수 · 팀
  listCohorts(): Promise<Cohort[]>
  saveCohort(c: { no: number; title: string; status: CohortStatus; note: string | null }): Promise<void>
  deleteCohort(no: number): Promise<void>
  listTeams(): Promise<Team[]>
  saveTeam(t: Partial<Team> & { name: string }): Promise<void>
  deleteTeam(id: string): Promise<void>

  // 편입 신청서 (계정 없이)
  submitApplication(a: { owner_nick: string; contact: string; answers: ApplicationAnswers }): Promise<{ receipt: string; pin: string }>
  checkApplication(receipt: string, pin: string): Promise<ApplicationCheck | null>
  listApplications(): Promise<Application[]> // 관리부
  decideApplication(id: string, accept: boolean, note: string | null): Promise<void> // 관리부

  // 결속 (선택형 조율)
  listRelationsOf(characterId: string): Promise<Relation[]>
  listAcceptedRelations(): Promise<Relation[]>
  listMyRelations(): Promise<Relation[]>
  requestRelation(fromId: string, toId: string, kind: string, description: string, options?: RelationOptions): Promise<void>
  respondRelation(id: string, accept: boolean, allow?: string[]): Promise<void>
  deleteRelation(id: string): Promise<void>

  // 게시판
  listPosts(category?: string): Promise<Post[]>
  getPost(id: string): Promise<Post | null>
  createPost(p: { category: string; title: string; body: string; character_id: string | null; incident_id?: string | null }): Promise<string>
  deletePost(id: string): Promise<void>
  listComments(postId: string): Promise<Comment[]>
  addComment(postId: string, body: string, characterId: string | null): Promise<void>
  deleteComment(id: string): Promise<void>

  // 대나무숲 (캐입 익명 게시판)
  listAnonPosts(): Promise<AnonPost[]>
  getAnonPost(id: string): Promise<AnonPost | null>
  createAnonPost(p: { character_id: string; reveal: Reveal; title: string; body: string }): Promise<string>
  deleteAnonPost(id: string): Promise<void>
  listAnonComments(postId: string): Promise<AnonComment[]>
  addAnonComment(postId: string, characterId: string, body: string): Promise<void>
  deleteAnonComment(id: string): Promise<void>
  listAnonAdmin(): Promise<AnonAdminRow[]> // 관리부
  setAnonHidden(kind: 'post' | 'comment', id: string, hidden: boolean): Promise<void> // 관리부

  // 운영진 문의함
  listMyInbox(): Promise<InboxItem[]>
  sendInbox(i: { category: InboxCategory; title: string; body: string; anonymous: boolean }): Promise<void>
  deleteMyInbox(id: string): Promise<void>
  listInboxAdmin(): Promise<InboxItem[]> // 관리부
  replyInbox(id: string, reply: string): Promise<void> // 관리부
  deleteInboxAdmin(id: string): Promise<void> // 관리부

  // 조사
  listCases(): Promise<Case[]>
  getCase(id: string): Promise<Case | null>
  listCaseTargets(caseId: string): Promise<CaseTarget[]>
  investigate(caseId: string, targetId: string, approach: Approach, characterId: string): Promise<{ found: boolean; body: string | null }>
  listCaseFindings(caseId: string): Promise<CaseFinding[]>
  listCaseAnswers(caseId: string): Promise<CaseAnswer[]>
  answerCase(caseId: string, characterId: string, choice: number): Promise<void>
  saveCase(c: Partial<Case> & { code: string; title: string }): Promise<string> // 관리부
  deleteCase(id: string): Promise<void> // 관리부
  saveCaseTarget(t: Partial<CaseTarget> & { case_id: string; name: string }): Promise<void> // 관리부
  deleteCaseTarget(id: string): Promise<void> // 관리부
  listCaseClues(caseId: string): Promise<CaseClue[]> // 관리부
  saveCaseClue(c: { case_id: string; target_id: string; approach: Approach; body: string }): Promise<void> // 관리부 (본문이 비면 삭제)

  // 관리부
  listInvites(): Promise<Invite[]>
  createInvite(note: string, grantAdmin: boolean): Promise<string>
  deleteInvite(id: string): Promise<void>
  listMembers(): Promise<Member[]>
  setMemberRole(userId: string, role: Role | 'none'): Promise<void>
}
