import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, ErrorBox, GradeBadge, KindBadge, Loading, Pill, SectionHead, Segmented, cx } from '../../components/ui'
import { RELATION_KINDS, RELATION_OPTIONS, RELATION_TEMPS, RELATION_TONE, relationOptionLabel, relationTempLabel } from '../../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../../lib/backend'
import type { Character, CharacterBrief, Relation, RelationOptions } from '../../lib/types'
import { errMsg, fmtDate, matchingRate, matchingVerdict } from '../../lib/util'

const isPair = (a?: { kind: string } | null, b?: { kind: string } | null) => !!a && !!b && ((a.kind === 'sentinel' && b.kind === 'guide') || (a.kind === 'guide' && b.kind === 'sentinel'))

export default function Bonds() {
  usePageMeta('결속 관계')
  const { session } = useAuth()
  const mine = useAsync(() => api.listMyCharacters(), [])
  const pub = useAsync(() => api.listPublicCharacters(), [])
  const rels = useAsync(() => api.listMyRelations(), [])

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [q, setQ] = useState('')
  const [kind, setKind] = useState(RELATION_KINDS[0])
  const [temp, setTemp] = useState('normal')
  const [allow, setAllow] = useState<string[]>(['mission', 'daily'])
  const [memo, setMemo] = useState('')
  const [picks, setPicks] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [done, setDone] = useState<string | null>(null)

  const myChars = mine.data ?? []
  const myIds = new Set(myChars.map((c) => c.id))
  const from = myChars.find((c) => c.id === (fromId || myChars[0]?.id))
  const candidates = useMemo(() => {
    const map = new Map<string, Character>()
    for (const c of [...(pub.data ?? []), ...myChars]) map.set(c.id, c)
    return [...map.values()].filter((c) => c.id !== from?.id)
  }, [pub.data, myChars, from?.id])
  const filtered = candidates.filter((c) => !q || [c.name, c.codename, c.affiliation].some((v) => v?.toLowerCase().includes(q.toLowerCase())))
  const target = candidates.find((c) => c.id === toId)

  const all = rels.data ?? []
  const incoming = all.filter((r) => r.status === 'requested' && myIds.has(r.to_character_id) && r.created_by !== session?.userId)
  const outgoing = all.filter((r) => r.status === 'requested' && r.created_by === session?.userId)
  const accepted = all.filter((r) => r.status === 'accepted')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!from || !target) return
    setBusy(true)
    setErr(null)
    setDone(null)
    try {
      await api.requestRelation(from.id, target.id, kind, memo, { allow, temp })
      setDone(myIds.has(target.id) ? '두 등록증 모두 내 것이라 바로 성립되었습니다.' : `'${target.name}' 관리인에게 조율 신청을 보냈습니다. 상대가 항목을 고르고 수락하면 성립됩니다.`)
      setToId('')
      setMemo('')
      rels.reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  const act = async (fn: () => Promise<void>, msg?: string) => {
    if (msg && !confirm(msg)) return
    try {
      await fn()
      rels.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  if (mine.loading) return <Loading />

  if (myChars.length === 0)
    return (
      <div className="border border-dashed border-rule bg-card/50 px-6 py-14 text-center">
        <p className="text-[20px] font-bold">결속을 신청할 등록증이 없습니다</p>
        <p className="mt-1 text-[14px] text-muted-foreground">먼저 등록증을 신청해 주세요.</p>
        <Link to="/office/cards/new" className="btn btn-primary mt-5">
          등록증 신청
        </Link>
      </div>
    )

  const rate = from && target && isPair(from, target) ? matchingRate(from.id, target.id) : null

  return (
    <div className="grid gap-12 lg:grid-cols-[440px_1fr] lg:items-start">
      <form onSubmit={submit} className="doc-frame lg:sticky lg:top-28">
        <div className="border-b-2 border-foreground px-5 pb-3 pt-5">
          <p className="text-[13px] text-muted-foreground">결속 신고 · 선택형 조율</p>
          <h2 className="text-[26px] font-black tracking-[-0.03em]">결속 조율 신청서</h2>
        </div>
        <div className="space-y-5 p-5">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">오너끼리 대화하지 않고 체크 항목으로 합의합니다. 상대는 원하지 않는 항목의 체크를 풀고 수락할 수 있습니다.</p>
          <div>
            <label className="form-label" htmlFor="bd-from">
              신청 등록증
            </label>
            <select id="bd-from" className="field" value={from?.id ?? ''} onChange={(e) => setFromId(e.target.value)}>
              {myChars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.grade}급
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="form-label">대상 요원</span>
            {target ? (
              <div className="flex items-center gap-3 border border-foreground bg-card p-2">
                <Avatar src={target.avatar_url} name={target.name} kind={target.kind} className="w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold">{target.name}</p>
                  <KindBadge kind={target.kind} />
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToId('')}>
                  변경
                </button>
              </div>
            ) : (
              <div className="border border-rule">
                <input className="w-full border-b border-rule bg-card px-3 py-2 outline-none" value={q} onChange={(e) => setQ(e.target.value)} placeholder="성명 · 코드네임으로 검색" aria-label="대상 검색" />
                <ul className="max-h-56 overflow-y-auto bg-card">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setToId(c.id)} className="flex w-full items-center gap-2.5 border-b border-rule px-3 py-2 text-left last:border-b-0 hover:bg-muted">
                        <GradeBadge grade={c.grade} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-[14.5px]">
                          {c.name}
                          {c.codename && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">“{c.codename}”</span>}
                        </span>
                        {myIds.has(c.id) && <Pill>내 등록증</Pill>}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-muted-foreground">검색 결과 없음</li>}
                </ul>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="bd-kind">
                관계 종류
              </label>
              <select id="bd-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                {RELATION_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="form-label">관계 온도</span>
              <Segmented name="관계 온도" value={temp} onChange={setTemp} options={RELATION_TEMPS.map((t) => ({ value: t.value as string, label: t.label }))} />
            </div>
          </div>
          <div>
            <span className="form-label">허용하는 전개</span>
            <div className="grid grid-cols-2 gap-1.5">
              {RELATION_OPTIONS.map((o) => {
                const on = allow.includes(o.value)
                return (
                  <label key={o.value} className={cx('flex cursor-pointer items-center gap-2 border px-2.5 py-2 text-[13.5px]', on ? 'border-seal' : 'border-rule hover:border-foreground')}>
                    <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--seal)]" checked={on} onChange={() => setAllow(on ? allow.filter((x) => x !== o.value) : [...allow, o.value])} />
                    {o.label}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="bd-memo">
              한 줄 메모 (선택)
            </label>
            <input id="bd-memo" className="field" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={120} placeholder="예: 교육원 동기" />
          </div>
          {rate != null && (
            <div className="flex items-center justify-between border-l-4 border-seal bg-muted/60 px-3 py-2">
              <span className="text-[13px]">예상 매칭률</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[18px] font-semibold">{rate.toFixed(2)}%</span>
                <Pill tone={matchingVerdict(rate).tone}>{matchingVerdict(rate).label}</Pill>
              </span>
            </div>
          )}
          {err ? <ErrorBox error={err} /> : null}
          {done && <p className="border-l-4 border-ok bg-card px-3 py-2 text-[13.5px]">{done}</p>}
          <button type="submit" className="btn btn-primary w-full py-2.5" disabled={busy || !target}>
            {busy ? '보내는 중…' : '조율 신청 보내기'}
          </button>
        </div>
      </form>

      <div className="min-w-0 space-y-12">
        <section>
          <SectionHead title="받은 조율 신청" action={<span className="font-mono text-[13px] text-seal">{incoming.length}건</span>} />
          {incoming.length === 0 && <p className="py-6 text-center text-[14px] text-muted-foreground">처리할 신청이 없습니다.</p>}
          <ul className="space-y-3">
            {incoming.map((r) => {
              const requested = r.options?.allow ?? []
              const picked = picks[r.id] ?? requested
              return (
                <RelRow
                  key={r.id}
                  r={r}
                  extra={
                    requested.length > 0 ? (
                      <div className="mt-2 border-t border-dashed border-rule pt-2">
                        <p className="text-[12.5px] text-muted-foreground">
                          원하지 않는 항목은 눌러서 빼 주세요{relationTempLabel(r.options?.temp) && ` · 온도 ${relationTempLabel(r.options?.temp)}`}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {requested.map((a) => {
                            const on = picked.includes(a)
                            return (
                              <button
                                key={a}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setPicks({ ...picks, [r.id]: on ? picked.filter((x) => x !== a) : [...picked, a] })}
                                className={cx('inline-flex items-center gap-1.5 border px-2 py-1 text-[13px]', on ? 'border-ok' : 'border-rule text-muted-foreground line-through')}
                              >
                                <span aria-hidden="true" className={cx('grid h-3.5 w-3.5 place-items-center border text-[10px] leading-none', on ? 'border-ok bg-ok text-ink' : 'border-rule')}>
                                  {on ? '✓' : ''}
                                </span>
                                {relationOptionLabel(a)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <OptionChips options={r.options} />
                    )
                  }
                >
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.respondRelation(r.id, true, picked))}>
                    {requested.length ? '고른 항목으로 수락' : '수락'}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => act(() => api.respondRelation(r.id, false), '이 신청을 거절할까요?')}>
                    거절
                  </button>
                </RelRow>
              )
            })}
          </ul>
        </section>

        <section>
          <SectionHead title="보낸 조율 신청" action={<span className="font-mono text-[13px] text-muted-foreground">{outgoing.length}건</span>} />
          {outgoing.length === 0 && <p className="py-6 text-center text-[14px] text-muted-foreground">수락을 기다리는 신청이 없습니다.</p>}
          <ul className="space-y-3">
            {outgoing.map((r) => (
              <RelRow key={r.id} r={r} extra={<OptionChips options={r.options} />}>
                <button type="button" className="btn btn-sm" onClick={() => act(() => api.deleteRelation(r.id), '신청을 철회할까요?')}>
                  철회
                </button>
              </RelRow>
            ))}
          </ul>
        </section>

        <section>
          <SectionHead title="성립된 결속" action={<span className="font-mono text-[13px] text-muted-foreground">{accepted.length}건</span>} />
          {rels.loading && <Loading />}
          {accepted.length === 0 && !rels.loading && <p className="py-6 text-center text-[14px] text-muted-foreground">성립된 결속이 없습니다.</p>}
          <ul className="space-y-3">
            {accepted.map((r) => (
              <RelRow key={r.id} r={r} extra={<OptionChips options={r.options} agreed />}>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => act(() => api.deleteRelation(r.id), '결속을 해지할까요? 상대 등록증에서도 사라집니다.')}>
                  해지
                </button>
              </RelRow>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function OptionChips({ options, agreed }: { options?: RelationOptions; agreed?: boolean }) {
  const allow = options?.allow ?? []
  const temp = relationTempLabel(options?.temp)
  if (!allow.length && !temp) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-dashed border-rule pt-2">
      <span className="text-[12px] text-muted-foreground">
        {agreed ? '합의한 전개' : '신청한 전개'}
        {temp && ` · 온도 ${temp}`}
      </span>
      {allow.map((a) => (
        <Pill key={a} tone={agreed ? 'ok' : 'muted'}>
          {relationOptionLabel(a)}
        </Pill>
      ))}
      {agreed && allow.length === 0 && <span className="text-[12px] text-muted-foreground">없음</span>}
    </div>
  )
}

function Mini({ c }: { c?: CharacterBrief | null }) {
  if (!c) return <span className="text-[14px] text-muted-foreground">비공개 요원</span>
  return (
    <Link to={`/registry/${c.id}`} className="flex min-w-0 items-center gap-2 hover:text-seal">
      <Avatar src={c.avatar_url} name={c.name} kind={c.kind} className="w-9" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[16px] font-bold">{c.name}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">
          {c.grade}급 · {c.codename ?? '—'}
        </span>
      </span>
    </Link>
  )
}

function RelRow({ r, extra, children }: { r: Relation; extra?: ReactNode; children: ReactNode }) {
  const rate = isPair(r.from, r.to) ? matchingRate(r.from_character_id, r.to_character_id) : null
  return (
    <li className="doc-frame-soft p-3.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0">
          <Mini c={r.from} />
        </div>
        <Pill tone={RELATION_TONE[r.kind] ?? 'muted'} solid>
          {r.kind}
        </Pill>
        <div className="flex min-w-0 justify-end">
          <Mini c={r.to} />
        </div>
      </div>
      {r.description && <p className="mt-2 border-t border-dashed border-rule pt-2 text-[13.5px] text-muted-foreground">{r.description}</p>}
      {extra}
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-rule pt-2">
        <span className="font-mono text-[11px] text-muted-foreground">{fmtDate(r.created_at)}</span>
        {rate != null && <span className="font-mono text-[11.5px]">매칭률 {rate.toFixed(1)}%</span>}
        <span className="ml-auto flex gap-1.5">{children}</span>
      </div>
    </li>
  )
}
