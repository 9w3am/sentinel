// 특별 훈련: 추첨 · 짝 뽑기 · 투표 · 제출형 이벤트
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RichText } from '../../components/RichText'
import { Empty, ErrorBox, KindMark, Loading, Pill, cx } from '../../components/ui'
import { play, useAsync, usePageMeta } from '../../lib/backend'
import { EVENT_KINDS, eventKindLabel, type PlayEvent } from '../../lib/playTypes'
import { errMsg, fmtDate } from '../../lib/util'
import { CharSelect, NeedCard, PlayHead, useApproved } from './playKit'

const STATUS: Record<PlayEvent['status'], string> = { open: '접수 중', drawn: '결과 발표', closed: '마감' }

export function TrainingList() {
  usePageMeta('특별 훈련')
  const events = useAsync(() => play.listEvents(), [])
  const list = events.data ?? []
  return (
    <div>
      <PlayHead kicker="이벤트 · 투표" title="특별 훈련">
        운영진이 여는 이벤트입니다. 참가해 두면 마감 뒤 결과가 나옵니다. 받은 결과로 교신이나 게시판에 로그를 남겨 주세요. 참가하지 않아도 불이익은 없습니다.
      </PlayHead>
      <div className="mb-6 grid gap-2 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
        {EVENT_KINDS.map((k) => (
          <div key={k.value} className="border-l-2 border-seal bg-card px-3 py-2">
            <b className="font-bold">{k.label}</b>
            <p className="mt-0.5 text-muted-foreground">{k.desc}</p>
          </div>
        ))}
      </div>
      {events.loading && !events.data && <Loading />}
      {events.error ? <ErrorBox error={events.error} /> : null}
      {events.data && list.length === 0 && <Empty title="열린 훈련이 없습니다">운영진이 이벤트를 열면 여기 뜹니다.</Empty>}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((e) => (
          <li key={e.id}>
            <Link to={`/office/training/${e.id}`} className={cx('group flex h-full flex-col border bg-card p-5 hover:border-seal', e.status === 'open' ? 'border-foreground' : 'border-rule')}>
              <div className="flex items-center gap-1.5">
                <Pill tone="seal" solid={e.status === 'open'}>
                  {eventKindLabel(e.kind)}
                </Pill>
                <Pill tone={e.status === 'drawn' ? 'seal' : 'muted'}>{STATUS[e.status]}</Pill>
                <span className="ml-auto font-mono text-[12px] text-muted-foreground">{fmtDate(e.created_at)}</span>
              </div>
              <p className="mt-3 text-[20px] font-black tracking-[-0.02em] group-hover:text-seal">{e.title}</p>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-[14px] text-muted-foreground">{e.body}</p>
              <p className="mt-auto pt-4 text-[13px] text-muted-foreground">참가 {e.entry_count}건</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TrainingDetail() {
  const { id = '' } = useParams()
  const ev = useAsync(() => play.getEvent(id), [id])
  const mine = useAsync(() => play.listMyEntries(id), [id])
  const results = useAsync(() => play.listEventResults(id), [id, ev.data?.status])
  const counts = useAsync(() => play.listEventCounts(id), [id, ev.data?.status])
  const approved = useApproved()
  const [who, setWho] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const e = ev.data
  usePageMeta(e?.title ?? '특별 훈련')

  if (ev.loading && !e) return <Loading />
  if (ev.error) return <ErrorBox error={ev.error} />
  if (!e)
    return (
      <Empty title="없는 훈련입니다">
        <Link to="/office/training" className="btn mt-4">
          목록으로
        </Link>
      </Empty>
    )

  const me = approved.list.find((c) => c.id === who) ?? approved.list[0]
  const myEntries = mine.data ?? []
  const already = myEntries.find((x) => x.character_id === me?.id)
  const myIds = new Set(approved.list.map((c) => c.id))

  const submit = async (value: string) => {
    if (!me) return
    setBusy(true)
    setErr(null)
    try {
      await play.enterEvent(e.id, me.id, value)
      setText('')
      mine.reload()
      ev.reload()
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }

  const res = results.data ?? []
  const pollTotal = (counts.data ?? []).reduce((s, c) => s + c.count, 0)

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/office/training" className="text-[13px] text-muted-foreground hover:text-seal">
        ← 특별 훈련
      </Link>
      <article className="mt-4 border border-foreground bg-card">
        <div className="tape h-2.5" aria-hidden="true" />
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone="seal" solid>
              {eventKindLabel(e.kind)}
            </Pill>
            <Pill tone={e.status === 'drawn' ? 'seal' : 'muted'}>{STATUS[e.status]}</Pill>
            <span className="ml-auto text-[13px] text-muted-foreground">참가 {e.entry_count}건</span>
          </div>
          <h1 className="mt-3 text-[30px] font-black leading-tight tracking-[-0.03em]">{e.title}</h1>
          <RichText text={e.body} className="mt-4 whitespace-pre-wrap text-[15.5px] leading-[1.9]" />
          <p className="mt-4 text-[13px] text-muted-foreground">{EVENT_KINDS.find((k) => k.value === e.kind)?.desc}</p>
        </div>

        {e.status === 'open' && (
          <div className="border-t border-rule bg-background/40 p-5 sm:p-8">
            <p className="mb-3 text-[15px] font-bold">참가하기</p>
            {approved.loading ? null : approved.list.length === 0 ? (
              <NeedCard />
            ) : (
              <div className="space-y-3">
                <div className="sm:w-64">
                  <CharSelect list={approved.list} value={me?.id ?? ''} onChange={setWho} />
                </div>
                {e.kind === 'poll' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {e.options.map((o) => (
                      <button key={o} type="button" disabled={busy} onClick={() => submit(o)} className={cx('border px-4 py-3 text-left text-[15px] font-bold transition-colors', already?.text === o ? 'border-seal bg-seal text-ink' : 'border-rule hover:border-seal')}>
                        {o}
                        {already?.text === o && <span className="ml-2 text-[12px] font-normal">내 표</span>}
                      </button>
                    ))}
                  </div>
                ) : e.kind === 'pair' ? (
                  <button type="button" className="btn btn-primary" disabled={busy || !!already} onClick={() => submit('')}>
                    {already ? '참가 완료' : '짝 뽑기에 참가'}
                  </button>
                ) : (
                  <form
                    className="flex flex-col gap-2 sm:flex-row"
                    onSubmit={(x) => {
                      x.preventDefault()
                      submit(text)
                    }}
                  >
                    <input className="field flex-1" value={text} onChange={(x) => setText(x.target.value)} maxLength={500} placeholder={e.kind === 'lottery' ? '다른 요원이 받게 될 한 줄' : '제출할 내용'} aria-label="제출 내용" />
                    <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
                      {already ? '다시 제출' : '제출'}
                    </button>
                  </form>
                )}
                {err ? <ErrorBox error={err} /> : null}
              </div>
            )}
            {myEntries.length > 0 && (
              <ul className="mt-5 border-t border-dashed border-rule pt-3 text-[14px]">
                {myEntries.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 py-1.5">
                    <KindMark kind={x.character?.kind ?? ''} />
                    <b>{x.character?.name}</b>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{x.text || '참가함'}</span>
                    <button
                      type="button"
                      className="text-[12.5px] text-destructive hover:underline"
                      onClick={async () => {
                        try {
                          await play.leaveEvent(x.id)
                          mine.reload()
                          ev.reload()
                        } catch (y) {
                          alert(errMsg(y))
                        }
                      }}
                    >
                      취소
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {e.status !== 'open' && (
          <div className="border-t border-rule p-5 sm:p-8">
            <p className="mb-4 text-[15px] font-bold">결과</p>
            {e.kind === 'poll' ? (
              <ul className="space-y-3">
                {[...(counts.data ?? [])].sort((a, b) => b.count - a.count).map((c, i) => (
                  <li key={c.text}>
                    <p className="flex justify-between text-[15px]">
                      <b className={cx(i === 0 && c.count > 0 && 'text-seal')}>{c.text}</b>
                      <span className="font-mono text-[13px] text-muted-foreground">
                        {c.count}표 {pollTotal ? `· ${Math.round((c.count / pollTotal) * 100)}%` : ''}
                      </span>
                    </p>
                    <div className="mt-1 h-2.5 bg-muted">
                      <div className="h-full bg-seal" style={{ width: `${pollTotal ? (c.count / pollTotal) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : res.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">{e.status === 'closed' && e.kind !== 'submit' ? '추첨 없이 마감되었습니다.' : '아직 결과가 없습니다.'}</p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {(e.kind === 'pair' ? res.filter((r, i, all) => !r.partner_id || all.findIndex((x) => x.character_id === r.partner_id) > i) : res).map((r) => (
                  <li key={r.character_id} className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-3 text-[15px]', (myIds.has(r.character_id) || (r.partner_id && myIds.has(r.partner_id))) && 'bg-seal/10')}>
                    <Link to={`/registry/${r.character_id}`} className="inline-flex items-center gap-1.5 font-bold hover:text-seal">
                      <KindMark kind={r.character?.kind ?? ''} /> {r.character?.name ?? '알 수 없음'}
                    </Link>
                    {e.kind === 'pair' ? (
                      <>
                        <span className="text-seal" aria-hidden="true">
                          ⟷
                        </span>
                        {r.partner ? (
                          <Link to={`/registry/${r.partner.id}`} className="inline-flex items-center gap-1.5 font-bold hover:text-seal">
                            <KindMark kind={r.partner.kind} /> {r.partner.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">짝 없음 (홀수)</span>
                        )}
                      </>
                    ) : (
                      <span className="min-w-0 flex-1 text-muted-foreground">
                        {e.kind === 'lottery' ? '받은 것: ' : ''}
                        <span className="text-foreground">{r.text}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </article>
    </div>
  )
}
