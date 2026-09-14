import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RichText } from '../components/RichText'
import { Emblem, Empty, ErrorBox, Loading, PageTitle, Pill, Tabs, WRAP, cx } from '../components/ui'
import { WORLD } from '../config/world'
import { api, useAsync, usePageMeta } from '../lib/backend'
import type { Notice } from '../lib/types'
import { docNumber, fmtDate } from '../lib/util'

type Filter = 'all' | 'normal' | 'alert'
const PAGE = 10
const shortDate = (iso: string) => fmtDate(iso).replace(/\. /g, '.').replace(/\.$/, '')
const levelLabel = (l: Notice['level']) => (l === 'critical' ? '긴급' : l === 'warning' ? '경보' : '공지')

function LevelPill({ level }: { level: Notice['level'] }) {
  if (level === 'normal') return <Pill>공지</Pill>
  return (
    <Pill tone={level === 'critical' ? 'danger' : 'seal'} solid>
      {levelLabel(level)}
    </Pill>
  )
}

export function NoticeList() {
  usePageMeta('알림마당', `${WORLD.orgName} 공지와 경보 발령 기록.`)
  const { data, loading, error } = useAsync(() => api.listNotices(), [])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Filter>('all')
  const [page, setPage] = useState(1)

  const all = data ?? []
  const byTab = (n: Notice, t: Filter) => t === 'all' || (t === 'normal' ? n.level === 'normal' : n.level !== 'normal')
  const list = all.filter((n) => byTab(n, tab) && (!q || n.title.includes(q) || n.body.includes(q)))
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages)
  const rows = list.slice((cur - 1) * PAGE, cur * PAGE)

  return (
    <>
      <PageTitle title="알림마당" crumbs={[{ label: '알림마당' }]} desc="공지와 경보 발령 기록입니다.">
        <input
          className="field w-full sm:w-80"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder="제목 · 내용 검색"
          aria-label="검색"
        />
      </PageTitle>
      <section className={cx(WRAP, 'pt-10')}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={(v) => {
              setTab(v)
              setPage(1)
            }}
            items={[
              { value: 'all', label: '전체', count: all.length },
              { value: 'normal', label: '공지', count: all.filter((n) => byTab(n, 'normal')).length },
              { value: 'alert', label: '경보', count: all.filter((n) => byTab(n, 'alert')).length },
            ]}
          />
          <span className="text-[13px] text-muted-foreground">총 {list.length}건</span>
        </div>
        {loading && <Loading />}
        {error ? <ErrorBox error={error} /> : null}
        {data && (
          <div className="overflow-x-auto">
            <table className="table-doc min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-16">번호</th>
                  <th className="w-20">분류</th>
                  <th>제목</th>
                  <th className="hidden w-40 sm:table-cell">문서번호</th>
                  <th className="w-28 text-right">등록일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id} className={cx('group', n.pinned && 'bg-muted')}>
                    <td className="text-[13px] text-muted-foreground">{n.pinned ? '공지' : <span className="font-mono">{n.doc_no}</span>}</td>
                    <td>
                      <LevelPill level={n.level} />
                    </td>
                    <td>
                      <Link to={`/notices/${n.id}`} className="block truncate font-medium group-hover:text-seal">
                        {n.title}
                      </Link>
                    </td>
                    <td className="hidden font-mono text-[12px] text-muted-foreground sm:table-cell">{docNumber(n.doc_no, n.created_at)}</td>
                    <td className="text-right font-mono text-[13px] text-muted-foreground">{shortDate(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-12 text-center text-[14px] text-muted-foreground">해당하는 글이 없습니다.</p>}
          </div>
        )}
        {pages > 1 && (
          <div className="mt-6 flex justify-center gap-1 text-[13px]">
            <button type="button" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setPage(Math.max(1, cur - 1))} aria-label="이전">
              ‹
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setPage(p)} className={cx('h-8 w-8', p === cur ? 'bg-foreground font-bold text-background' : 'text-muted-foreground hover:text-foreground')}>
                {p}
              </button>
            ))}
            <button type="button" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setPage(Math.min(pages, cur + 1))} aria-label="다음">
              ›
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export function NoticeDetail() {
  const { id = '' } = useParams()
  const one = useAsync(() => api.getNotice(id), [id])
  const all = useAsync(() => api.listNotices(), [])
  const n = one.data
  usePageMeta(n ? n.title : '알림마당', n ? n.body.slice(0, 120) : undefined)

  if (one.loading) return <Loading />
  if (one.error)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <ErrorBox error={one.error} />
      </div>
    )
  if (!n)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <Empty title="없거나 삭제된 글입니다">
          <Link to="/notices" className="btn mt-4">
            목록으로
          </Link>
        </Empty>
      </div>
    )

  const list = all.data ?? []
  const idx = list.findIndex((x) => x.id === n.id)
  const prev = idx > 0 ? list[idx - 1] : null
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null
  const word = n.level === 'normal' ? '공고' : '경보 발령'
  const meta: [string, string][] = [
    ['문서번호', docNumber(n.doc_no, n.created_at)],
    ['발행일', shortDate(n.created_at)],
    ['수신', '전 등록 요원'],
    ['분류', `${levelLabel(n.level)}${n.pinned ? ' · 상단 고정' : ''}`],
  ]

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          홈
        </Link>
        <span>›</span>
        <Link to="/notices" className="hover:text-foreground">
          알림마당
        </Link>
      </nav>

      <article className="relative mx-auto mt-8 max-w-3xl border border-rule bg-card">
        {n.level !== 'normal' && (
          <div className="py-2 text-center text-[13px] font-bold tracking-[0.3em] text-ink" style={{ background: n.level === 'critical' ? 'var(--destructive)' : 'var(--seal)' }}>
            {n.level === 'critical' ? '긴 급' : '경 보'}
          </div>
        )}
        <header className="px-6 pb-7 pt-10 text-center sm:px-14">
          <div className="flex items-center justify-center gap-2.5">
            <Emblem size={30} />
            <span className="text-[18px] font-black tracking-[-0.02em]">{WORLD.orgName}</span>
          </div>
          <p className="mt-7 text-[34px] font-black tracking-[0.5em] [text-indent:0.5em] sm:text-[40px]">{word}</p>
        </header>

        <dl className="mx-6 grid grid-cols-[5.5rem_1fr] border-y-2 border-foreground text-[14px] sm:mx-14 sm:grid-cols-[5.5rem_1fr_5.5rem_1fr]">
          {meta.map(([k, v], i) => (
            <Fragment key={k}>
              <dt className={cx('bg-muted px-3 py-2.5 text-muted-foreground', i < meta.length - 2 && 'sm:border-b sm:border-rule', i < meta.length - 1 && 'border-b border-rule')}>{k}</dt>
              <dd className={cx('px-3 py-2.5', k === '문서번호' && 'font-mono text-[13px]', i < meta.length - 2 && 'sm:border-b sm:border-rule', i < meta.length - 1 && 'border-b border-rule')}>{v}</dd>
            </Fragment>
          ))}
        </dl>

        <div className="px-6 py-10 sm:px-14">
          <h1 className="text-[26px] font-black leading-[1.3] tracking-[-0.03em] sm:text-[30px]">{n.title}</h1>
          <RichText text={n.body} className="mt-6 whitespace-pre-line text-[16px] leading-[1.95]" />
          <p className="mt-10 text-[15px]">위와 같이 알립니다.</p>
        </div>

        <footer className="flex justify-center px-6 pb-14 sm:px-14">
          <div className="relative text-center">
            <p className="font-mono text-[13px] text-muted-foreground">{fmtDate(n.created_at)}</p>
            <p className="mt-2 text-[24px] font-black tracking-[0.15em]">{WORLD.orgName}장</p>
            <span className="stamp stamp-in absolute -right-[92px] -top-2 text-[17px] text-seal">
              직 인<small>관리부</small>
            </span>
          </div>
        </footer>
      </article>

      <nav className="mx-auto mt-6 max-w-3xl border-t-2 border-foreground text-[14px]">
        {(
          [
            ['이전 글', prev],
            ['다음 글', next],
          ] as [string, Notice | null][]
        ).map(([label, d]) => (
          <div key={label} className="grid grid-cols-[5.5rem_1fr] border-b border-rule">
            <span className="px-3 py-3 text-muted-foreground">{label}</span>
            {d ? (
              <Link to={`/notices/${d.id}`} className="truncate px-3 py-3 hover:text-seal">
                {d.title}
              </Link>
            ) : (
              <span className="px-3 py-3 text-muted-foreground">없음</span>
            )}
          </div>
        ))}
      </nav>
      <div className="mx-auto mt-8 max-w-3xl text-center">
        <Link to="/notices" className="btn">
          목록
        </Link>
      </div>
    </section>
  )
}
