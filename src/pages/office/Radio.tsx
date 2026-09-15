// 상황실 무전: 짧은 글이 바로바로 올라오는 채널 (탐라 대화)
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, KindMark, Loading, cx } from '../../components/ui'
import { api, play, useAsync, useAuth, usePageMeta } from '../../lib/backend'
import { errMsg, fmtDate } from '../../lib/util'
import { CharSelect, NeedCard, PlayHead, hhmm, useApproved, usePolling } from './playKit'

export function Radio() {
  usePageMeta('상황실 무전')
  const { session } = useAuth()
  const admin = session?.role === 'admin'
  const approved = useApproved()
  const teams = useAsync(() => api.listTeams(), [])
  const myTeams = (teams.data ?? []).filter((t) => approved.list.some((c) => c.team_id === t.id))
  const channels = [
    { id: 'main', label: '상황실', desc: '모든 요원이 듣는 채널' },
    { id: 'lounge', label: '휴게실', desc: '잡담 채널' },
    ...myTeams.map((t) => ({ id: t.id, label: t.name, desc: '팀 채널' })),
  ]
  const [channel, setChannel] = useState('main')
  const ch = channels.find((c) => c.id === channel) ?? channels[0]
  const msgs = useAsync(() => play.listRadio(ch.id), [ch.id])
  usePolling(() => msgs.reload(), 8000)

  const [who, setWho] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const list = msgs.data ?? []
  const lastId = list[list.length - 1]?.id

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId, ch.id])

  const me = approved.list.find((c) => c.id === who) ?? approved.list.find((c) => c.team_id === ch.id) ?? approved.list[0]

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!me || !body.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await play.sendRadio(me.id, ch.id, body)
      setBody('')
      await msgs.reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }
  const act = async (fn: () => Promise<void>) => {
    try {
      await fn()
      msgs.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <PlayHead kicker="짧은 글 채널 · 캐입" title="상황실 무전">
        한두 줄씩 가볍게 주고받는 채널입니다. 긴 장면은 <Link to="/office/threads" className="text-seal underline underline-offset-4">교신 기록</Link>에서 이어 주세요. 팀에 배치되면 팀 채널이 생깁니다.
      </PlayHead>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="무전 채널" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannel(c.id)}
              aria-pressed={c.id === ch.id}
              className={cx('shrink-0 border px-3 py-2 text-left transition-colors lg:w-full', c.id === ch.id ? 'border-seal bg-seal text-ink' : 'border-rule hover:border-foreground')}
            >
              <span className="block text-[14.5px] font-bold">
                <span className="mr-1 font-mono">#</span>
                {c.label}
              </span>
              <span className={cx('hidden text-[12px] lg:block', c.id === ch.id ? 'text-ink/70' : 'text-muted-foreground')}>{c.desc}</span>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col border border-rule bg-card">
          <div className="flex items-center gap-2 border-b border-rule px-4 py-2.5 font-mono text-[12px]">
            <span className="blink inline-block h-2 w-2 rounded-full bg-seal" />
            <span className="font-bold text-foreground">CH · {ch.label}</span>
            <span className="ml-auto text-muted-foreground">{list.length}건 · 8초마다 수신</span>
          </div>
          <div ref={logRef} className="h-[56vh] min-h-[320px] overflow-y-auto px-2 py-3 sm:px-4" role="log" aria-live="polite">
            {msgs.loading && !msgs.data && <Loading />}
            {msgs.error ? <ErrorBox error={msgs.error} /> : null}
            {msgs.data && list.length === 0 && <p className="py-20 text-center text-[14px] text-muted-foreground">조용한 채널입니다. 첫 무전을 보내 보세요.</p>}
            <ol className="space-y-0.5">
              {list.map((m, i) => {
                const newDay = i === 0 || new Date(m.created_at).toDateString() !== new Date(list[i - 1].created_at).toDateString()
                return (
                  <li key={m.id}>
                    {newDay && <p className="py-2 text-center font-mono text-[11px] text-muted-foreground">— {fmtDate(m.created_at)} —</p>}
                    <div className={cx('group grid grid-cols-[42px_minmax(0,1fr)] gap-x-2 px-2 py-1.5 hover:bg-muted sm:grid-cols-[48px_minmax(0,1fr)]', m.hidden && 'opacity-40')}>
                      <span className="pt-0.5 font-mono text-[12px] text-muted-foreground">{hhmm(m.created_at)}</span>
                      <p className="min-w-0 text-[15px] leading-[1.7]">
                        <Link to={m.character ? `/registry/${m.character.id}` : '#'} className="mr-2 inline-flex items-center gap-1 font-bold hover:text-seal">
                          {m.character && <KindMark kind={m.character.kind} />}
                          {m.character?.codename || m.character?.name || '알 수 없음'}
                          {m.team_name && <span className="font-normal text-[12px] text-muted-foreground">/{m.team_name}</span>}
                        </Link>
                        <span className="break-words">{m.body}</span>
                        {(m.is_mine || admin) && (
                          <span className="ml-2 inline-flex gap-2 text-[11.5px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                            {admin && (
                              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => act(() => play.setRadioHidden(m.id, !m.hidden))}>
                                {m.hidden ? '가림 해제' : '가리기'}
                              </button>
                            )}
                            <button type="button" className="text-destructive hover:underline" onClick={() => confirm('이 무전을 지울까요?') && act(() => play.deleteRadio(m.id))}>
                              삭제
                            </button>
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
          <div className="border-t border-rule p-3">
            {approved.loading ? null : approved.list.length === 0 ? (
              <NeedCard />
            ) : (
              <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
                <div className="sm:w-48">
                  <CharSelect list={approved.list} value={me?.id ?? ''} onChange={setWho} label="무전 보낼 캐릭터" />
                </div>
                <input className="field flex-1" value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} placeholder="무전 내용 (300자)" aria-label="무전 내용" />
                <button type="submit" className="btn btn-primary px-6" disabled={busy || !body.trim()}>
                  송신
                </button>
              </form>
            )}
            {err ? (
              <div className="mt-2">
                <ErrorBox error={err} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
