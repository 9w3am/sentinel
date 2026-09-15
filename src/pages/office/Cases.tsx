import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RichText } from '../../components/RichText'
import { Empty, ErrorBox, Loading, Pill, SectionHead, cx } from '../../components/ui'
import { APPROACHES, approachLabel, kindLabel } from '../../config/world'
import { api, useAsync, usePageMeta } from '../../lib/backend'
import type { Approach } from '../../lib/types'
import { errMsg, fmtDate, relTime } from '../../lib/util'

const letter = (i: number) => String.fromCharCode(65 + i)

export function CaseList() {
  usePageMeta('조사')
  const cases = useAsync(() => api.listCases(), [])
  const incidents = useAsync(() => api.listIncidents(), [])
  const list = cases.data ?? []

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-3">
        <div>
          <p className="text-[13px] text-muted-foreground">사건 파일</p>
          <h2 className="text-[30px] font-black tracking-[-0.03em]">조사</h2>
        </div>
        <Link to="/guide/guide-system" className="text-[13px] text-muted-foreground hover:text-seal">
          조사 방법 안내 →
        </Link>
      </div>
      <p className="mb-6 text-[13.5px] text-muted-foreground">대상과 방법을 골라 조사합니다. 주사위도 횟수 제한도 없습니다. 찾은 단서는 모든 요원에게 공유되고 팀 실적에 올라갑니다.</p>
      {cases.loading && <Loading />}
      {cases.error ? <ErrorBox error={cases.error} /> : null}
      {cases.data && list.length === 0 && <Empty title="열린 사건 파일이 없습니다">운영진이 사건을 올리면 이곳에 표시됩니다.</Empty>}
      {list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[640px]">
            <thead>
              <tr>
                <th className="w-20">코드</th>
                <th>사건</th>
                <th className="w-40">관련 게이트</th>
                <th className="w-24">상태</th>
                <th className="w-28 text-right">등록</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const gate = incidents.data?.find((i) => i.id === c.incident_id)
                return (
                  <tr key={c.id} className="group">
                    <td className="font-mono text-[13px]">{c.code}</td>
                    <td>
                      <Link to={`/office/cases/${c.id}`} className="font-bold group-hover:text-seal">
                        {c.title}
                      </Link>
                    </td>
                    <td className="text-[13.5px] text-muted-foreground">{gate ? `${gate.code} · ${gate.location}` : '—'}</td>
                    <td>{c.status === 'open' ? <Pill tone="seal" solid>조사 중</Pill> : <Pill>종결</Pill>}</td>
                    <td className="text-right font-mono text-[13px] text-muted-foreground">{fmtDate(c.created_at).replace(/\. /g, '.').replace(/\.$/, '')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function CaseDetail() {
  const { id = '' } = useParams()
  const cs = useAsync(() => api.getCase(id), [id])
  const targets = useAsync(() => api.listCaseTargets(id), [id])
  const findings = useAsync(() => api.listCaseFindings(id), [id])
  const answers = useAsync(() => api.listCaseAnswers(id), [id])
  const mine = useAsync(() => api.listMyCharacters(), [])
  const gate = useAsync(() => (cs.data?.incident_id ? api.getIncident(cs.data.incident_id) : Promise.resolve(null)), [cs.data?.incident_id])
  const [charId, setCharId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [approach, setApproach] = useState<Approach | ''>('')
  const [result, setResult] = useState<{ target: string; approach: Approach; found: boolean; body: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [choice, setChoice] = useState<number | null>(null)
  usePageMeta(cs.data ? `${cs.data.code} ${cs.data.title}` : '조사')

  if (cs.loading) return <Loading />
  if (cs.error) return <ErrorBox error={cs.error} />
  if (!cs.data)
    return (
      <Empty title="없거나 삭제된 사건입니다">
        <Link to="/office/cases" className="btn mt-4">
          사건 파일 목록
        </Link>
      </Empty>
    )

  const c = cs.data
  const open = c.status === 'open'
  const approved = (mine.data ?? []).filter((x) => x.status === 'approved')
  const ch = approved.find((x) => x.id === charId) ?? approved[0]
  const tgs = targets.data ?? []
  const tg = tgs.find((t) => t.id === targetId) ?? null
  const all = findings.data ?? []
  const tried = (t: string, a: string) => !!ch && all.some((f) => f.target_id === t && f.approach === a && f.character_id === ch.id)
  const kindOk = (a: (typeof APPROACHES)[number]) => !a.kind || a.kind === ch?.kind
  const chosen = APPROACHES.find((a) => a.value === approach)
  const canRun = !!ch && !!tg && !!chosen && kindOk(chosen) && !tried(tg.id, chosen.value)
  const myAnswer = ch ? (answers.data ?? []).find((a) => a.character_id === ch.id) : undefined
  const tally = c.choices.map((_, i) => (answers.data ?? []).filter((a) => a.choice === i).length)
  const foundCount = all.filter((f) => f.found).length

  const run = async () => {
    if (!canRun || !ch || !tg || !chosen) return
    setBusy(true)
    setErr(null)
    try {
      const r = await api.investigate(c.id, tg.id, chosen.value, ch.id)
      setResult({ target: tg.name, approach: chosen.value, found: r.found, body: r.body })
      findings.reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  const submitAnswer = async () => {
    if (!ch || choice == null) return
    try {
      await api.answerCase(c.id, ch.id, choice)
      setChoice(null)
      answers.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="space-y-10">
      <Link to="/office/cases" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 사건 파일 목록
      </Link>

      <article className="border border-rule bg-card">
        <header className="border-b border-rule p-6 sm:p-8">
          <p className="font-mono text-[13px] text-seal">{c.code}</p>
          <h1 className="mt-1 text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[36px]">{c.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] text-muted-foreground">
            {open ? <Pill tone="seal" solid>조사 중</Pill> : <Pill>종결</Pill>}
            {gate.data && (
              <Link to={`/incidents/${gate.data.id}`} className="hover:text-seal">
                관련 게이트 {gate.data.code} · {gate.data.location}
              </Link>
            )}
            <span>
              단서 {foundCount}건 · 조사 {all.length}회
            </span>
          </p>
        </header>
        <RichText text={c.briefing} className="whitespace-pre-wrap px-6 py-8 text-[16px] leading-[1.9] sm:px-8" />
        {!open && c.conclusion && (
          <div className="border-t-2 border-seal px-6 py-6 sm:px-8">
            <p className="text-[13px] font-bold text-seal">진상</p>
            <RichText text={c.conclusion} className="mt-2 whitespace-pre-wrap text-[16px] leading-[1.9]" />
          </div>
        )}
      </article>

      <div className="grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
        <section className="doc-frame lg:sticky lg:top-24">
          <div className="border-b-2 border-foreground px-5 pb-3 pt-5">
            <p className="text-[13px] text-muted-foreground">현장 조사</p>
            <h2 className="text-[22px] font-black tracking-[-0.02em]">조사하기</h2>
          </div>
          {!open ? (
            <p className="p-5 text-[14px] text-muted-foreground">종결된 사건입니다. 기록만 볼 수 있습니다.</p>
          ) : mine.loading ? (
            <Loading />
          ) : approved.length === 0 ? (
            <p className="p-5 text-[14px] text-muted-foreground">승인된 등록증이 있어야 조사할 수 있습니다.</p>
          ) : (
            <div className="space-y-4 p-5">
              <div>
                <label className="form-label" htmlFor="cs-char">
                  조사하는 요원
                </label>
                <select
                  id="cs-char"
                  className="field"
                  value={ch?.id ?? ''}
                  onChange={(e) => {
                    setCharId(e.target.value)
                    setResult(null)
                    setApproach('')
                  }}
                >
                  {approved.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {kindLabel(x.kind)} {x.grade}급
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="form-label">대상</span>
                {tgs.length === 0 ? (
                  <p className="text-[14px] text-muted-foreground">조사할 대상이 아직 없습니다.</p>
                ) : (
                  <ul className="border border-rule">
                    {tgs.map((t) => {
                      const on = tg?.id === t.id
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              setTargetId(t.id)
                              setResult(null)
                              setApproach('')
                            }}
                            className={cx('block w-full border-b border-rule px-3 py-2.5 text-left last:border-b-0', on ? 'bg-seal text-ink' : 'hover:bg-muted')}
                          >
                            <span className="block text-[14.5px] font-bold">{t.name}</span>
                            {t.detail && <span className={cx('block text-[12.5px]', on ? 'text-ink/75' : 'text-muted-foreground')}>{t.detail}</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <div>
                <span className="form-label">방법</span>
                <div className="grid gap-1.5">
                  {APPROACHES.map((a) => {
                    const done = !!tg && tried(tg.id, a.value)
                    const disabled = !kindOk(a) || done
                    return (
                      <button
                        key={a.value}
                        type="button"
                        disabled={disabled}
                        aria-pressed={approach === a.value}
                        onClick={() => {
                          setApproach(a.value)
                          setResult(null)
                        }}
                        className={cx('grid grid-cols-[1fr_auto] items-center gap-2 border px-3 py-2 text-left', approach === a.value ? 'border-seal bg-muted' : 'border-rule hover:border-foreground', disabled && 'cursor-not-allowed opacity-40 hover:border-rule')}
                      >
                        <span>
                          <span className="block text-[14.5px] font-bold">{a.label}</span>
                          <span className="block text-[12px] text-muted-foreground">{a.desc}</span>
                        </span>
                        {done && <span className="text-[11.5px] text-muted-foreground">조사함</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              {err ? <ErrorBox error={err} /> : null}
              <button type="button" className="btn btn-primary w-full" onClick={run} disabled={busy || !canRun}>
                {busy ? '조사 중…' : '조사하기'}
              </button>
              {result && (
                <div className="sys-window font-mono text-[13.5px] leading-[1.9]" role="status">
                  <p>
                    <span className="text-seal">[조사]</span> {result.target} · {approachLabel(result.approach)}
                  </p>
                  {result.found ? (
                    <p className="mt-1 whitespace-pre-wrap font-sans text-[15px] leading-[1.8]">{result.body}</p>
                  ) : (
                    <p className="text-muted-foreground">[흔적 없음] 특별한 것은 찾지 못했습니다.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-12">
          <section>
            <SectionHead title="단서 기록" action={<span className="text-[13px] text-muted-foreground">모든 요원에게 공유됩니다</span>} />
            {findings.loading && <Loading />}
            {tgs.map((t) => {
              const rows = all.filter((f) => f.target_id === t.id)
              const hits = rows.filter((f) => f.found)
              const misses = rows.filter((f) => !f.found)
              return (
                <div key={t.id} className="border-b border-rule py-5 first:pt-1">
                  <h3 className="flex items-baseline gap-2 text-[17px] font-bold">
                    {t.name}
                    <span className="font-mono text-[12px] font-normal text-muted-foreground">단서 {hits.length}</span>
                  </h3>
                  {rows.length === 0 && <p className="mt-1 text-[14px] text-muted-foreground">아직 아무도 조사하지 않았습니다.</p>}
                  {hits.length > 0 && (
                    <ul className="mt-3 space-y-4">
                      {hits.map((f) => (
                        <li key={f.id} className="border-l-2 border-seal pl-4">
                          <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                            <Pill tone="seal">{approachLabel(f.approach)}</Pill>
                            <span className="text-foreground">{f.character_name}</span>
                            {f.team_name && <span>{f.team_name}</span>}
                            <span className="font-mono">{relTime(f.created_at)}</span>
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.8]">{f.clue}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {misses.length > 0 && <p className="mt-3 text-[12.5px] text-muted-foreground">흔적 없음 · {misses.map((f) => `${approachLabel(f.approach)}(${f.character_name})`).join(', ')}</p>}
                </div>
              )
            })}
          </section>

          {c.question && (
            <section>
              <SectionHead title="추리" action={<span className="text-[13px] text-muted-foreground">답 {answers.data?.length ?? 0}건</span>} />
              <p className="text-[17px] font-bold">{c.question}</p>
              <ul className="mt-4 space-y-2">
                {c.choices.map((opt, i) => {
                  const correct = !open && c.answer === i
                  const picked = (choice ?? myAnswer?.choice) === i
                  return (
                    <li key={i}>
                      {open ? (
                        <button type="button" disabled={!ch} onClick={() => setChoice(i)} aria-pressed={picked} className={cx('grid w-full grid-cols-[2rem_1fr] items-center border px-3 py-2.5 text-left', picked ? 'border-seal bg-muted' : 'border-rule hover:border-foreground')}>
                          <span className="font-mono text-seal">{letter(i)}</span>
                          {opt}
                        </button>
                      ) : (
                        <div className={cx('grid grid-cols-[2rem_1fr_auto] items-center gap-2 border px-3 py-2.5', correct ? 'border-seal bg-muted' : 'border-rule')}>
                          <span className={cx('font-mono', correct && 'text-seal')}>{letter(i)}</span>
                          <span>
                            {opt}
                            {correct && <b className="ml-2 text-seal">정답</b>}
                          </span>
                          <span className="font-mono text-[13px] text-muted-foreground">{tally[i]}표</span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {open && ch && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" className="btn btn-primary btn-sm" disabled={choice == null || choice === myAnswer?.choice} onClick={submitAnswer}>
                    {myAnswer ? '답 바꾸기' : '답 내기'}
                  </button>
                  <span className="text-[13px] text-muted-foreground">
                    {ch.name} 명의 · {myAnswer ? `지금 답 ${letter(myAnswer.choice)}` : '아직 답을 내지 않았습니다'} · 정답은 종결 때 공개
                  </span>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
