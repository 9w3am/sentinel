// 개인 관측창: 등록증 아래 뜨는 상태창. 근무 상태 · 폭주 수치(가이딩 여력) · 활동 기록 · 표창
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, play, useAsync, useAuth } from '../lib/backend'
import { AWARDS, DUTY_LABELS, type DutyKind } from '../lib/playTypes'
import type { Character } from '../lib/types'
import { errMsg, relTime } from '../lib/util'
import { cx } from './ui'

const gaugeName = (kind: string) => (kind === 'sentinel' ? '폭주 수치' : kind === 'guide' ? '가이딩 여력' : null)
const gaugeTone = (kind: string, v: number) => (kind === 'sentinel' ? (v >= 80 ? '#ff3b2f' : v >= 60 ? '#e8892a' : '#f0c419') : v <= 20 ? '#ff3b2f' : v <= 40 ? '#e8892a' : '#f0c419')

export function Observer({ c, canManage }: { c: Character; canManage: boolean }) {
  const { session } = useAuth()
  const member = !!session?.role
  const activity = useAsync(() => play.getActivity(c.id), [c.id])
  const duties = useAsync(() => play.listDuties(), [c.id])
  const mpc = useAsync(() => play.listMpc(), [c.id])
  const mine = useAsync(() => (member ? api.listMyCharacters() : Promise.resolve([])), [member])
  const threads = useAsync(() => (member ? play.listThreadsOf(c.id) : Promise.resolve([])), [c.id, member])
  const tagged = useAsync(async () => {
    if (!member) return []
    const ids = await play.listTaggedPostIds(c.id)
    if (!ids.length) return []
    return (await api.listPosts()).filter((p) => ids.includes(p.id))
  }, [c.id, member])
  const [editing, setEditing] = useState(false)

  const duty = (duties.data ?? []).find((d) => d.character_id === c.id)
  const state: DutyKind = duty?.duty ?? 'active'
  const isMpc = (mpc.data ?? []).includes(c.id)
  const gName = gaugeName(c.kind)
  const sameTeam = !!c.team_id && (mine.data ?? []).some((m) => m.team_id === c.team_id && m.status === 'approved')
  const showGauge = !!gName && duty?.gauge != null && (canManage || sameTeam || session?.role === 'admin')
  const a = activity.data
  const awards = a ? AWARDS.filter((w) => w.test(a)) : []

  return (
    <section className="mx-auto mt-10 max-w-4xl" aria-label="개인 관측창">
      <div className="relative border border-seal bg-[#0f0f0d] text-[#f3efe2] shadow-[0_0_0_4px_rgba(240,196,25,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-seal/40 px-4 py-2 font-mono text-[11.5px] tracking-[0.14em] text-seal">
          <span className="inline-block h-2 w-2 bg-seal" />
          STATUS · 개인 관측창
          <span className="ml-auto flex gap-1.5 tracking-normal">
            {isMpc && <span className="border border-seal px-1.5 py-px font-bold">운영진 캐릭터</span>}
            <span className={cx('border px-1.5 py-px', state === 'active' ? 'border-seal/60 text-seal' : 'border-[#e8892a] text-[#e8892a]')}>{DUTY_LABELS[state]}</span>
          </span>
        </div>

        <div className="grid gap-px bg-seal/20 sm:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 bg-[#0f0f0d] p-5">
            {state !== 'active' && (
              <p className="border-l-2 border-[#e8892a] pl-3 text-[14px] text-[#e8892a]">
                {state === 'leave' ? '휴직 중인 요원입니다. 답이 늦을 수 있어요.' : '다른 부서로 전출된 요원입니다.'}
                {duty?.note && <span className="mt-0.5 block text-[#bdb7a6]">{duty.note}</span>}
              </p>
            )}
            {gName && (
              <div>
                <p className="flex justify-between font-mono text-[12px] text-[#bdb7a6]">
                  <span>{gName}</span>
                  <span>{showGauge ? `${duty?.gauge}%` : '팀원에게만 표시'}</span>
                </p>
                <div className="mt-1.5 grid h-3 grid-cols-20 gap-[2px]" aria-hidden="true">
                  {Array.from({ length: 20 }, (_, i) => (
                    <span key={i} style={{ background: showGauge && i < Math.round((duty!.gauge! / 100) * 20) ? gaugeTone(c.kind, duty!.gauge!) : 'rgba(243,239,226,0.08)' }} />
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="font-mono text-[12px] text-[#bdb7a6]">표창</p>
              {awards.length === 0 ? (
                <p className="mt-1 text-[13px] text-[#8d8a80]">아직 받은 표창이 없습니다.</p>
              ) : (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {awards.map((w) => (
                    <li key={w.key} className="inline-flex items-center gap-1 border border-seal/60 px-2 py-0.5 text-[12.5px] text-seal">
                      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                        <path d="M6 0l1.6 3.9L12 4.2 8.6 7l1.1 4.3L6 9 2.3 11.3 3.4 7 0 4.2l4.4-.3z" fill="currentColor" />
                      </svg>
                      {w.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canManage && (
              <div className="border-t border-seal/20 pt-3">
                {editing ? (
                  <DutyForm c={c} initial={{ duty: state, note: duty?.note ?? '', gauge: duty?.gauge ?? null }} onDone={() => (setEditing(false), duties.reload())} />
                ) : (
                  <button type="button" className="text-[13px] text-seal underline underline-offset-4" onClick={() => setEditing(true)}>
                    근무 상태{gName ? ` · ${gName}` : ''} 바꾸기
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#0f0f0d] p-5">
            <p className="font-mono text-[12px] text-[#bdb7a6]">활동 기록</p>
            <dl className="mt-2 grid grid-cols-3 gap-px bg-seal/15 text-center">
              {(
                [
                  ['교신', a?.thread_posts],
                  ['무전', a?.radio],
                  ['의뢰', a?.missions],
                  ['게이트', a?.gates],
                  ['단서', a?.clues],
                  ['훈련', a?.events],
                ] as [string, number | undefined][]
              ).map(([k, v]) => (
                <div key={k} className="bg-[#0f0f0d] py-2.5">
                  <dd className="text-[24px] font-black tabular-nums leading-none text-[#f3efe2]">{v ?? '–'}</dd>
                  <dt className="mt-1 text-[11.5px] text-[#8d8a80]">{k}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {member && ((threads.data ?? []).length > 0 || (tagged.data ?? []).length > 0) && (
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-1 border-b-2 border-foreground pb-2 text-[16px] font-black">참여한 교신</p>
            <ul>
              {(threads.data ?? []).slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link to={`/office/threads/${t.id}`} className="flex items-center gap-2 border-b border-rule py-2.5 text-[14px] hover:text-seal">
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{relTime(t.last_at)}</span>
                  </Link>
                </li>
              ))}
              {threads.data?.length === 0 && <li className="py-3 text-[13px] text-muted-foreground">없음</li>}
            </ul>
          </div>
          <div>
            <p className="mb-1 border-b-2 border-foreground pb-2 text-[16px] font-black">등장한 기록</p>
            <ul>
              {(tagged.data ?? []).slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link to={`/office/board/${p.id}`} className="flex items-center gap-2 border-b border-rule py-2.5 text-[14px] hover:text-seal">
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{relTime(p.created_at)}</span>
                  </Link>
                </li>
              ))}
              {tagged.data?.length === 0 && <li className="py-3 text-[13px] text-muted-foreground">없음</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

function DutyForm({ c, initial, onDone }: { c: Character; initial: { duty: DutyKind; note: string; gauge: number | null }; onDone: () => void }) {
  const [duty, setDuty] = useState<DutyKind>(initial.duty)
  const [note, setNote] = useState(initial.note)
  const [gauge, setGauge] = useState<number | null>(initial.gauge)
  const [busy, setBusy] = useState(false)
  const gName = gaugeName(c.kind)
  const save = async () => {
    setBusy(true)
    try {
      await play.setDuty(c.id, duty, note, gName ? gauge : null)
      onDone()
    } catch (e) {
      alert(errMsg(e))
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3 text-[14px]">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(DUTY_LABELS) as DutyKind[]).map((k) => (
          <button key={k} type="button" aria-pressed={duty === k} onClick={() => setDuty(k)} className={cx('border px-3 py-1', duty === k ? 'border-seal bg-seal font-bold text-ink' : 'border-seal/40 text-[#f3efe2]')}>
            {DUTY_LABELS[k]}
          </button>
        ))}
      </div>
      {duty !== 'active' && <input className="w-full border border-seal/40 bg-transparent px-3 py-1.5 text-[#f3efe2] placeholder:text-[#8d8a80]" placeholder="한 줄 사유 (선택) · 예: 시험 기간이라 답이 늦어요" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} aria-label="사유" />}
      {gName && (
        <label className="block">
          <span className="flex justify-between font-mono text-[12px] text-[#bdb7a6]">
            <span>{gName}</span>
            <span>{gauge == null ? '표시 안 함' : `${gauge}%`}</span>
          </span>
          <input type="range" min={0} max={100} value={gauge ?? 0} onChange={(e) => setGauge(Number(e.target.value))} className="w-full accent-[#f0c419]" />
          {gauge != null && (
            <button type="button" className="text-[12px] text-[#8d8a80] underline" onClick={() => setGauge(null)}>
              수치 숨기기
            </button>
          )}
        </label>
      )}
      <p className="text-[12px] text-[#8d8a80]">바꿔도 다시 심사하지 않습니다. 수치는 본인 · 같은 팀 · 관리부에게만 보입니다.</p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>
          저장
        </button>
        <button type="button" className="border border-seal/40 px-3 py-1 text-[13px] text-[#f3efe2]" onClick={onDone}>
          취소
        </button>
      </div>
    </div>
  )
}
