// 교신 기록: 캐릭터 명의로 이어 쓰는 역극 스레드
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, Empty, ErrorBox, KindMark, Loading, Pill, Segmented, Tabs, copyText, cx } from '../../components/ui'
import { api, play, useAsync, useAuth, usePageMeta } from '../../lib/backend'
import { POST_KINDS, type PostKind, type Thread, type ThreadPost } from '../../lib/playTypes'
import type { CharacterBrief } from '../../lib/types'
import { errMsg, fmtDate, relTime } from '../../lib/util'
import { CharSelect, Faces, NeedCard, PlayHead, hhmm, useApproved, usePolling } from './playKit'

const PLACES = ['본부 지하 2층 · 팀실', '본부 1층 매점', '본부 옥상', '의무실', '훈련장', '교육원 기숙사', '게이트 통제선 앞', '구역 12 골목', '퇴근길 버스 정류장']

type Filter = 'all' | 'turn' | 'mine' | 'open' | 'closed'

export function ThreadList() {
  usePageMeta('교신 기록')
  const [params, setParams] = useSearchParams()
  const filter = (params.get('f') as Filter) || 'all'
  const threads = useAsync(() => play.listThreads(), [])
  const approved = useApproved()
  const myIds = useMemo(() => new Set(approved.list.map((c) => c.id)), [approved.list])
  const all = threads.data ?? []
  const joined = (t: Thread) => t.members.some((id) => myIds.has(id))
  const myTurn = (t: Thread) => t.status === 'open' && joined(t) && !!t.last_character_id && !myIds.has(t.last_character_id)
  const lists: Record<Filter, Thread[]> = {
    all: all.filter((t) => t.status === 'open'),
    turn: all.filter(myTurn),
    mine: all.filter(joined),
    open: all.filter((t) => t.status === 'open' && t.open_join),
    closed: all.filter((t) => t.status === 'closed'),
  }
  const list = lists[filter]

  return (
    <div>
      <PlayHead
        kicker="역극 · 캐릭터끼리 이어 쓰는 대화"
        title="교신 기록"
        action={
          <Link to="/office/threads/new" className="btn btn-primary">
            새 교신 열기
          </Link>
        }
      >
        장소와 상황을 적고 교신을 열면, 참여한 캐릭터가 차례로 대사 · 행동 · 서술을 이어 씁니다. 답 쓰는 시간 제한은 없습니다. 난입 허용으로 열면 누구나 들어올 수 있어요.
      </PlayHead>
      <Tabs
        className="mb-5"
        value={filter}
        onChange={(v) => setParams(v === 'all' ? {} : { f: v })}
        items={[
          { value: 'all', label: '진행 중', count: lists.all.length },
          { value: 'turn', label: '내 차례', count: lists.turn.length },
          { value: 'mine', label: '내 캐릭터 참여', count: lists.mine.length },
          { value: 'open', label: '난입 가능', count: lists.open.length },
          { value: 'closed', label: '닫힌 교신', count: lists.closed.length },
        ]}
      />
      {threads.loading && !threads.data && <Loading />}
      {threads.error ? <ErrorBox error={threads.error} /> : null}
      {threads.data && list.length === 0 && (
        <Empty title={filter === 'turn' ? '답을 기다리는 교신이 없습니다' : '교신이 없습니다'}>{filter === 'turn' ? '내 캐릭터가 참여한 교신에 다른 캐릭터가 글을 남기면 여기 뜹니다.' : '새 교신을 열어 보세요.'}</Empty>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <li key={t.id}>
            <Link to={`/office/threads/${t.id}`} className="group flex h-full flex-col border border-rule bg-card p-5 transition-colors hover:border-seal">
              <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                {myTurn(t) && (
                  <Pill tone="seal" solid>
                    내 차례
                  </Pill>
                )}
                {t.status === 'closed' ? <Pill>닫힘</Pill> : t.open_join ? <Pill tone="seal">난입 허용</Pill> : <Pill>참여자만</Pill>}
                {t.place && <span className="truncate text-muted-foreground">{t.place}</span>}
              </div>
              <p className="mt-2 text-[19px] font-black leading-snug tracking-[-0.02em] group-hover:text-seal">{t.title}</p>
              {t.summary && <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">{t.summary}</p>}
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <Faces list={t.memberBriefs} />
                <span className="font-mono text-[12px] text-muted-foreground">
                  {t.post_count}개 · {relTime(t.last_at)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MemberPicker({ exclude, value, onChange }: { exclude: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const chars = useAsync(() => api.listPublicCharacters(), [])
  const [q, setQ] = useState('')
  const pool = (chars.data ?? []).filter((c) => c.status === 'approved' && !exclude.includes(c.id))
  const hits = pool.filter((c) => !value.includes(c.id) && (!q.trim() || c.name.includes(q.trim()) || (c.codename ?? '').toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 8)
  const picked = pool.filter((c) => value.includes(c.id))
  return (
    <div>
      {picked.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {picked.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange(value.filter((x) => x !== c.id))} className="inline-flex items-center gap-1.5 border border-seal px-2 py-1 text-[13px]">
              <KindMark kind={c.kind} /> {c.name} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <input className="field" placeholder="이름이나 코드네임으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} aria-label="함께할 캐릭터 찾기" />
      {q.trim() && (
        <div className="mt-1 border border-rule">
          {hits.length === 0 && <p className="px-3 py-2 text-[13px] text-muted-foreground">찾는 캐릭터가 없습니다.</p>}
          {hits.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-2 border-b border-rule px-3 py-2 text-left text-[14px] last:border-0 hover:bg-muted"
              onClick={() => {
                onChange([...value, c.id])
                setQ('')
              }}
            >
              <KindMark kind={c.kind} /> {c.name}
              {c.codename && <span className="text-muted-foreground">· {c.codename}</span>}
              <span className="ml-auto text-[12px] text-muted-foreground">{c.owner_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ThreadNew() {
  usePageMeta('새 교신')
  const navigate = useNavigate()
  const approved = useApproved()
  const [starter, setStarter] = useState('')
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [summary, setSummary] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [openJoin, setOpenJoin] = useState<'open' | 'closed'>('closed')
  const [kind, setKind] = useState<PostKind>('narration')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)

  if (approved.loading) return <Loading />
  const me = approved.list.find((c) => c.id === starter) ?? approved.list[0]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!me) return
    setBusy(true)
    setErr(null)
    try {
      const id = await play.createThread({ title, place, summary, open_join: openJoin === 'open', starter_id: me.id, members, first: { kind, body } })
      navigate(`/office/threads/${id}`, { replace: true })
    } catch (e) {
      setErr(e)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/office/threads" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 교신 기록
      </Link>
      <div className="mt-4">
        <PlayHead kicker="역극 열기" title="새 교신" />
      </div>
      {approved.list.length === 0 ? (
        <NeedCard />
      ) : (
        <form onSubmit={submit} className="space-y-6 border border-rule bg-card p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="th-starter">
                여는 캐릭터
              </label>
              <CharSelect id="th-starter" list={approved.list} value={me?.id ?? ''} onChange={setStarter} />
            </div>
            <div>
              <span className="form-label">누가 이어 쓰나요</span>
              <Segmented
                name="참여 방식"
                value={openJoin}
                onChange={setOpenJoin}
                options={[
                  { value: 'closed', label: '지정한 캐릭터만' },
                  { value: 'open', label: '난입 허용' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="th-title">
              제목
            </label>
            <input id="th-title" className="field text-[17px]" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} placeholder="예: 복귀 브리핑 끝나고" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="th-place">
                장소
              </label>
              <input id="th-place" className="field" list="th-places" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} placeholder="본부 옥상" />
              <datalist id="th-places">
                {PLACES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="form-label" htmlFor="th-sum">
                상황 한 줄 (선택)
              </label>
              <input id="th-sum" className="field" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} placeholder="게이트에서 막 돌아온 밤" />
            </div>
          </div>
          <div>
            <span className="form-label">함께할 캐릭터 {openJoin === 'open' && '(난입 허용이면 비워 둬도 됩니다)'}</span>
            <MemberPicker exclude={me ? [me.id] : []} value={members} onChange={setMembers} />
          </div>
          <div className="border-t border-rule pt-6">
            <span className="form-label">첫 글</span>
            <Segmented name="첫 글 종류" value={kind} onChange={setKind} options={POST_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
            <textarea className="field mt-2 min-h-36 leading-[1.9]" value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} placeholder={POST_KINDS.find((k) => k.value === kind)?.hint} aria-label="첫 글" />
          </div>
          {err ? <ErrorBox error={err} /> : null}
          <div className="flex justify-end gap-2 border-t border-rule pt-5">
            <Link to="/office/threads" className="btn">
              취소
            </Link>
            <button type="submit" className="btn btn-primary px-6" disabled={busy}>
              {busy ? '여는 중…' : '교신 열기'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function PostItem({ p, prev, mine, onDelete, onHide, admin }: { p: ThreadPost; prev?: ThreadPost; mine: boolean; admin: boolean; onDelete: () => void; onHide: () => void }) {
  const c = p.character
  const cont = prev && prev.character_id === p.character_id && prev.kind !== 'narration' && p.kind !== 'narration'
  const tools = (p.is_mine || admin) && (
    <span className="ml-2 inline-flex gap-2 text-[11.5px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      {admin && (
        <button type="button" onClick={onHide} className="text-muted-foreground hover:text-foreground">
          {p.hidden ? '가림 해제' : '가리기'}
        </button>
      )}
      <button type="button" onClick={onDelete} className="text-destructive hover:underline">
        삭제
      </button>
    </span>
  )

  if (p.kind === 'narration')
    return (
      <li className={cx('group py-5', p.hidden && 'opacity-40')}>
        <div className="mx-auto max-w-2xl border-y border-dashed border-rule px-2 py-4 text-center">
          <p className="whitespace-pre-wrap font-serif text-[15.5px] leading-[1.95] text-foreground/85">{p.body}</p>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            서술 · {c?.name ?? '알 수 없음'} · {hhmm(p.created_at)}
            {tools}
          </p>
        </div>
      </li>
    )

  return (
    <li className={cx('group flex gap-3', cont ? 'pt-1.5' : 'pt-5', mine && 'flex-row-reverse', p.hidden && 'opacity-40')}>
      <div className="w-10 shrink-0 sm:w-12">
        {!cont && c && (
          <Link to={`/registry/${c.id}`} title={c.name}>
            <Avatar src={c.avatar_url} name={c.name} kind={c.kind} className="w-full" />
          </Link>
        )}
      </div>
      <div className={cx('flex min-w-0 max-w-[min(640px,85%)] flex-col', mine && 'items-end')}>
        {!cont && (
          <p className={cx('mb-1 flex items-center gap-1.5 text-[13px]', mine && 'flex-row-reverse')}>
            {c && <KindMark kind={c.kind} />}
            <b className="font-bold">{c?.name ?? '알 수 없음'}</b>
            {c?.codename && <span className="text-muted-foreground">{c.codename}</span>}
          </p>
        )}
        {p.kind === 'line' ? (
          <div className={cx('whitespace-pre-wrap border px-4 py-2.5 text-[15.5px] leading-[1.8]', mine ? 'border-seal bg-seal/10' : 'border-rule bg-card')}>{p.body}</div>
        ) : (
          <p className={cx('whitespace-pre-wrap border-rule px-1 text-[15px] italic leading-[1.85] text-muted-foreground', mine ? 'border-r-2 pr-3 text-right' : 'border-l-2 pl-3')}>{p.body}</p>
        )}
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {hhmm(p.created_at)}
          {p.hidden && ' · 가려짐'}
          {tools}
        </p>
      </div>
    </li>
  )
}

function transcript(t: Thread, posts: ThreadPost[]) {
  const head = [`[교신 기록] ${t.title}`, t.place ? `장소: ${t.place}` : '', t.summary ?? '', ''].filter((x, i) => x || i === 3)
  const lines = posts.filter((p) => !p.hidden).map((p) => {
    const n = p.character?.name ?? '?'
    if (p.kind === 'narration') return `\n${p.body}\n`
    if (p.kind === 'action') return `${n}: (${p.body})`
    return `${n}: ${p.body}`
  })
  return [...head, ...lines].join('\n')
}

export function ThreadDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const admin = session?.role === 'admin'
  const thread = useAsync(() => play.getThread(id), [id])
  const posts = useAsync(() => play.listThreadPosts(id), [id])
  const approved = useApproved()
  const [who, setWho] = useState('')
  const [kind, setKind] = useState<PostKind>('line')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [copied, setCopied] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const firstScroll = useRef(true)
  const t = thread.data
  usePageMeta(t?.title ?? '교신 기록')
  usePolling(() => {
    posts.reload()
    thread.reload()
  }, 12000)

  const list = posts.data ?? []
  const count = list.length
  useEffect(() => {
    if (!count) return
    if (firstScroll.current) {
      firstScroll.current = false
      return
    }
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [count])

  const myIds = new Set(approved.list.map((c) => c.id))
  if (thread.loading && !t) return <Loading />
  if (thread.error) return <ErrorBox error={thread.error} />
  if (!t)
    return (
      <Empty title="없거나 삭제된 교신입니다">
        <Link to="/office/threads" className="btn mt-4">
          교신 기록으로
        </Link>
      </Empty>
    )

  const canManage = t.is_mine || admin
  const writable = approved.list.filter((c) => t.open_join || t.is_mine || t.members.includes(c.id))
  const me = writable.find((c) => c.id === who) ?? writable.find((c) => t.members.includes(c.id)) ?? writable[0]

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!me || !body.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await play.addThreadPost(t.id, { character_id: me.id, kind, body })
      setBody('')
      await posts.reload()
      thread.reload()
      endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }
  const act = async (fn: () => Promise<void>) => {
    try {
      await fn()
      thread.reload()
      posts.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/office/threads" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 교신 기록
      </Link>
      <header className="mt-4 border border-rule bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-2.5 font-mono text-[12px] text-muted-foreground">
          <span className="text-seal">● REC</span>
          <span>교신 {t.id.slice(0, 6).toUpperCase()}</span>
          <span>· 시작 {fmtDate(t.created_at)}</span>
          <span className="ml-auto flex gap-1.5">{t.status === 'closed' ? <Pill>닫힘</Pill> : t.open_join ? <Pill tone="seal">난입 허용</Pill> : <Pill>참여자만</Pill>}</span>
        </div>
        <div className="px-5 py-5 sm:px-7">
          {t.place && <p className="text-[13px] text-muted-foreground">{t.place}</p>}
          <h1 className="mt-1 break-keep text-[26px] font-black leading-tight tracking-[-0.03em] sm:text-[32px]">{t.title}</h1>
          {t.summary && <p className="mt-2 text-[15px] text-muted-foreground">{t.summary}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[13.5px]">
              {t.memberBriefs.map((c: CharacterBrief) => (
                <li key={c.id}>
                  <Link to={`/registry/${c.id}`} className="inline-flex items-center gap-1 hover:text-seal">
                    <KindMark kind={c.kind} /> {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  setCopied(await copyText(transcript(t, list)))
                  setTimeout(() => setCopied(false), 1600)
                }}
              >
                {copied ? '복사됨' : '로그 복사'}
              </button>
              {canManage && (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => act(() => play.updateThread(t.id, { open_join: !t.open_join }))}>
                    {t.open_join ? '참여자만 받기' : '난입 허용'}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => act(() => play.updateThread(t.id, { status: t.status === 'open' ? 'closed' : 'open' }))}>
                    {t.status === 'open' ? '교신 닫기' : '다시 열기'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={async () => {
                      if (!confirm('교신과 글을 모두 지울까요?')) return
                      try {
                        await play.deleteThread(t.id)
                        navigate('/office/threads', { replace: true })
                      } catch (e) {
                        alert(errMsg(e))
                      }
                    }}
                  >
                    삭제
                  </button>
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      <section className="border-x border-rule bg-background px-3 pb-8 sm:px-6" aria-label="교신 내용">
        {posts.loading && !posts.data && <Loading />}
        {posts.error ? <ErrorBox error={posts.error} /> : null}
        {posts.data && list.length === 0 && <p className="py-14 text-center text-[14px] text-muted-foreground">아직 아무도 말하지 않았습니다.</p>}
        <ol>
          {list.map((p, i) => (
            <Fragment key={p.id}>
              {i > 0 && new Date(p.created_at).toDateString() !== new Date(list[i - 1].created_at).toDateString() && (
                <li className="flex items-center gap-3 pt-6 font-mono text-[11.5px] text-muted-foreground" aria-hidden="true">
                  <span className="h-px flex-1 bg-rule" />
                  {fmtDate(p.created_at)}
                  <span className="h-px flex-1 bg-rule" />
                </li>
              )}
              <PostItem
                p={p}
                prev={list[i - 1]}
                mine={myIds.has(p.character_id)}
                admin={admin}
                onDelete={() => confirm('이 글을 지울까요?') && act(() => play.deleteThreadPost(p.id))}
                onHide={() => act(() => play.setThreadPostHidden(p.id, !p.hidden))}
              />
            </Fragment>
          ))}
        </ol>
        <div ref={endRef} />
      </section>

      <div className="sticky bottom-0 z-10 border border-rule bg-card/95 backdrop-blur">
        {t.status === 'closed' ? (
          <p className="px-5 py-4 text-center text-[14px] text-muted-foreground">닫힌 교신입니다. 읽기만 할 수 있어요.</p>
        ) : approved.list.length === 0 ? (
          <div className="p-3">
            <NeedCard />
          </div>
        ) : writable.length === 0 ? (
          <p className="px-5 py-4 text-center text-[14px] text-muted-foreground">참여자로 지정된 캐릭터만 이어 쓸 수 있는 교신입니다.</p>
        ) : (
          <form onSubmit={send} className="space-y-2 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-56">
                <CharSelect list={writable} value={me?.id ?? ''} onChange={setWho} label="말하는 캐릭터" />
              </div>
              <Segmented name="글 종류" value={kind} onChange={setKind} options={POST_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
            </div>
            <div className="flex items-end gap-2">
              <textarea
                className={cx('field min-h-[76px] flex-1 leading-[1.8]', kind === 'action' && 'italic', kind === 'narration' && 'font-serif')}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={onKey}
                maxLength={3000}
                placeholder={POST_KINDS.find((k) => k.value === kind)?.hint}
                aria-label="이어 쓸 내용"
              />
              <button type="submit" className="btn btn-primary h-[76px] px-5" disabled={busy || !body.trim()}>
                {busy ? '…' : '보내기'}
              </button>
            </div>
            <p className="flex justify-between text-[11.5px] text-muted-foreground">
              <span>Ctrl + Enter로 보내기 · 새 글은 자동으로 불러옵니다</span>
              <span className="font-mono">{body.length}/3000</span>
            </p>
            {err ? <ErrorBox error={err} /> : null}
          </form>
        )}
      </div>
    </div>
  )
}
