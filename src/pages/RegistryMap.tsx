import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, GradeBadge, KindBadge, Loading, PageTitle, Pill, TONE, WRAP, cx, kindColor } from '../components/ui'
import { RELATION_KINDS, RELATION_TONE } from '../config/world'
import { api, useAsync, usePageMeta } from '../lib/backend'

export default function RegistryMap() {
  usePageMeta('결속 관계도', '공개 요원 사이에 성립된 결속.')
  const chars = useAsync(() => api.listPublicCharacters(), [])
  const rels = useAsync(() => api.listAcceptedRelations(), [])
  const [active, setActive] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState('')

  const nodes = useMemo(() => chars.data ?? [], [chars.data])
  const edges = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id))
    return (rels.data ?? []).filter((r) => ids.has(r.from_character_id) && ids.has(r.to_character_id) && (!kindFilter || r.kind === kindFilter))
  }, [rels.data, nodes, kindFilter])

  const n = nodes.length
  const R = Math.max(220, n * 22)
  const SIZE = R * 2 + 240
  const C = SIZE / 2
  const nodeR = n > 20 ? 20 : 26
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; a: number }>()
    nodes.forEach((c, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2
      m.set(c.id, { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R, a })
    })
    return m
  }, [nodes, n, C, R])

  const focus = hover ?? active
  const linked = useMemo(() => {
    if (!focus) return null
    const s = new Set([focus])
    edges.forEach((e) => {
      if (e.from_character_id === focus) s.add(e.to_character_id)
      if (e.to_character_id === focus) s.add(e.from_character_id)
    })
    return s
  }, [focus, edges])

  const activeChar = nodes.find((c) => c.id === active)
  const activeEdges = edges.filter((e) => e.from_character_id === active || e.to_character_id === active)
  const usedKinds = RELATION_KINDS.filter((k) => (rels.data ?? []).some((r) => r.kind === k))
  const nameOf = (id: string) => nodes.find((x) => x.id === id)?.name ?? '비공개'

  return (
    <>
      <PageTitle title="결속 관계도" crumbs={[{ label: '요원 명부', to: '/registry' }, { label: '결속 관계도' }]} desc="공개 요원 사이에 성립된 결속입니다. 요원을 누르면 그 요원의 결속만 보입니다." />
      <section className={cx(WRAP, 'pt-8')}>
        {(chars.loading || rels.loading) && <Loading />}
        {chars.data && n === 0 && <Empty title="표시할 요원이 없습니다" />}
        {n > 0 && (
          <>
            <div className="mb-4 flex flex-wrap gap-0.5" role="tablist">
              <button type="button" role="tab" aria-selected={!kindFilter} className="tab" onClick={() => setKindFilter('')}>
                전체 <span className="ml-1 text-[12px] opacity-60">{rels.data?.length ?? 0}</span>
              </button>
              {usedKinds.map((k) => (
                <button key={k} type="button" role="tab" aria-selected={kindFilter === k} className="tab inline-flex items-center gap-1.5" onClick={() => setKindFilter(kindFilter === k ? '' : k)}>
                  <span className="h-2 w-2" style={{ background: TONE[RELATION_TONE[k] ?? 'muted'] }} />
                  {k}
                </button>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="corners relative overflow-hidden bg-card">
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block h-auto w-full touch-manipulation select-none" onClick={() => setActive(null)} role="img" aria-label="결속 관계도">
                  <circle cx={C} cy={C} r={R} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />
                  {edges.map((e) => {
                    const a = pos.get(e.from_character_id)!
                    const b = pos.get(e.to_character_id)!
                    const mx = (a.x + b.x) / 2
                    const my = (a.y + b.y) / 2
                    const qx = mx + (C - mx) * 0.35
                    const qy = my + (C - my) * 0.35
                    const tone = TONE[RELATION_TONE[e.kind] ?? 'muted']
                    const on = !focus || e.from_character_id === focus || e.to_character_id === focus
                    const lx = 0.25 * a.x + 0.5 * qx + 0.25 * b.x
                    const ly = 0.25 * a.y + 0.5 * qy + 0.25 * b.y
                    return (
                      <g key={e.id} style={{ opacity: on ? 1 : 0.1, transition: 'opacity .2s' }}>
                        <path d={`M${a.x},${a.y} Q${qx},${qy} ${b.x},${b.y}`} fill="none" stroke={tone} strokeWidth={e.kind === '각인' ? 3.5 : 2} strokeDasharray={e.kind === '임시 가이딩' ? '7 5' : e.kind === '적대' || e.kind === '라이벌' ? '2 4' : undefined} />
                        {focus && on && (
                          <g>
                            <rect x={lx - e.kind.length * 7 - 8} y={ly - 12} width={e.kind.length * 14 + 16} height={24} fill="#0f0f0d" stroke={tone} />
                            <text x={lx} y={ly + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={tone} fontFamily="Noto Sans KR">
                              {e.kind}
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                  {nodes.map((c) => {
                    const p = pos.get(c.id)!
                    const dim = linked && !linked.has(c.id)
                    const isActive = active === c.id
                    const anchor = Math.cos(p.a) < -0.2 ? 'end' : Math.cos(p.a) > 0.2 ? 'start' : 'middle'
                    const lx = p.x + Math.cos(p.a) * (nodeR + 12)
                    const ly = p.y + Math.sin(p.a) * (nodeR + 12) + (Math.abs(Math.cos(p.a)) <= 0.2 ? (Math.sin(p.a) > 0 ? 14 : -10) : 5)
                    return (
                      <g
                        key={c.id}
                        className="cursor-pointer"
                        style={{ opacity: dim ? 0.25 : 1, transition: 'opacity .2s' }}
                        onMouseEnter={() => setHover(c.id)}
                        onMouseLeave={() => setHover(null)}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setActive(isActive ? null : c.id)
                        }}
                      >
                        <rect x={p.x - nodeR} y={p.y - nodeR} width={nodeR * 2} height={nodeR * 2} fill={isActive ? kindColor(c.kind) : '#0f0f0d'} stroke={kindColor(c.kind)} strokeWidth="2" />
                        <text x={p.x} y={p.y + 7} textAnchor="middle" fontSize={nodeR * 0.72} fontWeight="900" fill={isActive ? '#0f0f0d' : kindColor(c.kind)} fontFamily="Noto Sans KR">
                          {c.grade}
                        </text>
                        <text x={lx} y={ly} textAnchor={anchor} fontSize="16" fontWeight="700" fill="#e8e5dc" fontFamily="Noto Sans KR" paintOrder="stroke" stroke="#171714" strokeWidth="5">
                          {c.name}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <aside className="space-y-8">
                {activeChar ? (
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b-2 border-foreground pb-3">
                      <div className="min-w-0">
                        <KindBadge kind={activeChar.kind} />
                        <p className="mt-1 truncate text-[26px] font-black tracking-[-0.03em]">{activeChar.name}</p>
                        <p className="truncate text-[13px] text-muted-foreground">{activeChar.affiliation || '소속 없음'}</p>
                      </div>
                      <GradeBadge grade={activeChar.grade} />
                    </div>
                    <ul>
                      {activeEdges.map((e) => {
                        const otherId = e.from_character_id === active ? e.to_character_id : e.from_character_id
                        return (
                          <li key={e.id} className="flex items-center gap-2 border-b border-rule py-2.5 text-[14px]">
                            <Pill tone={RELATION_TONE[e.kind] ?? 'muted'} solid>
                              {e.kind}
                            </Pill>
                            <button type="button" className="truncate font-medium hover:text-seal" onClick={() => setActive(otherId)}>
                              {nameOf(otherId)}
                            </button>
                          </li>
                        )
                      })}
                      {activeEdges.length === 0 && <li className="border-b border-rule py-3 text-[14px] text-muted-foreground">성립된 결속 없음</li>}
                    </ul>
                    <Link to={`/registry/${activeChar.id}`} className="btn btn-primary mt-4 w-full">
                      등록 기록 보기
                    </Link>
                  </div>
                ) : (
                  <p className="border-l-2 border-seal pl-3 text-[14px] text-muted-foreground">도식의 요원을 누르면 결속 목록이 여기에 나옵니다.</p>
                )}
                <div>
                  <p className="mb-3 text-[14px] font-bold">범례</p>
                  <ul className="space-y-2 text-[13.5px] text-muted-foreground">
                    {(
                      [
                        ['var(--seal)', 3.5, undefined, '각인 (굵은 선)'],
                        ['var(--warn)', 2, '7 5', '임시 가이딩'],
                        ['var(--destructive)', 2, '2 4', '라이벌 · 적대'],
                        ['var(--foreground)', 2, undefined, '동기 · 사제 · 상하'],
                      ] as [string, number, string | undefined, string][]
                    ).map(([c, w, dash, label]) => (
                      <li key={label} className="flex items-center gap-3">
                        <svg width="36" height="8" aria-hidden="true">
                          <line x1="0" x2="36" y1="4" y2="4" stroke={c} strokeWidth={w} strokeDasharray={dash} />
                        </svg>
                        {label}
                      </li>
                    ))}
                    <li className="flex flex-wrap gap-3 border-t border-rule pt-3">
                      {['sentinel', 'guide', 'normal', 'undetermined'].map((k) => (
                        <KindBadge key={k} kind={k} />
                      ))}
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </>
  )
}
