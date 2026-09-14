import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorBox, GradeBadge, KindBadge, KindMark, Loading, PageTitle, WRAP, cx } from '../components/ui'
import { BRANCHES, GRADES, GRADE_VALUES, KINDS } from '../config/world'
import { api, useAsync, usePageMeta } from '../lib/backend'
import { fmtDate, registryNo } from '../lib/util'

const PAGE = 20

export default function Registry() {
  usePageMeta('요원 명부', '명부 공개에 동의한 등록 요원.')
  const { data, loading, error } = useAsync(() => api.listPublicCharacters(), [])
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('')
  const [grade, setGrade] = useState('')
  const [aff, setAff] = useState('')
  const [sort, setSort] = useState<'grade' | 'name' | 'new'>('grade')
  const [page, setPage] = useState(1)

  const list = useMemo(() => {
    const rows = (data ?? []).filter(
      (c) =>
        (!kind || c.kind === kind) &&
        (!grade || c.grade === grade) &&
        (!aff || c.affiliation === aff) &&
        (!q || [c.name, c.codename, c.affiliation].some((v) => v?.toLowerCase().includes(q.toLowerCase()))),
    )
    if (sort === 'grade') rows.sort((a, b) => GRADE_VALUES.indexOf(a.grade) - GRADE_VALUES.indexOf(b.grade) || a.name.localeCompare(b.name, 'ko'))
    if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    if (sort === 'new') rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return rows
  }, [data, q, kind, grade, aff, sort])

  const filtered = !!(q || kind || grade || aff)
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages)
  const rows = list.slice((cur - 1) * PAGE, cur * PAGE)
  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }

  return (
    <>
      <PageTitle title="요원 명부" crumbs={[{ label: '요원 명부' }]} desc="명부 공개에 동의한 등록 요원 목록입니다.">
        <Link to="/registry/map" className="btn">
          결속 관계도 →
        </Link>
      </PageTitle>

      <section className={cx(WRAP, 'pt-8')}>
        <div className="grid gap-3 border-y border-rule py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input className="field" value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="이름 · 코드네임 · 소속" aria-label="검색" />
          <div className="flex flex-wrap gap-2">
            <select className="field w-auto" value={grade} onChange={(e) => reset(() => setGrade(e.target.value))} aria-label="등급">
              <option value="">등급 전체</option>
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.value}급 · {g.label}
                </option>
              ))}
            </select>
            <select className="field w-auto" value={aff} onChange={(e) => reset(() => setAff(e.target.value))} aria-label="소속">
              <option value="">소속 전체</option>
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <select className="field w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="정렬">
              <option value="grade">등급순</option>
              <option value="name">이름순</option>
              <option value="new">최근 등록순</option>
            </select>
          </div>
        </div>

        <div className="mt-4 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-0.5" role="tablist">
            <button type="button" role="tab" aria-selected={!kind} className="tab" onClick={() => reset(() => setKind(''))}>
              전체
            </button>
            {KINDS.map((k) => (
              <button key={k.value} type="button" role="tab" aria-selected={kind === k.value} className="tab inline-flex items-center gap-1.5" onClick={() => reset(() => setKind(kind === k.value ? '' : k.value))}>
                <KindMark kind={k.value} />
                {k.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[13px] text-muted-foreground">
            {list.length}명{filtered && ` / 전체 ${data?.length ?? 0}명`}
          </span>
        </div>

        {loading && <Loading />}
        {error ? <ErrorBox error={error} /> : null}
        {data && list.length === 0 ? (
          <Empty title={filtered ? '조건에 맞는 요원이 없습니다' : '공개된 요원이 없습니다'}>{filtered ? '조건을 바꿔 다시 찾아 주세요.' : '등록증 심사가 끝나면 이곳에 올라옵니다.'}</Empty>
        ) : (
          data && (
            <div className="overflow-x-auto">
              <table className="table-doc min-w-[760px]">
                <thead>
                  <tr>
                    <th className="w-40">등록번호</th>
                    <th>이름</th>
                    <th className="w-28">구분</th>
                    <th className="w-20">등급</th>
                    <th className="w-44">소속</th>
                    <th className="w-28 text-right">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="group">
                      <td className="font-mono text-[12px] text-muted-foreground">{registryNo(c.id, c.kind, c.grade)}</td>
                      <td>
                        <Link to={`/registry/${c.id}`} className="font-bold group-hover:text-seal">
                          {c.name}
                        </Link>
                        {c.codename && <span className="ml-2 text-[13px] text-muted-foreground">{c.codename}</span>}
                      </td>
                      <td>
                        <KindBadge kind={c.kind} />
                      </td>
                      <td>
                        <GradeBadge grade={c.grade} size="sm" />
                      </td>
                      <td className="text-[14px] text-muted-foreground">{c.affiliation || '—'}</td>
                      <td className="text-right font-mono text-[13px] text-muted-foreground">{fmtDate(c.created_at).replace(/\. /g, '.').replace(/\.$/, '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {pages > 1 && (
          <div className="mt-6 flex justify-center gap-1 text-[13px]">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setPage(p)} className={cx('h-8 w-8', p === cur ? 'bg-foreground font-bold text-background' : 'text-muted-foreground hover:text-foreground')}>
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
