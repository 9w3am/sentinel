import { Fragment, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Emblem, Empty, ErrorBox, GradeBadge, KindBadge, Loading, SectionHead, WRAP, cx } from '../components/ui'
import { WORLD, incidentStatusLabel } from '../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import type { Incident } from '../lib/types'
import { errMsg, fmtDate, relTime } from '../lib/util'

const statusColor = (s: Incident['status']) => (s === 'open' ? 'var(--destructive)' : s === 'responding' ? 'var(--seal)' : 'var(--muted-foreground)')

export default function IncidentDetail() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const inc = useAsync(() => api.getIncident(id), [id])
  const entries = useAsync(() => api.listEntries(id), [id, session?.userId])
  const reports = useAsync(() => (session?.role ? api.listPostsByIncident(id) : Promise.resolve([])), [id, session?.role])
  const mine = useAsync(() => (session?.role ? api.listMyCharacters() : Promise.resolve([])), [session?.role])
  const [charId, setCharId] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const i = inc.data
  usePageMeta(i ? `${i.code} ${i.title}` : '게이트', i?.body ?? undefined)

  if (inc.loading) return <Loading />
  if (inc.error)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <ErrorBox error={inc.error} />
      </div>
    )
  if (!i)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <Empty title="없는 게이트 기록입니다">
          <Link to="/incidents" className="btn mt-4">
            게이트 현황으로
          </Link>
        </Empty>
      </div>
    )

  const list = entries.data ?? []
  const joined = new Set(list.map((e) => e.character_id))
  const eligible = (mine.data ?? []).filter((c) => c.status === 'approved' && !joined.has(c.id))
  const closed = i.status === 'closed'
  const color = statusColor(i.status)

  const join = async (e: FormEvent) => {
    e.preventDefault()
    if (!charId) return
    setBusy(true)
    setErr(null)
    try {
      await api.joinIncident(i.id, charId, note)
      setCharId('')
      setNote('')
      entries.reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  const leave = async (entryId: string) => {
    if (!confirm('참여 신청을 취소할까요?')) return
    try {
      await api.leaveIncident(entryId)
      entries.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const meta: [string, string][] = [
    ['관리 코드', i.code],
    ['위치', i.location || '—'],
    ['발생 일시', fmtDate(i.occurred_at, true)],
    ['상태', incidentStatusLabel(i.status)],
  ]

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          홈
        </Link>
        <span>›</span>
        <Link to="/incidents" className="hover:text-foreground">
          게이트 현황
        </Link>
        <span>›</span>
        <span className="font-mono text-foreground">{i.code}</span>
      </nav>

      <div className="mx-auto mt-8 grid max-w-5xl gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
        <article className="border border-rule bg-card">
          {!closed && (
            <div className="py-2 text-center text-[13px] font-bold tracking-[0.3em] text-ink" style={{ background: color }}>
              {incidentStatusLabel(i.status).split('').join(' ')}
            </div>
          )}
          <header className="px-6 pb-7 pt-10 text-center sm:px-12">
            <div className="flex items-center justify-center gap-2.5">
              <Emblem size={28} />
              <span className="text-[17px] font-black tracking-[-0.02em]">{WORLD.orgName} 상황실</span>
            </div>
            <p className="mt-7 text-[30px] font-black tracking-[0.35em] [text-indent:0.35em] sm:text-[36px]">게이트 발생 보고</p>
          </header>

          <dl className="mx-6 grid grid-cols-[5.5rem_1fr] border-y-2 border-foreground text-[14px] sm:mx-12 sm:grid-cols-[5.5rem_1fr_5.5rem_1fr]">
            {meta.map(([k, v], idx) => (
              <Fragment key={k}>
                <dt className={cx('bg-muted px-3 py-2.5 text-muted-foreground', idx < meta.length - 1 && 'border-b border-rule', idx >= meta.length - 2 && 'sm:border-b-0')}>{k}</dt>
                <dd className={cx('px-3 py-2.5', k === '관리 코드' && 'font-mono', k === '상태' && 'font-bold', idx < meta.length - 1 && 'border-b border-rule', idx >= meta.length - 2 && 'sm:border-b-0')} style={k === '상태' ? { color } : undefined}>
                  {v}
                </dd>
              </Fragment>
            ))}
          </dl>

          <div className="px-6 py-10 sm:px-12">
            <div className="flex items-center gap-4">
              <GradeBadge grade={i.grade} size="lg" />
              <div>
                <p className="text-[13px] text-muted-foreground">{i.grade}급 게이트</p>
                <h1 className="text-[26px] font-black leading-tight tracking-[-0.03em] sm:text-[30px]">{i.title}</h1>
              </div>
            </div>
            <p className="mt-6 whitespace-pre-line text-[16px] leading-[1.9]">{i.body || '적힌 경과가 없습니다.'}</p>
          </div>

          <footer className="border-t border-rule px-6 py-5 text-right text-[13px] text-muted-foreground sm:px-12">
            {WORLD.orgName} 상황실 · 참여 요원 {list.length}명
          </footer>
        </article>

        <aside className="space-y-10">
          <div>
            <SectionHead title={`참여 요원 ${list.length}`} />
            {entries.error ? <ErrorBox error={entries.error} /> : null}
            {list.length === 0 && <p className="py-4 text-[14px] text-muted-foreground">아직 참여 신청이 없습니다.</p>}
            <ul>
              {list.map((e) => (
                <li key={e.id} className="border-b border-rule py-3">
                  <div className="flex items-center gap-2">
                    {e.character ? (
                      <Link to={`/registry/${e.character.id}`} className="truncate font-bold hover:text-seal">
                        {e.character.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">비공개 요원</span>
                    )}
                    {e.character && <GradeBadge grade={e.character.grade} size="sm" />}
                    {e.character && <KindBadge kind={e.character.kind} />}
                    {session && (e.owner_id === session.userId || session.role === 'admin') && (
                      <button type="button" onClick={() => leave(e.id)} className="ml-auto text-[12px] text-muted-foreground hover:text-destructive">
                        취소
                      </button>
                    )}
                  </div>
                  {e.note && <p className="mt-0.5 text-[13px] text-muted-foreground">{e.note}</p>}
                </li>
              ))}
            </ul>
          </div>

          {session?.role ? (
            closed ? (
              <p className="border-l-2 border-rule pl-3 text-[14px] text-muted-foreground">종결된 게이트는 참여 신청을 받지 않습니다.</p>
            ) : (
              <form onSubmit={join} className="corners space-y-3 bg-card p-5">
                <p className="font-bold">참여 신청</p>
                {mine.loading ? (
                  <Loading />
                ) : eligible.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    신청할 수 있는 등록증이 없습니다. 심사가 끝난 등록증만 참여할 수 있습니다.{' '}
                    <Link to="/office/cards" className="text-seal underline underline-offset-4">
                      내 등록증
                    </Link>
                  </p>
                ) : (
                  <>
                    <select className="field" value={charId} onChange={(e) => setCharId(e.target.value)} aria-label="참여할 등록증">
                      <option value="">등록증 선택</option>
                      {eligible.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.grade}급
                        </option>
                      ))}
                    </select>
                    <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="한 줄 메모 (선택)" maxLength={100} aria-label="메모" />
                    {err ? <ErrorBox error={err} /> : null}
                    <button type="submit" className="btn btn-primary w-full" disabled={busy || !charId}>
                      {busy ? '신청 중…' : '참여 신청'}
                    </button>
                  </>
                )}
              </form>
            )
          ) : (
            <p className="border-l-2 border-seal pl-3 text-[14px] text-muted-foreground">
              참여 신청은{' '}
              <Link to={`/auth?next=${encodeURIComponent(`/incidents/${i.id}`)}`} className="text-seal underline underline-offset-4">
                로그인
              </Link>{' '}
              후 할 수 있습니다.
            </p>
          )}

          {session?.role && (
            <div>
              <SectionHead
                title="관련 임무 보고서"
                action={
                  <Link to={`/office/board/new?c=report&gate=${i.id}`} className="text-[13px] text-muted-foreground hover:text-seal">
                    보고서 작성 →
                  </Link>
                }
              />
              {(reports.data ?? []).length === 0 && <p className="py-4 text-[14px] text-muted-foreground">연결된 보고서가 없습니다.</p>}
              <ul>
                {(reports.data ?? []).map((p) => (
                  <li key={p.id}>
                    <Link to={`/office/board/${p.id}`} className="group block border-b border-rule py-3">
                      <span className="block truncate font-medium group-hover:text-seal">{p.title}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {p.character ? p.character.name : p.author_name} · {relTime(p.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
