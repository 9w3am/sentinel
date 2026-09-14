import { useMemo, useState } from 'react'
import { Avatar, Emblem, GradeBadge, KindBadge, Loading, Pill, SealStamp, TONE } from '../../components/ui'
import { WORLD } from '../../config/world'
import { api, useAsync, usePageMeta } from '../../lib/backend'
import type { Character } from '../../lib/types'
import { fmtDate, matchingRate, matchingVerdict } from '../../lib/util'

export default function Matching() {
  usePageMeta('매칭률 조회')
  const mine = useAsync(() => api.listMyCharacters(), [])
  const pub = useAsync(() => api.listPublicCharacters(), [])
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  const list = useMemo(() => {
    const m = new Map<string, Character>()
    for (const c of [...(mine.data ?? []), ...(pub.data ?? [])]) m.set(c.id, c)
    return [...m.values()]
  }, [mine.data, pub.data])

  if (mine.loading || pub.loading) return <Loading />

  const ca = list.find((c) => c.id === a)
  const cb = list.find((c) => c.id === b)
  const pair = ca && cb && ca.id !== cb.id
  const valid = pair && ((ca.kind === 'sentinel' && cb.kind === 'guide') || (ca.kind === 'guide' && cb.kind === 'sentinel'))
  const rate = pair ? matchingRate(ca.id, cb.id) : null
  const verdict = rate != null ? matchingVerdict(rate) : null
  const gradeGap = pair ? Math.abs(['SS', 'S', 'A', 'B', 'C', 'D', 'E'].indexOf(ca.grade) - ['SS', 'S', 'A', 'B', 'C', 'D', 'E'].indexOf(cb.grade)) : 0

  const Picker = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <span className="form-label">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— 요원 선택 —</option>
        {list.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.kind === 'sentinel' ? '센티넬' : c.kind === 'guide' ? '가이드' : '기타'} {c.grade}급
          </option>
        ))}
      </select>
    </div>
  )

  const R = 80
  const circ = Math.PI * R // 반원

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 border-b-2 border-foreground pb-3">
        <p className="text-[13px] text-muted-foreground">요원 전용</p>
        <h2 className="title-serif text-[30px] font-bold">매칭률 조회</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">두 요원의 매칭률을 조회합니다. 같은 두 사람은 언제 조회해도 같은 값이 나옵니다.</p>
      </div>

      <div className="doc-frame-soft grid gap-4 p-5 sm:grid-cols-2">
        <Picker label="대상 1" value={a} onChange={setA} />
        <Picker label="대상 2" value={b} onChange={setB} />
      </div>

      {pair && rate != null && verdict ? (
        <article className="doc-frame relative mt-6 overflow-hidden">
          <header className="flex items-center gap-3 border-b-2 border-foreground px-6 py-4">
            <Emblem size={36} className="text-primary" />
            <div className="leading-tight">
              <p className="title-serif text-[19px] font-bold">매칭률 검사 성적서</p>
              <p className="text-[13px] text-muted-foreground">{WORLD.orgName} 판정국 · {fmtDate(new Date().toISOString())}</p>
            </div>
          </header>
          <div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_auto_1fr]">
            {[ca, cb].map((c, i) => (
              <div key={c.id} className={i === 1 ? 'md:order-3 md:text-right' : ''}>
                <div className={`flex items-center gap-3 ${i === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <Avatar src={c.avatar_url} name={c.name} kind={c.kind} className="w-20" />
                  <div className="min-w-0">
                    <KindBadge kind={c.kind} />
                    <p className="title-serif mt-1 truncate text-[24px] font-bold">{c.name}</p>
                    <div className={`mt-1 flex items-center gap-2 ${i === 1 ? 'md:justify-end' : ''}`}>
                      <GradeBadge grade={c.grade} size="sm" />
                      <span className="text-[13px] text-muted-foreground">{c.details?.guiding_type || c.affiliation || ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="md:order-2">
              <svg viewBox="0 0 200 118" className="mx-auto w-56" role="img" aria-label={`매칭률 ${rate}%`}>
                <path d={`M20,100 A${R},${R} 0 0 1 180,100`} fill="none" stroke="var(--muted)" strokeWidth="16" />
                <path d={`M20,100 A${R},${R} 0 0 1 180,100`} fill="none" stroke={TONE[verdict.tone]} strokeWidth="16" strokeDasharray={`${(rate / 100) * circ} ${circ}`} style={{ transition: 'stroke-dasharray .8s ease' }} />
                {[0, 25, 50, 75, 100].map((t) => {
                  const ang = Math.PI - (t / 100) * Math.PI
                  return <line key={t} x1={100 + Math.cos(ang) * 64} y1={100 - Math.sin(ang) * 64} x2={100 + Math.cos(ang) * 70} y2={100 - Math.sin(ang) * 70} stroke="var(--muted-foreground)" strokeWidth="1.2" />
                })}
                <text x="100" y="92" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="30" fontWeight="600" fill="var(--foreground)">
                  {rate.toFixed(2)}
                </text>
                <text x="100" y="110" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="10" letterSpacing="2" fill="var(--muted-foreground)">
                  PERCENT
                </text>
              </svg>
              <div className="mt-2 text-center">
                <Pill tone={verdict.tone} solid={verdict.tone !== 'muted'} className="text-[12.5px]">
                  {verdict.label}
                </Pill>
              </div>
            </div>
          </div>
          <div className="border-t border-rule px-6 py-4 text-[14px] leading-relaxed">
            <p className="label-mono mb-1">판정 소견</p>
            {valid ? (
              <p>
                두 요원의 매칭률은 <strong>{rate.toFixed(2)}%</strong>, '{verdict.label}' 구간입니다.
                {gradeGap >= 2 && ' 다만 등급 차이가 두 단계 이상이라 실제 효율은 더 낮을 수 있습니다.'}
                {gradeGap < 2 && rate >= 75 && ' 등급 차이가 적어 수치만큼 안정될 가능성이 높습니다.'}
              </p>
            ) : (
              <p className="text-muted-foreground">센티넬·가이드 조합이 아니라서 참고용 수치입니다.</p>
            )}
          </div>
          {valid && rate >= 75 && <SealStamp label="적 합" top="판정국" size={96} className="stamp-in absolute right-6 top-20 hidden sm:inline-block" />}
        </article>
      ) : (
        <div className="mt-6 border border-dashed border-rule bg-card/50 px-6 py-14 text-center">
          <p className="text-[18px] font-bold">{a && b && a === b ? '서로 다른 두 요원을 골라 주세요' : '조회할 두 요원을 골라 주세요'}</p>
        </div>
      )}
    </div>
  )
}
