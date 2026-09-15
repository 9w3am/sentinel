import { createClient } from '@supabase/supabase-js'
import type {
  AnonAdminRow,
  AnonComment,
  AnonPost,
  Api,
  Application,
  Case,
  CaseAnswer,
  CaseClue,
  CaseFinding,
  CaseTarget,
  Character,
  CharacterBrief,
  Cohort,
  Comment,
  Incident,
  IncidentEntry,
  InboxItem,
  Invite,
  Member,
  Notice,
  Post,
  Relation,
  Role,
  Session,
  Settings,
  SitePage,
  Team,
} from './types'
import { randomCode, uid } from './util'

const BRIEF = 'id,name,codename,kind,grade,avatar_url'

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function must<T = any>(r: { data?: unknown; error: unknown }): T {
    if (r.error) throw r.error
    return r.data as T
  }

  // 마이그레이션(002 · 003) 전이면 테이블 · 컬럼 · 함수가 없다 → 조용히 빈 값으로 처리
  const missing = (e: unknown) => {
    const code = (e as { code?: string } | null)?.code
    return code === 'PGRST205' || code === 'PGRST204' || code === 'PGRST202' || code === '42P01' || code === '42703' || code === '42883'
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function orEmpty<T = any>(r: { data?: unknown; error: unknown }, empty: T): T {
    if (r.error) {
      if (missing(r.error)) return empty
      throw r.error
    }
    return (r.data ?? empty) as T
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

    // ── 설정·고시·게이트
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
    async getIncident(id) {
      return must(await sb.from('incidents').select('*').eq('id', id).maybeSingle()) as Incident | null
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

    // ── 고정 문서
    async getPage(slug) {
      return orEmpty(await sb.from('site_pages').select('*').eq('slug', slug).maybeSingle(), null) as SitePage | null
    },
    async savePage(p) {
      must(await sb.from('site_pages').upsert({ ...p, updated_at: new Date().toISOString() }))
    },

    // ── 게이트 참여
    async listEntries(incidentId) {
      const rows = orEmpty(await sb.from('incident_entries').select('*').eq('incident_id', incidentId).order('created_at'), []) as IncidentEntry[]
      const briefs = await briefMap(rows.map((r) => r.character_id))
      return rows.map((r) => ({ ...r, character: briefs.get(r.character_id) ?? null }))
    },
    async listAllEntries() {
      return orEmpty(await sb.from('incident_entries').select('*').order('created_at', { ascending: false }).limit(2000), []) as IncidentEntry[]
    },
    async joinIncident(incidentId, characterId, note) {
      const me = await requireUid()
      must(await sb.from('incident_entries').insert({ incident_id: incidentId, character_id: characterId, note: note.trim() || null, owner_id: me }))
    },
    async leaveIncident(entryId) {
      must(await sb.from('incident_entries').delete().eq('id', entryId))
    },
    async listPostsByIncident(incidentId) {
      const rows = orEmpty(await sb.from('posts').select('*').eq('incident_id', incidentId).order('created_at', { ascending: false }), []) as Post[]
      return withAuthors(rows)
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
    async assignCharacter(id, patch) {
      must(await sb.from('characters').update(patch).eq('id', id))
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

    // ── 기수 · 팀
    async listCohorts() {
      return orEmpty(await sb.from('cohorts').select('*').order('no'), []) as Cohort[]
    },
    async saveCohort(c) {
      must(await sb.from('cohorts').upsert({ no: c.no, title: c.title.trim(), status: c.status, note: c.note?.trim() || null }))
    },
    async deleteCohort(no) {
      must(await sb.from('cohorts').delete().eq('no', no))
    },
    async listTeams() {
      return orEmpty(await sb.from('teams').select('*').order('sort').order('name'), []) as Team[]
    },
    async saveTeam(t) {
      const row = {
        name: t.name.trim(),
        callsign: t.callsign?.trim() || null,
        color: t.color ?? '#f0c419',
        motto: t.motto?.trim() || null,
        description: t.description?.trim() || null,
        sort: t.sort ?? 0,
      }
      if (t.id) must(await sb.from('teams').update(row).eq('id', t.id))
      else must(await sb.from('teams').insert(row))
    },
    async deleteTeam(id) {
      must(await sb.from('teams').delete().eq('id', id))
    },

    // ── 편입 신청서
    async submitApplication(a) {
      const rows = must(await sb.rpc('submit_application', { p_nick: a.owner_nick, p_contact: a.contact, p_answers: a.answers })) as { out_receipt: string; out_pin: string }[]
      if (!rows?.[0]) throw new Error('접수하지 못했습니다. 잠시 뒤 다시 시도해 주세요.')
      return { receipt: rows[0].out_receipt, pin: rows[0].out_pin }
    },
    async checkApplication(receipt, pin) {
      const rows = must(await sb.rpc('check_application', { p_receipt: receipt, p_pin: pin })) as {
        out_status: Application['status']
        out_note: string | null
        out_invite: string | null
        out_cohort: number | null
        out_created: string
      }[]
      const r = rows?.[0]
      return r ? { status: r.out_status, result_note: r.out_note, invite_code: r.out_invite, cohort_no: r.out_cohort, created_at: r.out_created } : null
    },
    async listApplications() {
      const rows = orEmpty(await sb.from('applications').select('*, invites(code, used_by)').order('created_at', { ascending: false }), []) as (Application & {
        invites: { code: string; used_by: string | null } | null
      })[]
      return rows.map(({ invites, ...a }) => ({ ...a, invite_code: invites?.code ?? null, invite_used: !!invites?.used_by }))
    },
    async decideApplication(id, accept, note) {
      const app = must(await sb.from('applications').select('owner_nick,cohort_no,invite_id').eq('id', id).single()) as { owner_nick: string; cohort_no: number | null; invite_id: string | null }
      const decided_at = new Date().toISOString()
      if (accept) {
        let inviteId = app.invite_id
        if (!inviteId) {
          const me = await requireUid()
          const inv = must(
            await sb
              .from('invites')
              .insert({ code: randomCode(), note: `제${app.cohort_no ?? '?'}기 합격 · ${app.owner_nick}`, grant_admin: false, created_by: me })
              .select('id')
              .single(),
          )
          inviteId = inv.id as string
        }
        must(await sb.from('applications').update({ status: 'accepted', result_note: note, invite_id: inviteId, decided_at }).eq('id', id))
      } else {
        if (app.invite_id) await sb.from('invites').delete().eq('id', app.invite_id).is('used_by', null)
        must(await sb.from('applications').update({ status: 'rejected', result_note: note, invite_id: null, decided_at }).eq('id', id))
      }
    },

    // ── 결속 (선택형 조율)
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
    async requestRelation(fromId, toId, kind, description, options) {
      const me = await requireUid()
      const base = { from_character_id: fromId, to_character_id: toId, kind, description: description.trim() || null, created_by: me }
      const first = await sb.from('relations').insert((options ? { ...base, options } : base) as Record<string, unknown>)
      if (first.error && options && missing(first.error)) must(await sb.from('relations').insert(base))
      else must(first)
    },
    async respondRelation(id, accept, allow) {
      if (allow) {
        const r = await sb.rpc('respond_relation_opts', { p_id: id, p_accept: accept, p_allow: allow })
        if (!r.error) return
        if (!missing(r.error)) throw r.error
      }
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
      const { incident_id, ...rest } = p
      const payload = incident_id ? { ...rest, incident_id, author_id: me } : { ...rest, author_id: me }
      const row = must(await sb.from('posts').insert(payload).select('id').single())
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

    // ── 대나무숲
    async listAnonPosts() {
      const rows = orEmpty(await sb.rpc('list_anon_posts'), []) as {
        out_id: string
        out_title: string
        out_preview: string
        out_dept: string | null
        out_created: string
        out_comments: number
        out_mine: boolean
        out_hidden: boolean
      }[]
      return rows.map(
        (r): AnonPost => ({
          id: r.out_id,
          title: r.out_title,
          body: r.out_preview,
          dept: r.out_dept,
          created_at: r.out_created,
          comment_count: r.out_comments,
          is_mine: r.out_mine,
          hidden: r.out_hidden,
        }),
      )
    },
    async getAnonPost(id) {
      const rows = orEmpty(await sb.rpc('get_anon_post', { p_id: id }), []) as {
        out_id: string
        out_title: string
        out_body: string
        out_dept: string | null
        out_created: string
        out_mine: boolean
        out_hidden: boolean
      }[]
      const r = rows[0]
      return r ? { id: r.out_id, title: r.out_title, body: r.out_body, dept: r.out_dept, created_at: r.out_created, comment_count: 0, is_mine: r.out_mine, hidden: r.out_hidden } : null
    },
    async createAnonPost(p) {
      const me = await requireUid()
      const row = must(await sb.from('anon_posts').insert({ ...p, title: p.title.trim(), owner_id: me }).select('id').single())
      return row.id as string
    },
    async deleteAnonPost(id) {
      must(await sb.from('anon_posts').delete().eq('id', id))
    },
    async listAnonComments(postId) {
      const rows = orEmpty(await sb.rpc('list_anon_comments', { p_post: postId }), []) as {
        out_id: string
        out_alias: string
        out_body: string
        out_created: string
        out_mine: boolean
        out_hidden: boolean
      }[]
      return rows.map((r): AnonComment => ({ id: r.out_id, alias: r.out_alias, body: r.out_body, created_at: r.out_created, is_mine: r.out_mine, hidden: r.out_hidden }))
    },
    async addAnonComment(postId, characterId, body) {
      const me = await requireUid()
      must(await sb.from('anon_comments').insert({ post_id: postId, character_id: characterId, body: body.trim(), owner_id: me }))
    },
    async deleteAnonComment(id) {
      must(await sb.from('anon_comments').delete().eq('id', id))
    },
    async listAnonAdmin() {
      const posts = orEmpty(await sb.from('anon_posts').select('*').order('created_at', { ascending: false }).limit(300), []) as {
        id: string
        owner_id: string
        character_id: string
        title: string
        body: string
        hidden: boolean
        created_at: string
      }[]
      const comments = orEmpty(await sb.from('anon_comments').select('*').order('created_at', { ascending: false }).limit(600), []) as {
        id: string
        post_id: string
        owner_id: string
        character_id: string
        body: string
        hidden: boolean
        created_at: string
      }[]
      const all = [...posts, ...comments]
      const [names, briefs] = await Promise.all([nameMap(all.map((r) => r.owner_id)), briefMap(all.map((r) => r.character_id))])
      const titles = new Map(posts.map((p) => [p.id, p.title]))
      const rows: AnonAdminRow[] = [
        ...posts.map((p) => ({ kind: 'post' as const, id: p.id, post_id: p.id, title: p.title, body: p.body, hidden: p.hidden, created_at: p.created_at, character: briefs.get(p.character_id) ?? null, owner_name: names.get(p.owner_id) ?? '요원' })),
        ...comments.map((c) => ({ kind: 'comment' as const, id: c.id, post_id: c.post_id, title: titles.get(c.post_id) ?? null, body: c.body, hidden: c.hidden, created_at: c.created_at, character: briefs.get(c.character_id) ?? null, owner_name: names.get(c.owner_id) ?? '요원' })),
      ]
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
    async setAnonHidden(kind, id, hidden) {
      must(await sb.from(kind === 'post' ? 'anon_posts' : 'anon_comments').update({ hidden }).eq('id', id))
    },

    // ── 운영진 문의함
    async listMyInbox() {
      const rows = orEmpty(await sb.from('inbox').select('*').order('created_at', { ascending: false }), []) as InboxItem[]
      return rows.map((r) => ({ ...r, sender: null }))
    },
    async sendInbox(i) {
      const me = await requireUid()
      must(await sb.from('inbox').insert({ ...i, title: i.title.trim(), owner_id: me }))
    },
    async deleteMyInbox(id) {
      must(await sb.from('inbox').delete().eq('id', id))
    },
    async listInboxAdmin() {
      const rows = orEmpty(await sb.rpc('list_inbox_admin'), []) as {
        out_id: string
        out_category: InboxItem['category']
        out_title: string
        out_body: string
        out_anonymous: boolean
        out_sender: string | null
        out_reply: string | null
        out_replied: string | null
        out_created: string
      }[]
      return rows.map(
        (r): InboxItem => ({
          id: r.out_id,
          category: r.out_category,
          title: r.out_title,
          body: r.out_body,
          anonymous: r.out_anonymous,
          sender: r.out_sender,
          reply: r.out_reply,
          replied_at: r.out_replied,
          created_at: r.out_created,
        }),
      )
    },
    async replyInbox(id, reply) {
      must(await sb.rpc('reply_inbox', { p_id: id, p_reply: reply }))
    },
    async deleteInboxAdmin(id) {
      must(await sb.rpc('delete_inbox_admin', { p_id: id }))
    },

    // ── 조사
    async listCases() {
      return orEmpty(await sb.from('cases').select('*').order('created_at', { ascending: false }), []) as Case[]
    },
    async getCase(id) {
      return orEmpty(await sb.from('cases').select('*').eq('id', id).maybeSingle(), null) as Case | null
    },
    async listCaseTargets(caseId) {
      return orEmpty(await sb.from('case_targets').select('*').eq('case_id', caseId).order('sort').order('name'), []) as CaseTarget[]
    },
    async investigate(caseId, targetId, approach, characterId) {
      const rows = must(await sb.rpc('investigate', { p_case: caseId, p_target: targetId, p_approach: approach, p_character: characterId })) as { out_found: boolean; out_body: string | null }[]
      return { found: !!rows?.[0]?.out_found, body: rows?.[0]?.out_body ?? null }
    },
    async listCaseFindings(caseId) {
      const rows = orEmpty(await sb.rpc('list_case_findings', { p_case: caseId }), []) as {
        out_id: string
        out_target: string
        out_target_name: string
        out_approach: CaseFinding['approach']
        out_found: boolean
        out_clue: string | null
        out_character: string
        out_character_name: string
        out_character_kind: string
        out_team: string | null
        out_created: string
        out_mine: boolean
      }[]
      return rows.map(
        (r): CaseFinding => ({
          id: r.out_id,
          target_id: r.out_target,
          target_name: r.out_target_name,
          approach: r.out_approach,
          found: r.out_found,
          clue: r.out_clue,
          character_id: r.out_character,
          character_name: r.out_character_name,
          character_kind: r.out_character_kind,
          team_name: r.out_team,
          created_at: r.out_created,
          is_mine: r.out_mine,
        }),
      )
    },
    async listCaseAnswers(caseId) {
      const me = await currentUid()
      const rows = orEmpty(await sb.from('case_answers').select('character_id,choice,owner_id').eq('case_id', caseId), []) as { character_id: string; choice: number; owner_id: string }[]
      return rows.map((r): CaseAnswer => ({ character_id: r.character_id, choice: r.choice, is_mine: r.owner_id === me }))
    },
    async answerCase(caseId, characterId, choice) {
      const me = await requireUid()
      must(await sb.from('case_answers').upsert({ case_id: caseId, character_id: characterId, choice, owner_id: me }, { onConflict: 'case_id,character_id' }))
    },
    async saveCase(c) {
      const row = {
        code: c.code.trim(),
        title: c.title.trim(),
        briefing: c.briefing ?? '',
        incident_id: c.incident_id || null,
        status: c.status ?? 'open',
        question: c.question?.trim() || null,
        choices: c.choices ?? [],
        answer: c.answer ?? null,
        conclusion: c.conclusion?.trim() || null,
      }
      if (c.id) {
        must(await sb.from('cases').update(row).eq('id', c.id))
        return c.id
      }
      const created = must(await sb.from('cases').insert(row).select('id').single())
      return created.id as string
    },
    async deleteCase(id) {
      must(await sb.from('cases').delete().eq('id', id))
    },
    async saveCaseTarget(t) {
      const row = { case_id: t.case_id, name: t.name.trim(), detail: t.detail?.trim() || null, sort: t.sort ?? 0 }
      if (t.id) must(await sb.from('case_targets').update(row).eq('id', t.id))
      else must(await sb.from('case_targets').insert(row))
    },
    async deleteCaseTarget(id) {
      must(await sb.from('case_targets').delete().eq('id', id))
    },
    async listCaseClues(caseId) {
      return orEmpty(await sb.from('case_clues').select('*').eq('case_id', caseId), []) as CaseClue[]
    },
    async saveCaseClue(c) {
      if (!c.body.trim()) {
        must(await sb.from('case_clues').delete().eq('target_id', c.target_id).eq('approach', c.approach))
        return
      }
      must(await sb.from('case_clues').upsert({ case_id: c.case_id, target_id: c.target_id, approach: c.approach, body: c.body.trim() }, { onConflict: 'target_id,approach' }))
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
