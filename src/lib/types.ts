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
}

export type CharacterInput = Pick<Character, 'name' | 'codename' | 'kind' | 'grade' | 'affiliation' | 'details' | 'is_public' | 'avatar_url'> & { id?: string }

export interface Relation {
  id: string
  from_character_id: string
  to_character_id: string
  kind: string
  description: string | null
  status: 'requested' | 'accepted'
  created_by: string
  created_at: string
  from?: CharacterBrief | null
  to?: CharacterBrief | null
}

export interface Post {
  id: string
  author_id: string
  character_id: string | null
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

export interface Api {
  mode: 'local' | 'supabase'

  // 인증
  getSession(): Promise<Session | null>
  onAuthChange(cb: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(code: string, email: string, password: string, displayName: string): Promise<void>
  signOut(): Promise<void>
  updateDisplayName(name: string): Promise<void>

  // 설정·고시·균열
  getSettings(): Promise<Settings>
  updateSettings(s: Settings): Promise<void>
  listNotices(): Promise<Notice[]>
  getNotice(id: string): Promise<Notice | null>
  saveNotice(n: Partial<Notice> & { title: string; body: string }): Promise<void>
  deleteNotice(id: string): Promise<void>
  listIncidents(): Promise<Incident[]>
  saveIncident(i: Partial<Incident> & { title: string }): Promise<void>
  deleteIncident(id: string): Promise<void>

  // 등록증
  listPublicCharacters(): Promise<Character[]>
  listMyCharacters(): Promise<Character[]>
  listAllCharacters(): Promise<Character[]> // 관리부
  getCharacter(id: string): Promise<Character | null>
  saveCharacter(c: CharacterInput): Promise<string>
  deleteCharacter(id: string): Promise<void>
  reviewCharacter(id: string, status: CharStatus, note: string | null): Promise<void>
  setCharacterLock(id: string, locked: boolean): Promise<void>
  getSecret(characterId: string): Promise<string | null>
  saveSecret(characterId: string, body: string): Promise<void>
  uploadAvatar(blob: Blob): Promise<string>

  // 결속
  listRelationsOf(characterId: string): Promise<Relation[]>
  listAcceptedRelations(): Promise<Relation[]>
  listMyRelations(): Promise<Relation[]>
  requestRelation(fromId: string, toId: string, kind: string, description: string): Promise<void>
  respondRelation(id: string, accept: boolean): Promise<void>
  deleteRelation(id: string): Promise<void>

  // 게시판
  listPosts(category?: string): Promise<Post[]>
  getPost(id: string): Promise<Post | null>
  createPost(p: { category: string; title: string; body: string; character_id: string | null }): Promise<string>
  deletePost(id: string): Promise<void>
  listComments(postId: string): Promise<Comment[]>
  addComment(postId: string, body: string, characterId: string | null): Promise<void>
  deleteComment(id: string): Promise<void>

  // 관리부
  listInvites(): Promise<Invite[]>
  createInvite(note: string, grantAdmin: boolean): Promise<string>
  deleteInvite(id: string): Promise<void>
  listMembers(): Promise<Member[]>
  setMemberRole(userId: string, role: Role | 'none'): Promise<void>
}
