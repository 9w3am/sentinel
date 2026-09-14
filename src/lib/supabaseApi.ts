import { createClient } from '@supabase/supabase-js'
import type { Api, Character, CharacterBrief, Comment, Invite, Member, Notice, Post, Relation, Role, Session, Settings } from './types'
import { randomCode, uid } from './util'

const BRIEF = 'id,name,codename,kind,grade,avatar_url'

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function must<T = any>(r: { data?: unknown; error: unknown }): T {
    if (r.error) throw r.error
    return r.data as T
  }

  async function currentUid() {
    const { data } = await sb.auth.getSession()
    return data.session?.user.id ?? null
  }
  async function requireUid() {
    const id = await currentUid()
    if (!id) throw new Error('로그인이 필요합니다.')
    return id
  }

  async function nameMap(ids: (string | null | undefined)[]) {
    const uniq = [...new Set(ids.filter(Boolean))] as string[]
    const map = new Map<string, string>()
    if (!uniq.length) return map
    const { data } = await sb.from('profiles').select('id,display_name').in('id', uniq)
    for (const p of data ?? []) map.set(p.id, p.display_name)
    return map
  }

  async function briefMap(ids: (string | null | undefined)[]) {
    const uniq = [...new Set(ids.filter(Boolean))] as string[]
    const map = new Map<string, CharacterBrief>()
    if (!uniq.length) return map
    const { data } = await sb.from('characters').select(BRIEF).in('id', uniq)
    for (const c of (data ?? []) as CharacterBrief[]) map.set(c.id, c)
    return map
  }

  async function withBriefs(rels: Relation[]) {
    const m = await briefMap(rels.flatMap((r) => [r.from_character_id, r.to_character_id]))
    return rels.map((r) => ({ ...r, from: m.get(r.from_character_id) ?? null, to: m.get(r.to_character_id) ?? null }))
  }

  async function withAuthors<T extends { author_id: string; character_id: string | null }>(rows: T[]) {
    const [names, briefs] = await Promise.all([nameMap(rows.map((r) => r.author_id)), briefMap(rows.map((r) => r.character_id))])
    return rows.map((r) => ({
      ...r,
      author_name: names.get(r.author_id) ?? '요원',
      character: r.character_id ? briefs.get(r.character_id) ?? null : null,
    }))
  }

  return {
    mode: 'supabase',

    async getSession(): Promise<Session | null> {
      const { data } = await sb.auth.getSession()
      const user = data.session?.user
      if (!user) return null
      const [prof, roles] = await Promise.all([
        sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
        sb.from('user_roles').select('role').eq('user_id', user.id),
      ])
      const rs = (roles.data ?? []).map((r) => r.role as Role)
      return {
        userId: user.id,
        email: user.email ?? '',
        displayName: prof.data?.display_name ?? (user.user_metadata?.display_name as string) ?? '요원',
        role: rs.includes('admin') ? 'admin' : rs.includes('member') ? 'member' : null,
      }
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'TOKEN_REFRESHED') return
        // 콜백 안에서 곧바로 supabase 호출하면 교착될 수 있어 한 틱 미룬다
        setTimeout(cb, 0)
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      must(await sb.auth.signInWithPassword({ email: email.trim(), password }))
    },

    async signUp(code, email, password, displayName) {
      const ok = must(await sb.rpc('check_invite', { p_code: code }))
      if (!ok) throw new Error('INVALID_INVITE')
      const res = must(
        await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { invite_code: code.trim().toUpperCase(), display_name: displayName.trim() } },
        }),
      )
      if (!res.session) {
        throw new Error('계정은 발급되었으나 이메일 확인이 필요한 상태입니다. 관리부에 "Confirm email 해제"를 요청할 것.')
      }
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async updateDisplayName(name) {
      const id = await requireUid()
      must(await sb.from('profiles').update({ display_name: name.trim() }).eq('id', id))
    },

    // ── 설정·고시·균열
    async getSettings(): Promise<Settings> {
      const { data } = await sb.from('site_settings').select('alert_level,alert_message,updated_at').eq('id', 1).maybeSingle()
      return data ?? { alert_level: 1, alert_message: null }
    },
    async updateSettings(s) {
      must(await sb.from('site_settings').upsert({ id: 1, ...s, updated_at: new Date().toISOString() }))
    },
    async listNotices() {
      return must(await sb.from('notices').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })) as Notice[]
    },
    async getNotice(id) {
      return must(await sb.from('notices').select('*').eq('id', id).maybeSingle()) as Notice | null
    },
    async saveNotice(n) {
      const row = { title: n.title, body: n.body, level: n.level ?? 'normal', pinned: n.pinned ?? false }
      if (n.id) must(await sb.from('notices').update(row).eq('id', n.id))
      else must(await sb.from('notices').insert(row))
    },
    async deleteNotice(id) {
      must(await sb.from('notices').delete().eq('id', id))
    },
    async listIncidents() {
      return must(await sb.from('incidents').select('*').order('occurred_at', { ascending: false }))
    },
    async saveIncident(i) {
      const row = {
        code: i.code ?? '',
        title: i.title,
        location: i.location ?? '',
        grade: i.grade ?? 'C',
        status: i.status ?? 'open',
        body: i.body ?? null,
        occurred_at: i.occurred_at ?? new Date().toISOString(),
      }
      if (i.id) must(await sb.from('incidents').update(row).eq('id', i.id))
      else must(await sb.from('incidents').insert(row))
    },
    async deleteIncident(id) {
      must(await sb.from('incidents').delete().eq('id', id))
    },

    // ── 등록증
    async listPublicCharacters() {
      return must(
        await sb.from('characters').select('*').eq('is_public', true).eq('locked', false).eq('status', 'approved').order('created_at'),
      ) as Character[]
    },
    async listMyCharacters() {
      const id = await currentUid()
      if (!id) return []
      return must(await sb.from('characters').select('*').eq('owner_id', id).order('created_at')) as Character[]
    },
    async listAllCharacters() {
      const rows = must(await sb.from('characters').select('*').order('created_at', { ascending: false })) as Character[]
      const names = await nameMap(rows.map((r) => r.owner_id))
      return rows.map((r) => ({ ...r, owner_name: names.get(r.owner_id) }))
    },
    async getCharacter(id) {
      const row = must(await sb.from('characters').select('*').eq('id', id).maybeSingle()) as Character | null
      if (!row) return null
      const names = await nameMap([row.owner_id])
      return { ...row, owner_name: names.get(row.owner_id) }
    },
    async saveCharacter(c) {
      const row = {
        name: c.name.trim(),
        codename: c.codename?.trim() || null,
        kind: c.kind,
        grade: c.grade,
        affiliation: c.affiliation || null,
        details: c.details,
        is_public: c.is_public,
        avatar_url: c.avatar_url,
      }
      if (c.id) {
        must(await sb.from('characters').update(row).eq('id', c.id))
        return c.id
      }
      const owner = await requireUid()
      const created = must(await sb.from('characters').insert({ ...row, owner_id: owner }).select('id').single())
      return created.id as string
    },
    async deleteCharacter(id) {
      must(await sb.from('characters').delete().eq('id', id))
    },
    async reviewCharacter(id, status, note) {
      must(await sb.from('characters').update({ status, review_note: note }).eq('id', id))
    },
    async setCharacterLock(id, locked) {
      must(await sb.from('characters').update({ locked }).eq('id', id))
    },
    async getSecret(characterId) {
      const { data } = await sb.from('character_secrets').select('body').eq('character_id', characterId).maybeSingle()
      return data?.body ?? null
    },
    async saveSecret(characterId, body) {
      must(await sb.from('character_secrets').upsert({ character_id: characterId, body, updated_at: new Date().toISOString() }))
    },
    async uploadAvatar(blob) {
      const owner = await requireUid()
      const path = `${owner}/${uid()}.jpg`
      must(await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }))
      return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
    },

    // ── 결속
    async listRelationsOf(characterId) {
      const rows = must(
        await sb
          .from('relations')
          .select('*')
          .eq('status', 'accepted')
          .or(`from_character_id.eq.${characterId},to_character_id.eq.${characterId}`)
          .order('created_at'),
      ) as Relation[]
      return withBriefs(rows)
    },
    async listAcceptedRelations() {
      return withBriefs(must(await sb.from('relations').select('*').eq('status', 'accepted')) as Relation[])
    },
    async listMyRelations() {
      const id = await currentUid()
      if (!id) return []
      const mine = must(await sb.from('characters').select('id').eq('owner_id', id)) as { id: string }[]
      if (!mine.length) return []
      const ids = mine.map((m) => m.id).join(',')
      const rows = must(
        await sb
          .from('relations')
          .select('*')
          .or(`from_character_id.in.(${ids}),to_character_id.in.(${ids})`)
          .order('created_at', { ascending: false }),
      ) as Relation[]
      return withBriefs(rows)
    },
    async requestRelation(fromId, toId, kind, description) {
      const me = await requireUid()
      must(
        await sb.from('relations').insert({
          from_character_id: fromId,
          to_character_id: toId,
          kind,
          description: description.trim() || null,
          created_by: me,
        }),
      )
    },
    async respondRelation(id, accept) {
      must(await sb.rpc('respond_relation', { p_id: id, p_accept: accept }))
    },
    async deleteRelation(id) {
      must(await sb.from('relations').delete().eq('id', id))
    },

    // ── 게시판
    async listPosts(category) {
      let q = sb.from('posts').select('*, comments(count)').order('created_at', { ascending: false }).limit(200)
      if (category) q = q.eq('category', category)
      const rows = must(await q) as (Post & { comments: { count: number }[] })[]
      const withA = await withAuthors(rows)
      return withA.map(({ comments, ...p }) => ({ ...p, comment_count: comments?.[0]?.count ?? 0 }))
    },
    async getPost(id) {
      const row = must(await sb.from('posts').select('*').eq('id', id).maybeSingle()) as Post | null
      if (!row) return null
      return (await withAuthors([row]))[0]
    },
    async createPost(p) {
      const me = await requireUid()
      const row = must(await sb.from('posts').insert({ ...p, author_id: me }).select('id').single())
      return row.id as string
    },
    async deletePost(id) {
      must(await sb.from('posts').delete().eq('id', id))
    },
    async listComments(postId) {
      const rows = must(await sb.from('comments').select('*').eq('post_id', postId).order('created_at')) as Comment[]
      return withAuthors(rows)
    },
    async addComment(postId, body, characterId) {
      const me = await requireUid()
      must(await sb.from('comments').insert({ post_id: postId, body, character_id: characterId, author_id: me }))
    },
    async deleteComment(id) {
      must(await sb.from('comments').delete().eq('id', id))
    },

    // ── 관리부
    async listInvites() {
      const rows = must(await sb.from('invites').select('*').order('created_at', { ascending: false })) as Invite[]
      const names = await nameMap(rows.map((r) => r.used_by))
      return rows.map((r) => ({ ...r, used_by_name: r.used_by ? names.get(r.used_by) : undefined }))
    },
    async createInvite(note, grantAdmin) {
      const me = await requireUid()
      const code = randomCode()
      must(await sb.from('invites').insert({ code, note: note.trim() || null, grant_admin: grantAdmin, created_by: me }))
      return code
    },
    async deleteInvite(id) {
      must(await sb.from('invites').delete().eq('id', id))
    },
    async listMembers(): Promise<Member[]> {
      const [roles, profiles, chars] = await Promise.all([
        sb.from('user_roles').select('user_id,role,created_at'),
        sb.from('profiles').select('id,display_name,created_at'),
        sb.from('characters').select('owner_id'),
      ])
      const byUser = new Map<string, Member>()
      for (const r of roles.data ?? []) {
        const prev = byUser.get(r.user_id)
        if (prev && prev.role === 'admin') continue
        byUser.set(r.user_id, { user_id: r.user_id, role: r.role as Role, display_name: '요원', created_at: r.created_at })
      }
      for (const p of profiles.data ?? []) {
        const m = byUser.get(p.id)
        if (m) {
          m.display_name = p.display_name
          m.created_at = p.created_at
        }
      }
      const counts = new Map<string, number>()
      for (const c of chars.data ?? []) counts.set(c.owner_id, (counts.get(c.owner_id) ?? 0) + 1)
      return [...byUser.values()]
        .map((m) => ({ ...m, character_count: counts.get(m.user_id) ?? 0 }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    },
    async setMemberRole(userId, role) {
      must(await sb.rpc('set_member_role', { p_user: userId, p_role: role }))
    },
  }
}
