// 관리부 콘솔: 특별 훈련 · 의뢰함 · 교신/무전 관리 · MPC · 휴직
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorBox, KindMark, Loading, Pill, Segmented, cx } from '../../components/ui'
import { api, play, useAsync } from '../../lib/backend'
import { DUTY_LABELS, EVENT_KINDS, eventKindLabel, type DutyKind, type EventKind, type Mission, type MissionChoice, type PlayEvent } from '../../lib/playTypes'
import { errMsg, relTime } from '../../lib/util'

async function run(fn: () => Promise<unknown>, after?: () => void) {
  try {
    await fn()
    after?.()
  } catch (e) {
    alert(errMsg(e))
  }
}

// ── 특별 훈련
export function EventsAdmin() {
  const events = useAsync(() => play.listEvents(), [])
  const [edit, setEdit] = useState<Partial<PlayEvent> | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const list = events.data ?? []
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[14px] text-muted-foreground">추첨(물약 같은 효과 나누기) · 짝 뽑기(수갑) · 투표(기수 끝 투표 등) · 제출(마니또 답, 롤링페이퍼 한 줄 등)을 엽니다. 접수 → 추첨 또는 마감 순서로 진행합니다.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit({ kind: 'lottery', title: '', body: '', options: [] })}>
          새 훈련
        </button>
      </div>
      {edit && <EventForm initial={edit} onDone={() => (setEdit(null), events.reload())} onCancel={() => setEdit(null)} />}
      {events.loading && !events.data && <Loading />}
      {events.error ? <ErrorBox error={events.error} /> : null}
      {events.data && list.length === 0 && <Empty title="연 훈련이 없습니다" />}
      <ul className="divide-y divide-rule border-y border-rule">
        {list.map((e) => (
          <li key={e.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="seal">{eventKindLabel(e.kind)}</Pill>
              <Pill tone={e.status === 'open' ? 'seal' : 'muted'} solid={e.status === 'open'}>
                {e.status === 'open' ? '접수 중' : e.status === 'drawn' ? '결과 발표' : '마감'}
              </Pill>
              <Link to={`/office/training/${e.id}`} className="font-bold hover:text-seal">
                {e.title}
              </Link>
              <span className="text-[13px] text-muted-foreground">참가 {e.entry_count}</span>
              <span className="ml-auto flex flex-wrap gap-1.5">
                <button type="button" className="btn btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  참가자
                </button>
                {(e.kind === 'lottery' || e.kind === 'pair') && (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => confirm(e.status === 'open' ? '접수를 닫고 추첨할까요?' : '다시 추첨하면 결과가 바뀝니다. 계속할까요?') && run(() => play.drawEvent(e.id), events.reload)}>
                    {e.status === 'open' ? '추첨' : '다시 추첨'}
                  </button>
                )}
                {(e.kind === 'poll' || e.kind === 'submit') && e.status === 'open' && (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => confirm('마감하고 결과를 공개할까요?') && run(() => play.setEventStatus(e.id, 'closed'), events.reload)}>
                    마감 · 공개
                  </button>
                )}
                {e.status !== 'open' && (
                  <button type="button" className="btn btn-sm" onClick={() => run(() => play.setEventStatus(e.id, 'open'), events.reload)}>
                    다시 접수
                  </button>
                )}
                <button type="button" className="btn btn-sm" onClick={() => setEdit(e)}>
                  수정
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => confirm('훈련과 참가 기록을 지울까요?') && run(() => play.deleteEvent(e.id), events.reload)}>
                  삭제
                </button>
              </span>
            </div>
            {open === e.id && <Entries eventId={e.id} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Entries({ eventId }: { eventId: string }) {
  const entries = useAsync(() => play.listEntriesAdmin(eventId), [eventId])
  if (entries.loading && !entries.data) return <Loading />
  if (entries.error) return <ErrorBox error={entries.error} />
  const list = entries.data ?? []
  return (
    <div className="mt-3 overflow-x-auto">
      {list.length === 0 ? (
        <p className="py-3 text-[13px] text-muted-foreground">참가자가 없습니다.</p>
      ) : (
        <table className="table-doc min-w-[560px] text-[14px]">
          <thead>
            <tr>
              <th className="w-40">캐릭터</th>
              <th className="w-28">오너</th>
              <th>제출</th>
              <th className="w-24 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id}>
                <td>
                  <KindMark kind={x.character?.kind ?? ''} /> {x.character?.name}
                </td>
                <td className="text-muted-foreground">{x.owner_name}</td>
                <td>{x.text || '—'}</td>
                <td className="text-right">
                  <button type="button" className="text-[12.5px] text-destructive hover:underline" onClick={() => confirm('이 참가를 지울까요?') && run(() => play.leaveEvent(x.id), entries.reload)}>
                    지우기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function EventForm({ initial, onDone, onCancel }: { initial: Partial<PlayEvent>; onDone: () => void; onCancel: () => void }) {
  const [kind, setKind] = useState<EventKind>(initial.kind ?? 'lottery')
  const [title, setTitle] = useState(initial.title ?? '')
  const [body, setBody] = useState(initial.body ?? '')
  const [options, setOptions] = useState((initial.options ?? []).join('\n'))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await play.saveEvent({ id: initial.id, kind, title, body, options: kind === 'poll' ? options.split('\n') : [] })
      onDone()
    } catch (e) {
      setErr(e)
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4 border border-seal bg-card p-5">
      <div>
        <span className="form-label">종류</span>
        <Segmented name="훈련 종류" value={kind} onChange={setKind} options={EVENT_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
        <p className="mt-1 text-[12.5px] text-muted-foreground">{EVENT_KINDS.find((k) => k.value === kind)?.desc}</p>
      </div>
      <input className="field text-[17px]" placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="제목" />
      <textarea className="field min-h-32 leading-[1.8]" placeholder="안내 (무엇을 하는지, 결과로 무엇을 하면 되는지)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} aria-label="안내" />
      {kind === 'poll' && <textarea className="field min-h-24" placeholder={'보기를 한 줄에 하나씩'} value={options} onChange={(e) => setOptions(e.target.value)} aria-label="투표 보기" />}
      {err ? <ErrorBox error={err} /> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="btn btn-sm btn-primary" disabled={busy || !title.trim() || (kind === 'poll' && options.split('\n').filter((o) => o.trim()).length < 2)} onClick={save}>
          저장
        </button>
      </div>
    </div>
  )
}

// ── 의뢰함
export function MissionsAdmin() {
  const missions = useAsync(() => play.listMissions(), [])
  const [edit, setEdit] = useState<Partial<Mission> | null>(null)
  const list = missions.data ?? []
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[14px] text-muted-foreground">요원이 아무 때나 골라 수행하는 짧은 의뢰입니다. 선택지마다 결과 문장을 적어 두면 고른 뒤에 보여 줍니다. 판정이나 주사위는 없습니다.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit({ title: '', body: '', area: '', slots: 1, choices: [{ label: '', outcome: '' }, { label: '', outcome: '' }] })}>
          새 의뢰
        </button>
      </div>
      {edit && <MissionForm initial={edit} onDone={() => (setEdit(null), missions.reload())} onCancel={() => setEdit(null)} />}
      {missions.loading && !missions.data && <Loading />}
      {missions.error ? <ErrorBox error={missions.error} /> : null}
      <ul className="divide-y divide-rule border-y border-rule">
        {list.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 py-3">
            {m.area && <Pill>{m.area}</Pill>}
            <Pill tone="seal">{m.slots === 2 ? '2인' : '1인'}</Pill>
            <Link to={`/office/missions/${m.id}`} className={cx('font-bold hover:text-seal', m.status !== 'open' && 'text-muted-foreground line-through')}>
              {m.title}
            </Link>
            <span className="text-[13px] text-muted-foreground">선택지 {m.choices.length} · 수행 {m.run_count}</span>
            <span className="ml-auto flex gap-1.5">
              <button type="button" className="btn btn-sm" onClick={() => run(() => play.saveMission({ ...m, status: m.status === 'open' ? 'closed' : 'open' }), missions.reload)}>
                {m.status === 'open' ? '마감' : '다시 열기'}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setEdit(m)}>
                수정
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => confirm('의뢰와 수행 기록을 지울까요?') && run(() => play.deleteMission(m.id), missions.reload)}>
                삭제
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MissionForm({ initial, onDone, onCancel }: { initial: Partial<Mission>; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [area, setArea] = useState(initial.area ?? '')
  const [slots, setSlots] = useState<'1' | '2'>(initial.slots === 2 ? '2' : '1')
  const [body, setBody] = useState(initial.body ?? '')
  const [choices, setChoices] = useState<MissionChoice[]>(initial.choices?.length ? initial.choices : [{ label: '', outcome: '' }])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const setC = (i: number, patch: Partial<MissionChoice>) => setChoices(choices.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await play.saveMission({ id: initial.id, status: initial.status, title, area, slots: Number(slots), body, choices })
      onDone()
    } catch (e) {
      setErr(e)
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4 border border-seal bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <input className="field text-[17px]" placeholder="의뢰 제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="의뢰 제목" />
        <input className="field" placeholder="구역 (선택)" value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} aria-label="구역" />
        <Segmented
          name="인원"
          value={slots}
          onChange={setSlots}
          options={[
            { value: '1', label: '1인' },
            { value: '2', label: '2인' },
          ]}
        />
      </div>
      <textarea className="field min-h-28 leading-[1.8]" placeholder="의뢰 내용" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} aria-label="의뢰 내용" />
      <div className="space-y-2">
        <span className="form-label">선택지와 결과</span>
        {choices.map((c, i) => (
          <div key={i} className="grid gap-2 border-l-2 border-seal pl-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <input className="field" placeholder={`선택지 ${String.fromCharCode(65 + i)}`} value={c.label} onChange={(e) => setC(i, { label: e.target.value })} aria-label={`선택지 ${i + 1}`} />
            <input className="field" placeholder="고르면 보여 줄 결과" value={c.outcome} onChange={(e) => setC(i, { outcome: e.target.value })} aria-label={`결과 ${i + 1}`} />
            <button type="button" className="btn btn-sm" disabled={choices.length <= 1} onClick={() => setChoices(choices.filter((_, j) => j !== i))}>
              빼기
            </button>
          </div>
        ))}
        {choices.length < 6 && (
          <button type="button" className="btn btn-sm" onClick={() => setChoices([...choices, { label: '', outcome: '' }])}>
            선택지 추가
          </button>
        )}
      </div>
      {err ? <ErrorBox error={err} /> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="btn btn-sm btn-primary" disabled={busy || !title.trim() || !choices.some((c) => c.label.trim())} onClick={save}>
          저장
        </button>
      </div>
    </div>
  )
}

// ── 교신 · 무전 관리
export function PlayModeration() {
  const threads = useAsync(() => play.listThreads(), [])
  const [channel, setChannel] = useState('main')
  const radio = useAsync(() => play.listRadio(channel), [channel])
  const teams = useAsync(() => api.listTeams(), [])
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section>
        <p className="mb-2 border-b-2 border-foreground pb-2 text-[18px] font-black">교신 기록 {threads.data?.length ?? ''}</p>
        {threads.loading && !threads.data && <Loading />}
        {threads.error ? <ErrorBox error={threads.error} /> : null}
        <ul className="divide-y divide-rule">
          {(threads.data ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5 text-[14px]">
              <Link to={`/office/threads/${t.id}`} className="min-w-0 flex-1 truncate font-bold hover:text-seal">
                {t.title}
              </Link>
              <span className="text-[12px] text-muted-foreground">
                {t.post_count}개 · {relTime(t.last_at)}
              </span>
              <button type="button" className="btn btn-sm" onClick={() => run(() => play.updateThread(t.id, { status: t.status === 'open' ? 'closed' : 'open' }), threads.reload)}>
                {t.status === 'open' ? '닫기' : '열기'}
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => confirm('교신을 지울까요?') && run(() => play.deleteThread(t.id), threads.reload)}>
                삭제
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-muted-foreground">글 하나를 가리려면 교신에 들어가 글 위에 마우스를 올리세요.</p>
      </section>
      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2 border-b-2 border-foreground pb-2">
          <p className="text-[18px] font-black">무전</p>
          <select className="field ml-auto w-44 py-1" value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="채널">
            <option value="main">상황실</option>
            <option value="lounge">휴게실</option>
            {(teams.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {radio.loading && !radio.data && <Loading />}
        <ul className="max-h-[520px] divide-y divide-rule overflow-y-auto">
          {[...(radio.data ?? [])].reverse().map((m) => (
            <li key={m.id} className={cx('flex items-start gap-2 py-2 text-[14px]', m.hidden && 'opacity-50')}>
              <span className="min-w-0 flex-1">
                <b>{m.character?.name}</b> <span className="break-words">{m.body}</span>
              </span>
              <button type="button" className="btn btn-sm" onClick={() => run(() => play.setRadioHidden(m.id, !m.hidden), radio.reload)}>
                {m.hidden ? '해제' : '가림'}
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => run(() => play.deleteRadio(m.id), radio.reload)}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// ── MPC · 휴직 · 전출
export function MpcDuty() {
  const chars = useAsync(() => api.listAllCharacters(), [])
  const mpc = useAsync(() => play.listMpc(), [])
  const duties = useAsync(() => play.listDuties(), [])
  const [q, setQ] = useState('')
  const list = (chars.data ?? []).filter((c) => c.status === 'approved' && (!q.trim() || c.name.includes(q.trim()) || (c.owner_name ?? '').includes(q.trim())))
  return (
    <div>
      <p className="mb-4 max-w-2xl text-[14px] text-muted-foreground">MPC로 지정한 캐릭터는 명부와 글에 운영진 캐릭터 표시가 붙습니다. 휴직 · 전출은 오너가 등록증 화면에서 직접 바꿀 수 있고, 여기서도 바꿀 수 있습니다. 바꿔도 다시 심사하지 않습니다.</p>
      <input className="field mb-4 max-w-xs" placeholder="이름 · 오너로 찾기" value={q} onChange={(e) => setQ(e.target.value)} aria-label="찾기" />
      {chars.loading && !chars.data && <Loading />}
      <div className="overflow-x-auto">
        <table className="table-doc min-w-[640px] text-[14px]">
          <thead>
            <tr>
              <th>캐릭터</th>
              <th className="w-28">오너</th>
              <th className="w-24">MPC</th>
              <th className="w-56">근무 상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const isMpc = (mpc.data ?? []).includes(c.id)
              const duty = (duties.data ?? []).find((d) => d.character_id === c.id)?.duty ?? 'active'
              return (
                <tr key={c.id}>
                  <td>
                    <Link to={`/registry/${c.id}`} className="inline-flex items-center gap-1.5 font-bold hover:text-seal">
                      <KindMark kind={c.kind} /> {c.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground">{c.owner_name}</td>
                  <td>
                    <button type="button" aria-pressed={isMpc} className={cx('border px-2.5 py-1 text-[13px]', isMpc ? 'border-seal bg-seal font-bold text-ink' : 'border-rule')} onClick={() => run(() => play.setMpc(c.id, !isMpc), mpc.reload)}>
                      {isMpc ? 'MPC' : '지정'}
                    </button>
                  </td>
                  <td>
                    <select className="field py-1" value={duty} onChange={(e) => run(() => play.setDuty(c.id, e.target.value as DutyKind, (duties.data ?? []).find((d) => d.character_id === c.id)?.note ?? '', (duties.data ?? []).find((d) => d.character_id === c.id)?.gauge ?? null), duties.reload)} aria-label={`${c.name} 근무 상태`}>
                      {(Object.keys(DUTY_LABELS) as DutyKind[]).map((k) => (
                        <option key={k} value={k}>
                          {DUTY_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
