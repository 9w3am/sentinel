import { Fragment, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CharacterCard } from '../../components/CharacterCard'
import { useSiteContext } from '../../components/Layout'
import { AlertSegments, Empty, ErrorBox, GradeBadge, Icon, Loading, Pill, StatusPill, Tabs, alertColor, copyText, cx } from '../../components/ui'
import { ALERT_LEVELS, DEFAULT_RULES, GRADE_VALUES, INCIDENT_STATUS, incidentStatusLabel } from '../../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../../lib/backend'
import type { Incident, Notice, Role } from '../../lib/types'
import { docNumber, errMsg, fmtDate } from '../../lib/util'
import { Applications, BambooAdmin, CasesAdmin, CohortsTeams, GuideEditor, InboxAdmin } from './AdminCommunity'

type Tab = 'apply' | 'invites' | 'review' | 'roster' | 'teams' | 'members' | 'cases' | 'bamboo' | 'inbox' | 'notices' | 'incidents' | 'alert' | 'rules' | 'guide'

export default function Admin() {
  usePageMeta('관리부 콘솔')
  const { session } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'apply')
  const isAdmin = session?.role === 'admin'
  const chars = useAsync(() => (isAdmin ? api.listAllCharacters() : Promise.resolve([])), [isAdmin])
  const apps = useAsync(() => (isAdmin ? api.listApplications() : Promise.resolve([])), [isAdmin, tab])
  const inbox = useAsync(() => (isAdmin ? api.listInboxAdmin() : Promise.resolve([])), [isAdmin, tab])

  if (!isAdmin)
    return (
      <Empty title="관리부 권한이 없습니다">관리부 계정만 볼 수 있는 화면입니다.</Empty>
    )

  const pendingCount = (chars.data ?? []).filter((c) => c.status === 'pending').length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-3">
        <div>
          <p className="text-[13px] text-muted-foreground">운영자 전용</p>
          <h2 className="title-serif text-[30px] font-bold">관리부 콘솔</h2>
        </div>
        <p className="max-w-md text-[13px] text-muted-foreground">편입 신청 심사부터 등록증 · 팀 배치 · 조사 · 대나무숲 · 문의 · 공지 · 게이트 · 안내 문서까지 관리합니다.</p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'apply', label: '편입 신청', count: (apps.data ?? []).filter((a) => a.status === 'submitted').length },
          { value: 'invites', label: '인가 번호' },
          { value: 'review', label: '등록 심사', count: pendingCount },
          { value: 'roster', label: '명부 관리', count: chars.data?.length },
          { value: 'teams', label: '기수 · 팀' },
          { value: 'members', label: '요원 권한' },
          { value: 'cases', label: '조사' },
          { value: 'bamboo', label: '대나무숲' },
          { value: 'inbox', label: '문의함', count: (inbox.data ?? []).filter((i) => !i.reply).length },
          { value: 'notices', label: '알림마당' },
          { value: 'incidents', label: '게이트 기록' },
          { value: 'alert', label: '경보 단계' },
          { value: 'rules', label: '파수국 규정' },
          { value: 'guide', label: '안내 문서' },
        ]}
      />
      <div className="pt-8">
        {tab === 'apply' && <Applications />}
        {tab === 'invites' && <Invites />}
        {tab === 'review' && <Review chars={chars} />}
        {tab === 'roster' && <Roster chars={chars} />}
        {tab === 'teams' && <CohortsTeams />}
        {tab === 'members' && <Members />}
        {tab === 'cases' && <CasesAdmin />}
        {tab === 'bamboo' && <BambooAdmin />}
        {tab === 'inbox' && <InboxAdmin />}
        {tab === 'notices' && <Notices />}
        {tab === 'incidents' && <Incidents />}
        {tab === 'alert' && <AlertLevel />}
        {tab === 'rules' && <RulesEditor />}
        {tab === 'guide' && <GuideEditor />}
      </div>
    </div>
  )
}

type CharsState = ReturnType<typeof useAsync<Awaited<ReturnType<typeof api.listAllCharacters>>>>

// ── 편입 인가 번호
function Invites() {
  const invites = useAsync(() => api.listInvites(), [])
  const [note, setNote] = useState('')
  const [grantAdmin, setGrantAdmin] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [err, setErr] = useState<unknown>(null)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    try {
      const code = await api.createInvite(note, grantAdmin)
      setFresh(code)
      setNote('')
      setGrantAdmin(false)
      invites.reload()
    } catch (e) {
      setErr(e)
    }
  }
  const copy = async (code: string) => {
    if (await copyText(code)) {
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  const list = invites.data ?? []
  return (
    <div className="grid gap-10 lg:grid-cols-[360px_1fr] lg:items-start">
      <form onSubmit={create} className="doc-frame space-y-4 p-5">
        <p className="title-serif text-[20px] font-bold">번호 발급</p>
        <p className="-mt-2 text-[13px] text-muted-foreground">한 사람에 하나. 가입에 쓰이면 자동으로 사라집니다.</p>
        <div>
          <label className="form-label" htmlFor="inv-note">
            발급 메모
          </label>
          <input id="inv-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: @트위터아이디 / 2기 합격자" maxLength={100} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-[var(--seal)]" checked={grantAdmin} onChange={(e) => setGrantAdmin(e.target.checked)} />
          관리부 권한 부여 <span className="text-[12px] text-muted-foreground">(공동 운영자)</span>
        </label>
        {err ? <ErrorBox error={err} /> : null}
        <button type="submit" className="btn btn-primary w-full">
          번호 발급
        </button>
        {fresh && (
          <div className="border-2 border-seal bg-card p-4 text-center">
            <p className="label-mono">발급 완료</p>
            <p className="mt-1 select-all font-mono text-[22px] font-semibold tracking-[0.08em]">{fresh}</p>
            <button type="button" className="btn btn-sm mt-2" onClick={() => copy(fresh)}>
              {copied === fresh ? '복사됨' : '복사'}
            </button>
          </div>
        )}
      </form>

      <div className="min-w-0">
        <p className="label-mono mb-3">
          발급 {list.length} · 미사용 {list.filter((i) => !i.used_by).length}
        </p>
        {invites.loading && <Loading />}
        <div className="doc-frame overflow-x-auto">
          <table className="table-doc min-w-[620px]">
            <thead>
              <tr>
                <th>번호</th>
                <th>메모</th>
                <th>권한</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className={cx(i.used_by && 'text-muted-foreground')}>
                  <td>
                    <button type="button" onClick={() => copy(i.code)} className={cx('font-mono text-[13.5px] tracking-wide hover:text-seal', i.used_by && 'line-through')} title="복사">
                      {i.code}
                    </button>
                    {copied === i.code && <span className="ml-2 text-[11px] text-ok">복사됨</span>}
                  </td>
                  <td className="text-[13.5px]">{i.note || '—'}</td>
                  <td>{i.grant_admin ? <Pill tone="seal">관리부</Pill> : <Pill>정회원</Pill>}</td>
                  <td className="text-[13px]">
                    {i.used_by ? (
                      <>
                        <span className="font-medium text-foreground">{i.used_by_name ?? '사용됨'}</span>
                        <span className="block font-mono text-[11px]">{i.used_at && fmtDate(i.used_at, true)}</span>
                      </>
                    ) : (
                      <Pill tone="ok">미사용</Pill>
                    )}
                  </td>
                  <td className="text-right">
                    {!i.used_by && (
                      <button
                        type="button"
                        className="label-mono hover:text-seal"
                        onClick={async () => {
                          if (!confirm(`${i.code} 번호를 폐기할까요?`)) return
                          await api.deleteInvite(i.id).catch((e) => alert(errMsg(e)))
                          invites.reload()
                        }}
                      >
                        폐기
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── 등록 심사
function Review({ chars }: { chars: CharsState }) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const pending = (chars.data ?? []).filter((c) => c.status === 'pending')

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    const note = notes[id]?.trim() || null
    if (status === 'rejected' && !note && !confirm('반려 사유 없이 반려할까요?')) return
    try {
      await api.reviewCharacter(id, status, note)
      chars.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  if (chars.loading) return <Loading />
  if (pending.length === 0) return <Empty title="심사를 기다리는 등록증이 없습니다" />

  return (
    <ul className="space-y-6">
      {pending.map((c) => (
        <li key={c.id} className="grid gap-4 border-b border-rule pb-6 md:grid-cols-[340px_1fr]">
          <CharacterCard c={c} />
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
              <StatusPill status={c.status} />
              <span className="text-muted-foreground">관리인</span>
              <strong>{c.owner_name ?? '—'}</strong>
              <span className="font-mono text-[12px] text-muted-foreground">{fmtDate(c.updated_at, true)} 제출</span>
              {!c.is_public && <Pill>명부 비공개 희망</Pill>}
            </div>
            <div className="doc-frame-soft max-h-40 overflow-y-auto p-3 text-[13.5px] leading-relaxed text-muted-foreground">
              {['ability', 'personality', 'background', 'appearance']
                .filter((k) => c.details?.[k])
                .map((k) => (
                  <p key={k} className="line-clamp-3">
                    {c.details[k]}
                  </p>
                ))}
              {!['ability', 'personality', 'background', 'appearance'].some((k) => c.details?.[k]) && '기록 사항 미기재'}
            </div>
            <input className="field" placeholder="심사 의견 (반려 시 사유) — 관리인에게 표시된다" value={notes[c.id] ?? ''} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-seal" onClick={() => decide(c.id, 'approved')}>
                승인 · 등록필 날인
              </button>
              <button type="button" className="btn" onClick={() => decide(c.id, 'rejected')}>
                반려
              </button>
              <Link to={`/registry/${c.id}`} className="btn btn-ghost ml-auto">
                전체 열람 <Icon.arrow />
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── 명부 관리
function Roster({ chars }: { chars: CharsState }) {
  const [q, setQ] = useState('')
  const list = (chars.data ?? []).filter((c) => !q || [c.name, c.codename, c.owner_name].some((v) => v?.includes(q)))
  const run = async (fn: () => Promise<void>, msg?: string) => {
    if (msg && !confirm(msg)) return
    try {
      await fn()
      chars.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }
  return (
    <div>
      <input className="field mb-4 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="성명·코드네임·관리인 검색" />
      {chars.loading && <Loading />}
      <div className="doc-frame overflow-x-auto">
        <table className="table-doc min-w-[760px]">
          <thead>
            <tr>
              <th>등급</th>
              <th>성명</th>
              <th>관리인</th>
              <th>상태</th>
              <th>공개</th>
              <th className="text-right">조치</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <GradeBadge grade={c.grade} size="sm" />
                </td>
                <td>
                  <Link to={`/registry/${c.id}`} className="font-serif text-[16px] font-bold hover:text-seal">
                    {c.name}
                  </Link>
                  {c.codename && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">“{c.codename}”</span>}
                </td>
                <td className="text-[13.5px]">{c.owner_name ?? '—'}</td>
                <td>
                  <StatusPill status={c.status} />
                </td>
                <td className="text-[13px]">
                  {c.locked ? (
                    <Pill tone="seal">
                      <Icon.lock /> 강제 비공개
                    </Pill>
                  ) : c.is_public ? (
                    '공개'
                  ) : (
                    <span className="text-muted-foreground">본인 비공개</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-right">
                  <select
                    className="field inline-block w-auto py-1 text-[13px]"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'approve') run(() => api.reviewCharacter(c.id, 'approved', null))
                      if (v === 'pending') run(() => api.reviewCharacter(c.id, 'pending', null))
                      if (v === 'lock') run(() => api.setCharacterLock(c.id, true))
                      if (v === 'unlock') run(() => api.setCharacterLock(c.id, false))
                      if (v === 'delete') run(() => api.deleteCharacter(c.id), `'${c.name}' 등록증을 삭제할까요? 되돌릴 수 없습니다.`)
                    }}
                  >
                    <option value="">조치 선택</option>
                    {c.status !== 'approved' && <option value="approve">승인</option>}
                    {c.status !== 'pending' && <option value="pending">재심사로 돌림</option>}
                    {c.locked ? <option value="unlock">비공개 조치 해제</option> : <option value="lock">강제 비공개</option>}
                    <option value="delete">말소(삭제)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {chars.data && list.length === 0 && <p className="py-10 text-center text-muted-foreground">등록증이 없습니다.</p>}
      </div>
    </div>
  )
}

// ── 요원 권한
function Members() {
  const { session } = useAuth()
  const members = useAsync(() => api.listMembers(), [])
  const setRole = async (userId: string, role: Role | 'none', name: string) => {
    const label = role === 'admin' ? '관리부' : role === 'member' ? '정회원' : '자격 정지'
    if (!confirm(`${name} 요원의 권한을 '${label}'(으)로 바꿀까요?`)) return
    try {
      await api.setMemberRole(userId, role)
      members.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }
  if (members.loading) return <Loading />
  if (members.error) return <ErrorBox error={members.error} />
  return (
    <div>
      <p className="mb-4 text-[13.5px] text-muted-foreground">자격 정지된 계정은 로그인은 되지만 집무실과 게시판을 쓸 수 없고, 이 목록에서도 사라집니다. 되살리려면 새 편입 인가 번호를 발급해 주세요.</p>
      <div className="doc-frame overflow-x-auto">
        <table className="table-doc min-w-[560px]">
          <thead>
            <tr>
              <th>요원 호칭</th>
              <th>등록증</th>
              <th>편입일</th>
              <th>권한</th>
            </tr>
          </thead>
          <tbody>
            {(members.data ?? []).map((m) => (
              <tr key={m.user_id}>
                <td className="font-medium">
                  {m.display_name}
                  {m.user_id === session?.userId && <span className="ml-2 text-[12px] text-muted-foreground">(본인)</span>}
                </td>
                <td className="font-mono text-[13px]">{m.character_count}건</td>
                <td className="font-mono text-[13px]">{fmtDate(m.created_at)}</td>
                <td>
                  <select className="field w-auto py-1 text-[13.5px]" value={m.role} disabled={m.user_id === session?.userId} onChange={(e) => setRole(m.user_id, e.target.value as Role | 'none', m.display_name)}>
                    <option value="member">정회원</option>
                    <option value="admin">관리부</option>
                    <option value="none">자격 정지</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 고시 관리
function Notices() {
  const notices = useAsync(() => api.listNotices(), [])
  const blank = { title: '', body: '', level: 'normal' as Notice['level'], pinned: false }
  const [form, setForm] = useState<Partial<Notice> & typeof blank>(blank)
  const [err, setErr] = useState<unknown>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    try {
      await api.saveNotice(form)
      setForm(blank)
      notices.reload()
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
      <form onSubmit={save} className="doc-frame space-y-4 p-5">
        <p className="title-serif text-[20px] font-bold">{form.id ? '알림 수정' : '알림 등록'}</p>
        <div>
          <label className="form-label" htmlFor="n-title">
            제목
          </label>
          <input id="n-title" className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={120} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="form-label">구분</span>
            <select className="field w-auto" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Notice['level'] })}>
              <option value="normal">일반</option>
              <option value="warning">경보</option>
              <option value="critical">긴급</option>
            </select>
          </div>
          <label className="mt-5 flex items-center gap-2 text-[14px]">
            <input type="checkbox" className="h-4 w-4" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            상단 고정
          </label>
        </div>
        <div>
          <label className="form-label" htmlFor="n-body">
            본문
          </label>
          <textarea id="n-body" className="field min-h-56" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
          <p className="mt-1 text-[12.5px] text-muted-foreground">이미지 주소(.png .jpg .gif .webp)만 한 줄에 적으면 그림으로, 다른 주소는 링크로 보입니다.</p>
        </div>
        {err ? <ErrorBox error={err} /> : null}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            {form.id ? '수정 저장' : '발행'}
          </button>
          {form.id && (
            <button type="button" className="btn" onClick={() => setForm(blank)}>
              취소
            </button>
          )}
        </div>
      </form>
      <ul className="doc-frame divide-y divide-rule">
        {(notices.data ?? []).map((n) => (
          <li key={n.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-muted-foreground">
                {docNumber(n.doc_no, n.created_at)} · {fmtDate(n.created_at)}
              </p>
              <p className="flex items-center gap-1.5 truncate text-[15px]">
                {n.pinned && <Pill tone="primary" solid>고정</Pill>}
                {n.level !== 'normal' && <Pill tone={n.level === 'critical' ? 'danger' : 'seal'} solid>{n.level === 'critical' ? '긴급' : '경보'}</Pill>}
                <span className="truncate">{n.title}</span>
              </p>
            </div>
            <button type="button" className="label-mono hover:text-foreground" onClick={() => setForm({ id: n.id, title: n.title, body: n.body, level: n.level, pinned: n.pinned })}>
              수정
            </button>
            <button
              type="button"
              className="label-mono hover:text-seal"
              onClick={async () => {
                if (!confirm('이 알림을 삭제할까요?')) return
                await api.deleteNotice(n.id).catch((e) => alert(errMsg(e)))
                notices.reload()
              }}
            >
              폐기
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 균열 현황
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function Incidents() {
  const incidents = useAsync(() => api.listIncidents(), [])
  const blank = (): Partial<Incident> & { title: string } => ({ code: `G-${String(Math.floor(Math.random() * 9000) + 1000)}`, title: '', location: '', grade: 'C', status: 'open', body: '', occurred_at: new Date().toISOString() })
  const [form, setForm] = useState(blank)
  const [err, setErr] = useState<unknown>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    try {
      await api.saveIncident(form)
      setForm(blank())
      incidents.reload()
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:items-start">
      <form onSubmit={save} className="doc-frame space-y-3 p-5">
        <p className="title-serif text-[20px] font-bold">{form.id ? '게이트 기록 수정' : '게이트 기록 등록'}</p>
        <p className="-mt-1 text-[13px] text-muted-foreground">시즌 이벤트나 공동 임무 무대로 쓸 수 있습니다.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="form-label">관리 코드</span>
            <input className="field font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div>
            <span className="form-label">게이트 등급</span>
            <select className="field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              {GRADE_VALUES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="form-label">명칭</span>
          <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <span className="form-label">위치</span>
          <input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="form-label">상태</span>
            <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Incident['status'] })}>
              {INCIDENT_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="form-label">발생 일시</span>
            <input type="datetime-local" className="field px-2 text-[13px]" value={toLocalInput(form.occurred_at ?? new Date().toISOString())} onChange={(e) => e.target.value && setForm({ ...form, occurred_at: new Date(e.target.value).toISOString() })} />
          </div>
        </div>
        <div>
          <span className="form-label">경과</span>
          <textarea className="field min-h-20" value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        {err ? <ErrorBox error={err} /> : null}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            {form.id ? '수정 저장' : '등록'}
          </button>
          {form.id && (
            <button type="button" className="btn" onClick={() => setForm(blank())}>
              취소
            </button>
          )}
        </div>
      </form>
      <ul className="doc-frame divide-y divide-rule">
        {(incidents.data ?? []).map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-4 py-3">
            <GradeBadge grade={i.grade} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-muted-foreground">
                {i.code} · {fmtDate(i.occurred_at, true)}
              </p>
              <p className="truncate text-[15px]">{i.title}</p>
            </div>
            <Pill tone={i.status === 'open' ? 'danger' : i.status === 'responding' ? 'seal' : 'muted'}>{incidentStatusLabel(i.status)}</Pill>
            <button type="button" className="label-mono hover:text-foreground" onClick={() => setForm({ ...i })}>
              수정
            </button>
            <button
              type="button"
              className="label-mono hover:text-seal"
              onClick={async () => {
                if (!confirm('이 기록을 삭제할까요?')) return
                await api.deleteIncident(i.id).catch((e) => alert(errMsg(e)))
                incidents.reload()
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      <GateRosters incidents={incidents.data ?? []} reload={incidents.reload} />
    </div>
  )
}

// ── 경보 단계
function AlertLevel() {
  const { settings, reloadSettings } = useSiteContext()
  const [level, setLevel] = useState(settings?.alert_level ?? 1)
  const [message, setMessage] = useState(settings?.alert_message ?? '')
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<unknown>(null)

  const save = async () => {
    setErr(null)
    try {
      await api.updateSettings({ alert_level: level, alert_message: message.trim() || null })
      reloadSettings()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-[14px] text-muted-foreground">첫 화면 경보판과 왼쪽 레일의 경보 표시에 바로 반영됩니다.</p>
      <div className="grid gap-2 sm:grid-cols-5">
        {ALERT_LEVELS.map((a) => (
          <button
            key={a.level}
            type="button"
            onClick={() => setLevel(a.level)}
            aria-pressed={level === a.level}
            className={cx('border-2 p-3 text-left transition-colors', level === a.level ? 'bg-card' : 'border-rule bg-card/40 opacity-70 hover:opacity-100')}
            style={level === a.level ? { borderColor: alertColor(a.level) } : undefined}
          >
            <AlertSegments level={a.level} cell="h-1.5 w-3" />
            <p className="title-serif mt-2 text-[20px] font-bold" style={{ color: alertColor(a.level) }}>
              {a.level}단계 {a.name}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">{a.en}</p>
          </button>
        ))}
      </div>
      <p className="border-l-2 border-rule pl-3 text-[13.5px] text-muted-foreground">{ALERT_LEVELS[level - 1].desc}</p>
      <div>
        <label className="form-label" htmlFor="al-msg">
          경보 문구 (비우면 기본 문구)
        </label>
        <input id="al-msg" className="field" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} />
      </div>
      {err ? <ErrorBox error={err} /> : null}
      <button type="button" className="btn btn-seal px-6" onClick={save}>
        {saved ? '발령 완료' : '경보 단계 발령'}
      </button>
    </div>
  )
}

// ── 협회 규정
function RulesEditor() {
  const page = useAsync(() => api.getPage('rules'), [])
  const [title, setTitle] = useState<string | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<unknown>(null)

  if (page.loading) return <Loading />

  const t = title ?? page.data?.title ?? DEFAULT_RULES.title
  const b = body ?? page.data?.body ?? DEFAULT_RULES.body

  const save = async () => {
    setErr(null)
    try {
      await api.savePage({ slug: 'rules', title: t.trim(), body: b })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      page.reload()
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="space-y-4">
        <div>
          <label className="form-label" htmlFor="r-title">
            제목
          </label>
          <input id="r-title" className="field" value={t} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </div>
        <div>
          <label className="form-label" htmlFor="r-body">
            본문
          </label>
          <textarea id="r-body" className="field min-h-[480px] text-[15px] leading-[1.8]" value={b} onChange={(e) => setBody(e.target.value)} />
        </div>
        {err ? <ErrorBox error={err} /> : null}
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary px-6" onClick={save}>
            {saved ? '저장됨' : '규정 저장'}
          </button>
          <Link to="/rules" className="btn">
            공개 화면 보기
          </Link>
        </div>
      </div>
      <div className="text-[13.5px] leading-relaxed text-muted-foreground">
        <p className="mb-2 font-bold text-foreground">작성 방법</p>
        <p>'제1조 (목적)'처럼 제n조로 시작하는 줄은 조항 제목이 되고, 그 아래 줄이 조항 내용이 됩니다.</p>
        <p className="mt-2">'부칙'으로 시작하는 줄은 부칙 제목이 됩니다. 조항 사이는 빈 줄로 띄워 주세요.</p>
        <p className="mt-2">커뮤 규칙을 파수국 규정 말투로 적으면 겉모습이 그대로 유지됩니다.</p>
      </div>
    </div>
  )
}

// ── 게이트 참여 명단
function GateRosters({ incidents, reload }: { incidents: Incident[]; reload: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const counts = useAsync(async () => {
    const rows = await Promise.all(incidents.map(async (i) => [i.id, (await api.listEntries(i.id)).length] as const))
    return new Map(rows)
  }, [incidents.map((i) => i.id).join(',')])
  const roster = useAsync(() => (open ? api.listEntries(open) : Promise.resolve([])), [open])

  const closeGate = async (i: Incident) => {
    if (!confirm(`${i.code} 게이트를 종결 처리할까요? 이후로는 참여 신청을 받지 않습니다.`)) return
    try {
      await api.saveIncident({ ...i, status: 'closed' })
      reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  if (incidents.length === 0) return null

  return (
    <div className="lg:col-span-2">
      <h3 className="sechead mb-3 border-b-2 border-foreground pb-2 text-[20px] font-black tracking-[-0.03em]">게이트 참여 명단</h3>
      <div className="overflow-x-auto">
        <table className="table-doc min-w-[680px]">
          <thead>
            <tr>
              <th className="w-24">코드</th>
              <th>명칭</th>
              <th className="w-24">상태</th>
              <th className="w-20 text-right">참여</th>
              <th className="w-52 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <Fragment key={i.id}>
                <tr>
                  <td className="font-mono text-[13px]">{i.code}</td>
                  <td className="truncate">{i.title}</td>
                  <td>
                    <Pill tone={i.status === 'open' ? 'danger' : i.status === 'responding' ? 'seal' : 'muted'}>{incidentStatusLabel(i.status)}</Pill>
                  </td>
                  <td className="text-right font-mono text-[14px]">{counts.data?.get(i.id) ?? '—'}명</td>
                  <td className="text-right text-[13px]">
                    <span className="inline-flex gap-3">
                      <button type="button" onClick={() => setOpen(open === i.id ? null : i.id)} className="hover:text-seal">
                        {open === i.id ? '명단 닫기' : '명단 보기'}
                      </button>
                      {i.status !== 'closed' && (
                        <button type="button" onClick={() => closeGate(i)} className="text-destructive hover:underline">
                          종결 처리
                        </button>
                      )}
                      <Link to={`/incidents/${i.id}`} className="hover:text-seal">
                        보기
                      </Link>
                    </span>
                  </td>
                </tr>
                {open === i.id && (
                  <tr>
                    <td colSpan={5} className="bg-muted">
                      {roster.loading ? (
                        <Loading />
                      ) : (roster.data ?? []).length === 0 ? (
                        <p className="py-2 text-[14px] text-muted-foreground">참여 신청이 없습니다.</p>
                      ) : (
                        <ul className="grid gap-x-8 sm:grid-cols-2">
                          {(roster.data ?? []).map((e) => (
                            <li key={e.id} className="flex items-center gap-2 border-b border-rule py-2 text-[14px]">
                              <b className="font-bold">{e.character?.name ?? '비공개 요원'}</b>
                              {e.character && <span className="text-muted-foreground">{e.character.grade}급</span>}
                              {e.note && <span className="truncate text-muted-foreground">· {e.note}</span>}
                              <button
                                type="button"
                                className="ml-auto text-[12px] text-muted-foreground hover:text-destructive"
                                onClick={async () => {
                                  if (!confirm('이 참여 신청을 취소할까요?')) return
                                  await api.leaveIncident(e.id).catch((err) => alert(errMsg(err)))
                                  roster.reload()
                                  counts.reload()
                                }}
                              >
                                취소
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
