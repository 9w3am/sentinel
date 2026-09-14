import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Loading, PageTitle, StatCard, Tabs, WRAP, cx } from '../components/ui'
import { INCIDENT_STATUS, incidentStatusLabel } from '../config/world'
import { api, useAsync, usePageMeta } from '../lib/backend'
import type { Incident } from '../lib/types'

type Filter = 'all' | Incident['status']
const p2 = (n: number) => String(n).padStart(2, '0')
const stamp = (iso: string) => {
  const d = new Date(iso)
  return `${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
const statusColor = (s: Incident['status']) => (s === 'open' ? 'var(--destructive)' : s === 'responding' ? 'var(--seal)' : 'var(--muted-foreground)')

export default function Incidents() {
  usePageMeta('게이트 현황', '상황실에 보고된 게이트 발생 · 대응 기록.')
  const { data, loading, error } = useAsync(() => api.listIncidents(), [])
  const [f, setF] = useState<Filter>('all')
  const all = data ?? []
  const list = all.filter((i) => f === 'all' || i.status === f)
  const count = (s: string) => all.filter((i) => i.status === s).length

  return (
    <>
      <PageTitle title="게이트 현황" crumbs={[{ label: '게이트 현황' }]} desc="상황실에 보고된 게이트 발생 · 대응 기록입니다. 통제 구역에는 접근하지 마십시오." />
      <section className={cx(WRAP, 'pt-10')}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <StatCard label="전체 기록" value={all.length} unit="건" />
          <StatCard label="발생" value={count('open')} unit="건" />
          <StatCard label="대응 중" value={count('responding')} unit="건" />
          <StatCard label="종결" value={count('closed')} unit="건" />
        </div>

        <Tabs
          className="mt-12 mb-4"
          value={f}
          onChange={setF}
          items={[{ value: 'all' as Filter, label: '전체', count: all.length }, ...INCIDENT_STATUS.map((s) => ({ value: s.value as Filter, label: s.label, count: count(s.value) }))]}
        />

        {loading && <Loading />}
        {error ? <ErrorBox error={error} /> : null}
        {data && (
          <div className="overflow-x-auto">
            <table className="table-doc min-w-[760px]">
              <thead>
                <tr>
                  <th className="w-32">발생</th>
                  <th className="w-24">코드</th>
                  <th className="w-16">등급</th>
                  <th className="w-24">위치</th>
                  <th>내용</th>
                  <th className="w-20 text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const c = statusColor(i.status)
                  const closed = i.status === 'closed'
                  return (
                    <tr key={i.id} className={cx(closed && 'text-muted-foreground')}>
                      <td className="font-mono text-[13px] text-muted-foreground">{stamp(i.occurred_at)}</td>
                      <td className="font-mono text-[14px]">{i.code}</td>
                      <td>
                        <span className="grid h-[30px] w-[30px] place-items-center border-2 text-[15px] font-black" style={{ color: closed ? undefined : c }}>
                          {i.grade}
                        </span>
                      </td>
                      <td>{i.location}</td>
                      <td>
                        <Link to={`/incidents/${i.id}`} className="font-medium hover:text-seal">
                          {i.title}
                        </Link>
                        {i.body && <span className="block text-[13px] text-muted-foreground">{i.body}</span>}
                      </td>
                      <td className="text-right text-[14px] font-bold" style={{ color: c }}>
                        {incidentStatusLabel(i.status)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {list.length === 0 && <p className="py-12 text-center text-[14px] text-muted-foreground">해당 상태의 기록이 없습니다.</p>}
          </div>
        )}
      </section>
    </>
  )
}
