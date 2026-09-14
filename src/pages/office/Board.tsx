import { Fragment, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Emblem, Empty, ErrorBox, Loading, Pill, Segmented, Tabs } from '../../components/ui'
import { POST_CATEGORIES, WORLD, categoryLabel } from '../../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../../lib/backend'
import type { CharacterBrief, Post } from '../../lib/types'
import { errMsg, fmtDate, relTime } from '../../lib/util'

const CAT_TONE: Record<string, 'primary' | 'seal' | 'muted'> = { general: 'muted', report: 'primary', request: 'seal' }
const signerName = (c?: CharacterBrief | null, fallback?: string) => (c ? c.name : fallback ?? '요원')
const docNo = (p: Post) => {
  const d = new Date(p.created_at)
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `기안 제${ymd}-${p.id.slice(0, 4).toUpperCase()}호`
}

export function BoardList() {
  usePageMeta('협회 게시판')
  const [params, setParams] = useSearchParams()
  const cat = params.get('c') ?? ''
  const all = useAsync(() => api.listPosts(), [])
  const list = (all.data ?? []).filter((p) => !cat || p.category === cat)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-3">
        <div>
          <p className="text-[13px] text-muted-foreground">요원 전용</p>
          <h2 className="text-[30px] font-black tracking-[-0.03em]">협회 게시판</h2>
        </div>
        <Link to={`/office/board/new${cat ? `?c=${cat}` : ''}`} className="btn btn-primary">
          기안 작성
        </Link>
      </div>
      <Tabs
        className="mb-4"
        value={cat}
        onChange={(v) => setParams(v ? { c: v } : {})}
        items={[{ value: '', label: '전체', count: all.data?.length }, ...POST_CATEGORIES.map((c) => ({ value: c.value as string, label: c.label, count: (all.data ?? []).filter((p) => p.category === c.value).length }))]}
      />
      {all.loading && <Loading />}
      {all.error ? <ErrorBox error={all.error} /> : null}
      {all.data && list.length === 0 && <Empty title="올라온 기안이 없습니다">첫 기안을 작성해 보세요.</Empty>}
      {list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[680px]">
            <thead>
              <tr>
                <th className="w-16">번호</th>
                <th className="w-24">분류</th>
                <th>제목</th>
                <th className="w-40">기안 명의</th>
                <th className="w-24 text-right">등록</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={p.id} className="group">
                  <td className="font-mono text-[13px] text-muted-foreground">{list.length - i}</td>
                  <td>
                    <Pill tone={CAT_TONE[p.category]}>{categoryLabel(p.category)}</Pill>
                  </td>
                  <td>
                    <Link to={`/office/board/${p.id}`} className="block truncate font-medium group-hover:text-seal">
                      {p.title}
                      {!!p.comment_count && <span className="ml-2 font-mono text-[12px] text-seal">[{p.comment_count}]</span>}
                    </Link>
                  </td>
                  <td className="truncate text-[14px]">{signerName(p.character, p.author_name)}</td>
                  <td className="text-right font-mono text-[13px] text-muted-foreground">{relTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SignerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { session } = useAuth()
  const mine = useAsync(() => api.listMyCharacters(), [])
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">개인 명의 ({session?.displayName})</option>
      {(mine.data ?? []).map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.codename ? ` · ${c.codename}` : ''} · {c.grade}급{c.status !== 'approved' ? ' (심사 중)' : ''}
        </option>
      ))}
    </select>
  )
}

function DocHead({ word, right }: { word: string; right?: ReactNode }) {
  return (
    <div className="grid gap-6 border-b border-rule p-6 sm:grid-cols-[1fr_auto] sm:p-8">
      <div>
        <div className="flex items-center gap-2.5">
          <Emblem size={24} />
          <span className="font-black tracking-[-0.02em]">{WORLD.orgName}</span>
        </div>
        <p className="mt-5 text-[32px] font-black tracking-[0.5em] sm:text-[36px]">{word}</p>
      </div>
      {right}
    </div>
  )
}

export function BoardNew() {
  usePageMeta('기안 작성')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [category, setCategory] = useState(params.get('c') || 'general')
  const [characterId, setCharacterId] = useState('')
  const [incidentId, setIncidentId] = useState(params.get('gate') || '')
  const gates = useAsync(() => api.listIncidents(), [])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const id = await api.createPost({ category, title: title.trim(), body, character_id: characterId || null, incident_id: incidentId || null })
      navigate(`/office/board/${id}`, { replace: true })
    } catch (e) {
      setErr(e)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/office/board" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 게시판
      </Link>
      <form onSubmit={submit} className="mt-4 border border-rule bg-card">
        <DocHead word="기안문" right={<p className="self-end text-[13px] text-muted-foreground">작성 중 · {fmtDate(new Date().toISOString())}</p>} />
        <div className="space-y-5 p-6 sm:p-8">
          <div>
            <span className="form-label">분류</span>
            <Segmented name="분류" value={category} onChange={setCategory} options={POST_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
            <p className="mt-1.5 text-[13px] text-muted-foreground">{POST_CATEGORIES.find((c) => c.value === category)?.desc}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span className="form-label">기안 명의</span>
              <SignerSelect value={characterId} onChange={setCharacterId} />
            </div>
            <div>
              <span className="form-label">관련 게이트 (선택)</span>
              <select className="field" value={incidentId} onChange={(e) => setIncidentId(e.target.value)} aria-label="관련 게이트">
                <option value="">없음</option>
                {(gates.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} · {g.grade}급 · {g.location}
                    {g.status === 'closed' ? ' (종결)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="t">
              제목
            </label>
            <input id="t" className="field text-[17px]" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <label className="form-label" htmlFor="b">
              본문
            </label>
            <textarea id="b" className="field min-h-72 leading-[1.9]" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={20000} />
          </div>
          {err ? <ErrorBox error={err} /> : null}
          <div className="flex justify-end gap-2 border-t border-rule pt-5">
            <Link to="/office/board" className="btn">
              취소
            </Link>
            <button type="submit" className="btn btn-primary px-6" disabled={busy}>
              {busy ? '상신 중…' : '상신'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export function BoardDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const post = useAsync(() => api.getPost(id), [id])
  const comments = useAsync(() => api.listComments(id), [id])
  const [body, setBody] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [busy, setBusy] = useState(false)
  const p = post.data
  const gate = useAsync(() => (p?.incident_id ? api.getIncident(p.incident_id) : Promise.resolve(null)), [p?.incident_id])
  usePageMeta(p?.title ?? '기안')

  if (post.loading) return <Loading />
  if (post.error) return <ErrorBox error={post.error} />
  if (!p)
    return (
      <Empty title="없거나 삭제된 기안입니다">
        <Link to="/office/board" className="btn mt-4">
          게시판으로
        </Link>
      </Empty>
    )

  const canDelete = session && (p.author_id === session.userId || session.role === 'admin')
  const signer = signerName(p.character, p.author_name)
  const meta: [string, ReactNode][] = [
    ['문서번호', <span className="font-mono text-[13px]">{docNo(p)}</span>],
    ['분류', categoryLabel(p.category)],
    [
      '기안 명의',
      p.character ? (
        <Link to={`/registry/${p.character.id}`} className="hover:text-seal">
          {signer}
        </Link>
      ) : (
        signer
      ),
    ],
    ['관리인', p.author_name ?? '요원'],
    ['시행일', fmtDate(p.created_at, true)],
    ...(gate.data
      ? ([
          [
            '관련 게이트',
            <Link to={`/incidents/${gate.data.id}`} className="hover:text-seal">
              {gate.data.code} · {gate.data.location}
            </Link>,
          ],
        ] as [string, ReactNode][])
      : []),
    ['의견', `${comments.data?.length ?? 0}건`],
  ]

  const addComment = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try {
      await api.addComment(id, body.trim(), characterId || null)
      setBody('')
      comments.reload()
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/office/board?c=${p.category}`} className="text-[13px] text-muted-foreground hover:text-seal">
        ← {categoryLabel(p.category)} 목록
      </Link>
      <article className="mt-4 border border-rule bg-card">
        <DocHead
          word="기안문"
          right={
            <table className="self-start border-collapse text-center text-[13px]" aria-label="결재란">
              <tbody>
                <tr>
                  {['기안', '검토', '결재'].map((h) => (
                    <th key={h} className="w-[76px] border border-rule bg-muted px-2 py-1.5 font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
                <tr>
                  <td className="h-16 border border-rule px-1.5">
                    <span className="stamp max-w-[64px] truncate px-1.5 text-[12px] tracking-normal text-seal">{signer.slice(0, 4)}</span>
                  </td>
                  <td className="border border-rule" />
                  <td className="border border-rule" />
                </tr>
              </tbody>
            </table>
          }
        />
        <dl className="grid grid-cols-[5.5rem_1fr] text-[14px] sm:grid-cols-[5.5rem_1fr_5.5rem_1fr]">
          {meta.map(([k, v]) => (
            <Fragment key={k}>
              <dt className="border-b border-rule bg-muted px-3 py-2.5 text-muted-foreground">{k}</dt>
              <dd className="min-w-0 truncate border-b border-rule px-3 py-2.5">{v}</dd>
            </Fragment>
          ))}
        </dl>
        <div className="grid grid-cols-[5.5rem_1fr] border-b-2 border-foreground">
          <span className="bg-muted px-3 py-3.5 text-[14px] text-muted-foreground">제목</span>
          <h1 className="px-3 py-3 text-[20px] font-black leading-snug tracking-[-0.02em]">{p.title}</h1>
        </div>
        <div className="whitespace-pre-wrap px-6 py-10 text-[16px] leading-[1.95] sm:px-10">{p.body}</div>
        <p className="px-6 pb-8 text-right text-[15px] sm:px-10">끝.</p>
        {canDelete && (
          <div className="flex justify-end border-t border-rule px-6 py-3">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={async () => {
                if (!confirm('이 기안을 삭제할까요?')) return
                try {
                  await api.deletePost(p.id)
                  navigate('/office/board', { replace: true })
                } catch (e) {
                  alert(errMsg(e))
                }
              }}
            >
              기안 삭제
            </button>
          </div>
        )}
      </article>

      <section className="mt-10">
        <h2 className="flex items-baseline gap-2 border-b-2 border-foreground pb-2 text-[20px] font-black">
          의견<span className="font-mono text-[14px] font-normal text-muted-foreground">{comments.data?.length ?? 0}</span>
        </h2>
        <ul>
          {(comments.data ?? []).map((c) => (
            <li key={c.id} className="border-b border-rule py-4">
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <strong className="font-bold">{signerName(c.character, c.author_name)}</strong>
                {c.character && <span className="text-[12px] text-muted-foreground">{c.character.grade}급</span>}
                {c.author_id === p.author_id && <Pill tone="seal">기안자</Pill>}
                <span className="font-mono text-[12px] text-muted-foreground">{relTime(c.created_at)}</span>
                {session && (c.author_id === session.userId || session.role === 'admin') && (
                  <button
                    type="button"
                    className="ml-auto text-[12px] text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (!confirm('의견을 삭제할까요?')) return
                      await api.deleteComment(c.id).catch((e) => alert(errMsg(e)))
                      comments.reload()
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed">{c.body}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={addComment} className="mt-4 space-y-3 border border-rule bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:items-center">
            <SignerSelect value={characterId} onChange={setCharacterId} />
            <span className="hidden text-[13px] text-muted-foreground sm:block">명의로 의견 남기기</span>
          </div>
          <textarea className="field min-h-24" value={body} onChange={(e) => setBody(e.target.value)} placeholder="의견을 적어 주세요" maxLength={4000} />
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm px-5" disabled={busy || !body.trim()}>
              의견 등록
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
