import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RichText } from '../../components/RichText'
import { Empty, ErrorBox, Loading, Pill, Segmented, cx } from '../../components/ui'
import { REVEAL_OPTIONS } from '../../config/world'
import { api, useAsync, usePageMeta } from '../../lib/backend'
import type { Reveal } from '../../lib/types'
import { errMsg, relTime } from '../../lib/util'

function Head({ action }: { action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-3">
      <div>
        <p className="text-[13px] text-muted-foreground">요원 내부망 · 익명 게시판</p>
        <h2 className="text-[30px] font-black tracking-[-0.03em]">대나무숲</h2>
      </div>
      {action}
    </div>
  )
}

/** 승인된 내 등록증만 고를 수 있다 (캐입) */
function useApproved() {
  const mine = useAsync(() => api.listMyCharacters(), [])
  return { loading: mine.loading, list: (mine.data ?? []).filter((c) => c.status === 'approved') }
}

export function BambooList() {
  usePageMeta('대나무숲')
  const posts = useAsync(() => api.listAnonPosts(), [])
  const list = posts.data ?? []

  return (
    <div>
      <Head
        action={
          <Link to="/office/bamboo/new" className="btn btn-primary">
            글쓰기
          </Link>
        }
      />
      <p className="mb-6 text-[13.5px] text-muted-foreground">등록증으로 들어오지만 이름은 표시되지 않습니다. 캐입으로만 써 주세요. 분란이 생기면 관리부가 작성자를 확인할 수 있습니다.</p>
      {posts.loading && <Loading />}
      {posts.error ? <ErrorBox error={posts.error} /> : null}
      {posts.data && list.length === 0 && <Empty title="아직 글이 없습니다">첫 글을 남겨 보세요.</Empty>}
      {list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[640px]">
            <thead>
              <tr>
                <th className="w-16">번호</th>
                <th>제목</th>
                <th className="w-44">표시</th>
                <th className="w-24 text-right">등록</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={p.id} className="group">
                  <td className="font-mono text-[13px] text-muted-foreground">{list.length - i}</td>
                  <td>
                    <Link to={`/office/bamboo/${p.id}`} className="flex min-w-0 items-center gap-2 font-medium group-hover:text-seal">
                      <span className="truncate">{p.title}</span>
                      {p.comment_count > 0 && <span className="font-mono text-[12px] text-seal">[{p.comment_count}]</span>}
                      {p.is_mine && <Pill>내 글</Pill>}
                      {p.hidden && <Pill tone="danger">가림</Pill>}
                    </Link>
                  </td>
                  <td className="truncate text-[14px]">{p.dept ?? <span className="text-muted-foreground">익명</span>}</td>
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

export function BambooNew() {
  usePageMeta('대나무숲 글쓰기')
  const navigate = useNavigate()
  const approved = useApproved()
  const [characterId, setCharacterId] = useState('')
  const [reveal, setReveal] = useState<Reveal>('none')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)

  if (approved.loading) return <Loading />
  const ch = approved.list.find((c) => c.id === characterId) ?? approved.list[0]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ch) return
    setBusy(true)
    setErr(null)
    try {
      const id = await api.createAnonPost({ character_id: ch.id, reveal, title, body })
      navigate(`/office/bamboo/${id}`, { replace: true })
    } catch (e) {
      setErr(e)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/office/bamboo" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 대나무숲
      </Link>
      <div className="mt-4">
        <Head />
      </div>
      {approved.list.length === 0 ? (
        <Empty title="승인된 등록증이 있어야 쓸 수 있습니다">
          <Link to="/office/cards" className="btn mt-4">
            내 등록증
          </Link>
        </Empty>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5 border border-rule bg-card p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="bb-char">
                접속할 등록증
              </label>
              <select id="bb-char" className="field" value={ch?.id ?? ''} onChange={(e) => setCharacterId(e.target.value)}>
                {approved.list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[12.5px] text-muted-foreground">이름은 다른 요원에게 보이지 않습니다.</p>
            </div>
            <div>
              <span className="form-label">글에 표시할 것</span>
              <Segmented name="표시" value={reveal} onChange={setReveal} options={REVEAL_OPTIONS.map((o) => ({ value: o.value as Reveal, label: o.label }))} />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="bb-title">
              제목
            </label>
            <input id="bb-title" className="field text-[17px]" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <label className="form-label" htmlFor="bb-body">
              본문
            </label>
            <textarea id="bb-body" className="field min-h-56 leading-[1.9]" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={20000} />
          </div>
          {err ? <ErrorBox error={err} /> : null}
          <div className="flex justify-end gap-2 border-t border-rule pt-5">
            <Link to="/office/bamboo" className="btn">
              취소
            </Link>
            <button type="submit" className="btn btn-primary px-6" disabled={busy}>
              {busy ? '올리는 중…' : '익명으로 올리기'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export function BambooDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const post = useAsync(() => api.getAnonPost(id), [id])
  const comments = useAsync(() => api.listAnonComments(id), [id])
  const approved = useApproved()
  const [characterId, setCharacterId] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const p = post.data
  usePageMeta(p?.title ?? '대나무숲')

  if (post.loading) return <Loading />
  if (post.error) return <ErrorBox error={post.error} />
  if (!p)
    return (
      <Empty title="없거나 가려진 글입니다">
        <Link to="/office/bamboo" className="btn mt-4">
          대나무숲으로
        </Link>
      </Empty>
    )

  const ch = approved.list.find((c) => c.id === characterId) ?? approved.list[0]
  const list = comments.data ?? []

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!ch || !body.trim()) return
    setBusy(true)
    try {
      await api.addAnonComment(p.id, ch.id, body)
      setBody('')
      comments.reload()
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/office/bamboo" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 대나무숲
      </Link>
      <article className="mt-4 border border-rule bg-card">
        <header className="border-b border-rule px-6 py-5 sm:px-8">
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span className="text-foreground">{p.dept ?? '익명'}</span>
            <span className="font-mono">{relTime(p.created_at)}</span>
            {p.is_mine && <Pill>내 글</Pill>}
            {p.hidden && <Pill tone="danger">관리부가 가린 글</Pill>}
          </p>
          <h1 className="mt-2 text-[24px] font-black leading-snug tracking-[-0.02em]">{p.title}</h1>
        </header>
        <RichText text={p.body} className="whitespace-pre-wrap px-6 py-8 text-[16px] leading-[1.9] sm:px-8" />
        {p.is_mine && (
          <div className="flex justify-end border-t border-rule px-6 py-3">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={async () => {
                if (!confirm('이 글을 삭제할까요? 댓글도 함께 지워집니다.')) return
                try {
                  await api.deleteAnonPost(p.id)
                  navigate('/office/bamboo', { replace: true })
                } catch (e) {
                  alert(errMsg(e))
                }
              }}
            >
              글 삭제
            </button>
          </div>
        )}
      </article>

      <section className="mt-10">
        <h2 className="flex items-baseline gap-2 border-b-2 border-foreground pb-2 text-[20px] font-black">
          댓글<span className="font-mono text-[14px] font-normal text-muted-foreground">{list.length}</span>
        </h2>
        <ul>
          {list.map((c) => (
            <li key={c.id} className="border-b border-rule py-4">
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <strong className={cx('font-bold', c.alias === '글쓴이' && 'text-seal')}>{c.alias}</strong>
                {c.is_mine && <Pill>내 댓글</Pill>}
                <span className="font-mono text-[12px] text-muted-foreground">{relTime(c.created_at)}</span>
                {c.is_mine && (
                  <button
                    type="button"
                    className="ml-auto text-[12px] text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (!confirm('댓글을 삭제할까요?')) return
                      await api.deleteAnonComment(c.id).catch((e) => alert(errMsg(e)))
                      comments.reload()
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
              {c.hidden && !c.body ? <p className="mt-1.5 text-[14px] italic text-muted-foreground">관리부가 가린 댓글입니다.</p> : <RichText text={c.body} className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed" />}
            </li>
          ))}
          {comments.data && list.length === 0 && <li className="py-6 text-[14px] text-muted-foreground">아직 댓글이 없습니다.</li>}
        </ul>
        {p.hidden ? null : approved.list.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted-foreground">승인된 등록증이 있어야 댓글을 달 수 있습니다.</p>
        ) : (
          <form onSubmit={add} className="mt-4 space-y-3 border border-rule bg-card p-4">
            <div className="grid gap-2 sm:grid-cols-[14rem_1fr] sm:items-center">
              <select className="field" value={ch?.id ?? ''} onChange={(e) => setCharacterId(e.target.value)} aria-label="접속할 등록증">
                {approved.list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="hidden text-[13px] text-muted-foreground sm:block">이름은 보이지 않고 익명 번호로 표시됩니다</span>
            </div>
            <textarea className="field min-h-24" value={body} onChange={(e) => setBody(e.target.value)} placeholder="익명으로 댓글 남기기" maxLength={4000} aria-label="댓글" />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm px-5" disabled={busy || !body.trim()}>
                댓글 등록
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
