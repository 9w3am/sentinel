// 상시 의뢰함: 혼자 또는 둘이 아무 때나 골라 수행하는 짧은 임무
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, ErrorBox, KindMark, Loading, Pill, cx } from '../../components/ui'
import { api, play, useAsync, usePageMeta } from '../../lib/backend'
import { errMsg, relTime } from '../../lib/util'
import { CharSelect, NeedCard, PlayHead, useApproved } from './playKit'

export function MissionList() {
  usePageMeta('의뢰함')
  const missions = useAsync(() => play.listMissions(), [])
  const runs = useAsync(() => play.listMissionRuns(), [])
  const chars = useAsync(() => api.listPublicCharacters(), [])
  const teams = useAsync(() => api.listTeams(), [])
  const approved = useApproved()
  const myIds = new Set(approved.list.map((c) => c.id))
  const list = missions.data ?? []

  const tally = (teams.data ?? [])
    .map((t) => {
      const ids = new Set((chars.data ?? []).filter((c) => c.team_id === t.id).map((c) => c.id))
      return { t, n: (runs.data ?? []).filter((r) => ids.has(r.character_id) || (r.partner_id && ids.has(r.partner_id))).length }
    })
    .sort((a, b) => b.n - a.n)

  return (
    <div>
      <PlayHead kicker="상시 의뢰 · 혼자서도 둘이서도" title="의뢰함">
        언제든 골라서 수행하는 짧은 의뢰입니다. 캐릭터를 고르고 행동 하나를 선택하면 결과가 나옵니다. 결과를 바탕으로 로그를 써도 되고, 기록만 남겨도 됩니다. 수행 기록은 팀 실적에 올라갑니다.
      </PlayHead>

      {tally.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
          {tally.slice(0, 4).map(({ t, n }) => (
            <Link key={t.id} to={`/teams/${t.id}`} className="bg-card px-4 py-3 hover:text-seal">
              <p className="truncate text-[13px] text-muted-foreground">{t.name}</p>
              <p className="text-[26px] font-black tabular-nums leading-tight">
                {n}
                <span className="ml-1 text-[13px] font-normal text-muted-foreground">건 수행</span>
              </p>
            </Link>
          ))}
        </div>
      )}

      {missions.loading && !missions.data && <Loading />}
      {missions.error ? <ErrorBox error={missions.error} /> : null}
      {missions.data && list.length === 0 && <Empty title="올라온 의뢰가 없습니다">운영진이 의뢰를 올리면 여기 뜹니다.</Empty>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => {
          const done = (runs.data ?? []).some((r) => r.mission_id === m.id && (myIds.has(r.character_id) || (r.partner_id && myIds.has(r.partner_id))))
          return (
            <li key={m.id}>
              <Link to={`/office/missions/${m.id}`} className={cx('group flex h-full flex-col border bg-card p-5 hover:border-seal', m.status === 'open' ? 'border-rule' : 'border-dashed border-rule opacity-70')}>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  {m.area && <Pill>{m.area}</Pill>}
                  <Pill tone="seal">{m.slots === 2 ? '2인' : '1인'}</Pill>
                  {m.status !== 'open' && <Pill>마감</Pill>}
                  {done && (
                    <Pill tone="seal" solid>
                      수행함
                    </Pill>
                  )}
                </div>
                <p className="mt-3 text-[19px] font-black leading-snug tracking-[-0.02em] group-hover:text-seal">{m.title}</p>
                <p className="mt-1 line-clamp-3 text-[14px] text-muted-foreground">{m.body}</p>
                <p className="mt-auto pt-4 font-mono text-[12px] text-muted-foreground">수행 {m.run_count}건</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function MissionDetail() {
  const { id = '' } = useParams()
  const missions = useAsync(() => play.listMissions(), [])
  const runs = useAsync(() => play.listMissionRuns(id), [id])
  const chars = useAsync(() => api.listPublicCharacters(), [])
  const approved = useApproved()
  const [who, setWho] = useState('')
  const [partner, setPartner] = useState('')
  const [choice, setChoice] = useState(-1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [outcome, setOutcome] = useState<string | null>(null)
  const m = (missions.data ?? []).find((x) => x.id === id)
  usePageMeta(m?.title ?? '의뢰함')

  if (missions.loading && !missions.data) return <Loading />
  if (missions.error) return <ErrorBox error={missions.error} />
  if (!m)
    return (
      <Empty title="없는 의뢰입니다">
        <Link to="/office/missions" className="btn mt-4">
          의뢰함으로
        </Link>
      </Empty>
    )

  const list = runs.data ?? []
  const done = new Set(list.map((r) => r.character_id))
  const available = approved.list.filter((c) => !done.has(c.id))
  const me = available.find((c) => c.id === who) ?? available[0]
  const partners = (chars.data ?? []).filter((c) => c.status === 'approved' && c.id !== me?.id)

  const submit = async () => {
    if (!me || choice < 0) return
    setBusy(true)
    setErr(null)
    try {
      await play.runMission(m.id, { character_id: me.id, partner_id: m.slots === 2 ? partner || null : null, choice, note })
      setOutcome(m.choices[choice]?.outcome ?? '')
      setChoice(-1)
      setNote('')
      runs.reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/office/missions" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 의뢰함
      </Link>
      <article className="mt-4 border border-rule bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-2.5 font-mono text-[12px] text-muted-foreground">
          <span>의뢰서 {m.id.slice(0, 6).toUpperCase()}</span>
          {m.area && <span>· {m.area}</span>}
          <span>· {m.slots === 2 ? '2인 수행' : '1인 수행'}</span>
          {m.status !== 'open' && <Pill>마감</Pill>}
        </div>
        <div className="p-5 sm:p-8">
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em]">{m.title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-[15.5px] leading-[1.9]">{m.body}</p>
        </div>

        {outcome !== null && (
          <div className="relative mx-5 mb-6 border-2 border-seal p-5 sm:mx-8" role="status">
            <span className="stamp stamp-in absolute -top-4 right-4 bg-card px-2 text-[14px] text-seal">완 료</span>
            <p className="text-[13px] text-muted-foreground">수행 결과</p>
            <p className="mt-2 whitespace-pre-wrap text-[16px] leading-[1.85]">{outcome}</p>
            <p className="mt-3 text-[13px] text-muted-foreground">
              이어서 <Link to="/office/threads/new" className="text-seal underline underline-offset-4">교신</Link>이나 <Link to="/office/board/new?c=report" className="text-seal underline underline-offset-4">보고서</Link>로 로그를 남겨도 좋아요.
            </p>
          </div>
        )}

        {m.status === 'open' && (
          <div className="border-t border-rule p-5 sm:p-8">
            <p className="mb-3 text-[15px] font-bold">수행하기</p>
            {approved.loading ? null : approved.list.length === 0 ? (
              <NeedCard />
            ) : available.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">내 캐릭터가 모두 이 의뢰를 수행했습니다.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="form-label">수행할 캐릭터</span>
                    <CharSelect list={available} value={me?.id ?? ''} onChange={setWho} />
                  </div>
                  {m.slots === 2 && (
                    <div>
                      <span className="form-label">함께한 캐릭터 (선택)</span>
                      <select className="field" value={partner} onChange={(e) => setPartner(e.target.value)} aria-label="함께한 캐릭터">
                        <option value="">혼자 수행</option>
                        {partners.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.codename ? ` · ${c.codename}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <span className="form-label">어떻게 할까요</span>
                  <div className="grid gap-2">
                    {m.choices.map((c, i) => (
                      <button key={i} type="button" onClick={() => setChoice(i)} aria-pressed={choice === i} className={cx('flex items-start gap-3 border px-4 py-3 text-left text-[15px] transition-colors', choice === i ? 'border-seal bg-seal/10' : 'border-rule hover:border-foreground')}>
                        <span className={cx('grid h-6 w-6 shrink-0 place-items-center border font-mono text-[12px]', choice === i ? 'border-seal bg-seal text-ink' : 'border-rule')}>{String.fromCharCode(65 + i)}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="ms-note">
                    기록 한 줄 또는 로그 주소 (선택)
                  </label>
                  <input id="ms-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
                </div>
                {err ? <ErrorBox error={err} /> : null}
                <div className="flex justify-end">
                  <button type="button" className="btn btn-primary px-6" disabled={busy || choice < 0} onClick={submit}>
                    {busy ? '수행 중…' : '수행'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </article>

      <section className="mt-8">
        <p className="mb-2 border-b-2 border-foreground pb-2 text-[18px] font-black">수행 기록 {list.length}</p>
        {list.length === 0 && <p className="py-8 text-center text-[14px] text-muted-foreground">아직 수행한 요원이 없습니다.</p>}
        <ul className="divide-y divide-rule">
          {list.map((r) => (
            <li key={r.id} className="py-3 text-[14.5px]">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link to={`/registry/${r.character_id}`} className="inline-flex items-center gap-1 font-bold hover:text-seal">
                  <KindMark kind={r.character?.kind ?? ''} /> {r.character?.name}
                </Link>
                {r.partner && (
                  <>
                    <span className="text-muted-foreground">와</span>
                    <Link to={`/registry/${r.partner.id}`} className="inline-flex items-center gap-1 font-bold hover:text-seal">
                      <KindMark kind={r.partner.kind} /> {r.partner.name}
                    </Link>
                  </>
                )}
                <Pill>{String.fromCharCode(65 + r.choice)}</Pill>
                <span className="ml-auto font-mono text-[12px] text-muted-foreground">{relTime(r.created_at)}</span>
                {r.is_mine && (
                  <button
                    type="button"
                    className="text-[12px] text-destructive hover:underline"
                    onClick={async () => {
                      if (!confirm('수행 기록을 지울까요?')) return
                      try {
                        await play.deleteMissionRun(r.id)
                        runs.reload()
                      } catch (e) {
                        alert(errMsg(e))
                      }
                    }}
                  >
                    지우기
                  </button>
                )}
              </p>
              <p className="mt-1 text-muted-foreground">{m.choices[r.choice]?.outcome}</p>
              {r.note && (
                /^https?:\/\//.test(r.note) ? (
                  <a href={r.note} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[13px] text-seal underline underline-offset-4">
                    {r.note}
                  </a>
                ) : (
                  <p className="mt-1 text-[13.5px]">“{r.note}”</p>
                )
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
