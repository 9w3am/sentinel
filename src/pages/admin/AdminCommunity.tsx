import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TeamMark } from '../../components/TeamMark'
import { Empty, ErrorBox, FieldRow, GradeBadge, KindBadge, Loading, Pill, SectionHead, StatusPill, Tabs, copyText, cx } from '../../components/ui'
import { GUIDE_DOCS, guideDoc } from '../../config/guide'
import { APPLY_LABELS, APPROACHES, COHORT_STATUS, TEAM_COLORS, TEAM_ROLES, inboxCategoryLabel, kindLabel } from '../../config/world'
import { api, useAsync } from '../../lib/backend'
import type { Application, Case, CaseClue, CaseTarget, Cohort, CohortStatus, Incident, Team } from '../../lib/types'
import { errMsg, fmtDate, relTime } from '../../lib/util'

// ── 편입 신청
type AppFilter = 'submitted' | 'accepted' | 'rejected' | 'all'
const APP_STATUS = { submitted: ['warn', '심사 대기'], accepted: ['ok', '합격'], rejected: ['danger', '불합격'] } as const

export function Applications() {
  const apps = useAsync(() => api.listApplications(), [])
  const [filter, setFilter] = useState<AppFilter>('submitted')
  const [open, setOpen] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const all = apps.data ?? []
  const list = all.filter((a) => filter === 'all' || a.status === filter)
  const count = (s: AppFilter) => (s === 'all' ? all.length : all.filter((a) => a.status === s).length)

  const answer = (a: Application, key: string) => {
    const v = a.answers?.[key]
    if (Array.isArray(v)) return v.join(', ')
    if (key === 'kind' && v) return kindLabel(v)
    return v ?? ''
  }

  const decide = async (a: Application, accept: boolean) => {
    if (!accept && !confirm(`${a.owner_nick} 님의 신청을 불합격 처리할까요?`)) return
    try {
      await api.decideApplication(a.id, accept, (notes[a.id] ?? a.result_note ?? '').trim() || null)
      apps.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-[13.5px] text-muted-foreground">합격 처리하면 편입 인가 번호가 자동으로 발급됩니다. 신청자는 결과 조회 화면에서 접수번호와 확인 코드로 번호를 받습니다. 합격 발표 공고는 알림마당에 따로 올려 주세요.</p>
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'submitted' as AppFilter, label: '심사 대기', count: count('submitted') },
          { value: 'accepted' as AppFilter, label: '합격', count: count('accepted') },
          { value: 'rejected' as AppFilter, label: '불합격', count: count('rejected') },
          { value: 'all' as AppFilter, label: '전체', count: count('all') },
        ]}
      />
      {apps.loading && <Loading />}
      {apps.error ? <ErrorBox error={apps.error} /> : null}
      {apps.data && list.length === 0 && (
        <div className="mt-6">
          <Empty title="해당하는 신청서가 없습니다" />
        </div>
      )}
      {list.length > 0 && (
        <ul className="mt-6 border-t-2 border-foreground">
          {list.map((a) => {
            const [tone, label] = APP_STATUS[a.status]
            const isOpen = open === a.id
            return (
              <li key={a.id} className="border-b border-rule">
                <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen} className="grid w-full gap-x-4 gap-y-1 px-2 py-3 text-left hover:bg-muted sm:grid-cols-[7.5rem_1fr_6rem_auto] sm:items-center">
                  <span className="font-mono text-[13px] text-muted-foreground">{a.receipt}</span>
                  <span className="min-w-0 truncate">
                    <b className="font-bold">{answer(a, 'name') || '이름 없음'}</b>
                    <span className="ml-2 text-[13px] text-muted-foreground">
                      {answer(a, 'kind')} · 오너 {a.owner_nick}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">{relTime(a.created_at)}</span>
                  <span className="flex items-center gap-2">
                    <Pill tone={tone}>{label}</Pill>
                    <span className="text-[12px] text-muted-foreground">{isOpen ? '접기' : '펼치기'}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="grid gap-6 bg-card px-3 pb-6 pt-2 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="border border-rule">
                      <FieldRow label="오너">{a.owner_nick}</FieldRow>
                      <FieldRow label="연락 수단">{a.contact}</FieldRow>
                      <FieldRow label="기수">{a.cohort_no ? `제${a.cohort_no}기` : null}</FieldRow>
                      {APPLY_LABELS.map(([k, l]) => (
                        <FieldRow key={k} label={l}>
                          <span className="whitespace-pre-wrap">{answer(a, k)}</span>
                        </FieldRow>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <label htmlFor={`an-${a.id}`} className="form-label">
                        결과 메모 (신청자에게 보임)
                      </label>
                      <textarea id={`an-${a.id}`} className="field min-h-24" value={notes[a.id] ?? a.result_note ?? ''} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} maxLength={500} />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-seal" onClick={() => decide(a, true)}>
                          {a.status === 'accepted' ? '메모 저장' : '합격 · 인가 번호 발급'}
                        </button>
                        {a.status !== 'rejected' && (
                          <button type="button" className="btn" onClick={() => decide(a, false)}>
                            불합격
                          </button>
                        )}
                      </div>
                      {a.status === 'accepted' && a.invite_code && (
                        <div className="border-2 border-seal p-3">
                          <p className="text-[12px] text-muted-foreground">편입 인가 번호 · {a.invite_used ? '가입 완료' : '미사용'}</p>
                          <button
                            type="button"
                            className="mt-1 font-mono text-[18px] font-semibold tracking-wide hover:text-seal"
                            onClick={async () => {
                              if (await copyText(a.invite_code!)) {
                                setCopied(a.id)
                                setTimeout(() => setCopied(null), 1500)
                              }
                            }}
                          >
                            {a.invite_code}
                          </button>
                          {copied === a.id && <span className="ml-2 text-[12px] text-ok">복사됨</span>}
                        </div>
                      )}
                      {a.decided_at && <p className="text-[12px] text-muted-foreground">처리 {fmtDate(a.decided_at, true)}</p>}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── 기수 · 팀 · 팀 배치
export function CohortsTeams() {
  const cohorts = useAsync(() => api.listCohorts(), [])
  const teams = useAsync(() => api.listTeams(), [])
  const chars = useAsync(() => api.listAllCharacters(), [])
  const [editing, setEditing] = useState<Partial<Team> | null>(null)
  const [q, setQ] = useState('')

  const teamList = teams.data ?? []
  const nextNo = Math.max(0, ...(cohorts.data ?? []).map((c) => c.no)) + 1
  const list = (chars.data ?? []).filter((c) => !q || [c.name, c.codename, c.owner_name].some((v) => v?.includes(q)))

  const assign = async (id: string, patch: Parameters<typeof api.assignCharacter>[1]) => {
    try {
      await api.assignCharacter(id, patch)
      chars.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="space-y-14">
      <section>
        <SectionHead title="기수" />
        <p className="-mt-1 mb-4 text-[13.5px] text-muted-foreground">모집 중인 기수가 있어야 편입 신청서를 받습니다. 새 등록증은 모집 중인 기수(없으면 활동 중인 기수)로 들어갑니다.</p>
        {cohorts.loading && <Loading />}
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[760px]">
            <thead>
              <tr>
                <th className="w-24">기수</th>
                <th>이름</th>
                <th className="w-32">상태</th>
                <th>메모</th>
                <th className="w-32 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {(cohorts.data ?? []).map((c) => (
                <CohortRow key={c.no} c={c} onSaved={cohorts.reload} />
              ))}
              <CohortRow key={`new-${nextNo}`} c={null} nextNo={nextNo} onSaved={cohorts.reload} />
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHead
          title="팀"
          action={
            <button type="button" className="btn btn-sm" onClick={() => setEditing({ name: `제${teamList.length + 1}팀`, color: TEAM_COLORS[teamList.length % TEAM_COLORS.length], sort: teamList.length + 1 })}>
              팀 추가
            </button>
          }
        />
        {editing && (
          <TeamForm
            key={editing.id ?? 'new'}
            initial={editing}
            onDone={() => {
              setEditing(null)
              teams.reload()
            }}
            onCancel={() => setEditing(null)}
          />
        )}
        {teams.loading && <Loading />}
        {teams.data && teamList.length === 0 && !editing && <Empty title="아직 팀이 없습니다">'팀 추가'로 첫 팀을 만들어 주세요.</Empty>}
        {teamList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-doc min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-14" aria-label="패치" />
                  <th>팀</th>
                  <th className="w-40">호출부호</th>
                  <th className="w-20 text-right">인원</th>
                  <th className="w-16 text-right">순서</th>
                  <th className="w-32 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {teamList.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <TeamMark team={t} size={28} />
                    </td>
                    <td>
                      <Link to={`/teams/${t.id}`} className="font-bold hover:text-seal">
                        {t.name}
                      </Link>
                      {t.motto && <span className="ml-2 text-[13px] text-muted-foreground">{t.motto}</span>}
                    </td>
                    <td className="font-mono text-[13.5px]">{t.callsign ?? <span className="text-muted-foreground">미정</span>}</td>
                    <td className="text-right font-mono text-[13.5px]">{(chars.data ?? []).filter((c) => c.team_id === t.id).length}명</td>
                    <td className="text-right font-mono text-[13.5px]">{t.sort}</td>
                    <td className="whitespace-nowrap text-right text-[13px]">
                      <button type="button" className="hover:text-seal" onClick={() => setEditing(t)}>
                        수정
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          if (!confirm(`'${t.name}' 팀을 삭제할까요? 배치된 요원은 미배치가 됩니다.`)) return
                          try {
                            await api.deleteTeam(t.id)
                            teams.reload()
                            chars.reload()
                          } catch (e) {
                            alert(errMsg(e))
                          }
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHead title="팀 배치" action={<input className="field w-56 py-1.5" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 관리인 검색" aria-label="등록증 검색" />} />
        <p className="-mt-1 mb-4 text-[13.5px] text-muted-foreground">고르면 바로 저장됩니다. 등록 기록, 팀 편성표, 현장 팀 화면에 반영됩니다.</p>
        {chars.loading && <Loading />}
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[960px]">
            <thead>
              <tr>
                <th>이름</th>
                <th className="w-28">관리인</th>
                <th className="w-40">구분 · 등급</th>
                <th className="w-24">상태</th>
                <th className="w-28">기수</th>
                <th className="w-36">팀</th>
                <th className="w-28">역할</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/registry/${c.id}`} className="font-bold hover:text-seal">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-[13.5px]">{c.owner_name ?? '—'}</td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <KindBadge kind={c.kind} />
                      <GradeBadge grade={c.grade} size="sm" />
                    </span>
                  </td>
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td>
                    <select className="field py-1 text-[13px]" value={c.cohort_no ?? ''} onChange={(e) => assign(c.id, { cohort_no: e.target.value ? Number(e.target.value) : null })} aria-label={`${c.name} 기수`}>
                      <option value="">—</option>
                      {(cohorts.data ?? []).map((co) => (
                        <option key={co.no} value={co.no}>
                          {co.no}기
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select className="field py-1 text-[13px]" value={c.team_id ?? ''} onChange={(e) => assign(c.id, { team_id: e.target.value || null })} aria-label={`${c.name} 팀`}>
                      <option value="">미배치</option>
                      {teamList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select className="field py-1 text-[13px]" value={c.team_role ?? ''} onChange={(e) => assign(c.id, { team_role: e.target.value || null })} aria-label={`${c.name} 역할`}>
                      <option value="">—</option>
                      {TEAM_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.value}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {chars.data && list.length === 0 && <p className="py-8 text-center text-[14px] text-muted-foreground">등록증이 없습니다.</p>}
        </div>
      </section>
    </div>
  )
}

function CohortRow({ c, nextNo, onSaved }: { c: Cohort | null; nextNo?: number; onSaved: () => void }) {
  const [no, setNo] = useState(c?.no ?? nextNo ?? 1)
  const [title, setTitle] = useState(c?.title ?? `제${nextNo ?? 1}기 편입`)
  const [status, setStatus] = useState<CohortStatus>(c?.status ?? 'ready')
  const [note, setNote] = useState(c?.note ?? '')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    try {
      await api.saveCohort({ no, title: title.trim() || `제${no}기 편입`, status, note })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <tr className={cx(!c && 'bg-muted/50')}>
      <td>
        {c ? (
          <span className="font-mono text-[14px]">{c.no}기</span>
        ) : (
          <input type="number" min={1} className="field w-20 py-1" value={no} onChange={(e) => setNo(Number(e.target.value) || 1)} aria-label="새 기수 번호" />
        )}
      </td>
      <td>
        <input className="field py-1" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="기수 이름" />
      </td>
      <td>
        <select className="field py-1" value={status} onChange={(e) => setStatus(e.target.value as CohortStatus)} aria-label="상태">
          {COHORT_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input className="field py-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 신청 9/20 ~ 9/27" aria-label="메모" />
      </td>
      <td className="whitespace-nowrap text-right text-[13px]">
        <button type="button" className={cx('btn btn-sm', !c && 'btn-primary')} onClick={save}>
          {saved ? '저장됨' : c ? '저장' : '추가'}
        </button>
        {c && (
          <button
            type="button"
            className="ml-2 text-muted-foreground hover:text-destructive"
            onClick={async () => {
              if (!confirm(`'${c.title}' 기수를 삭제할까요? 요원의 기수 표시가 비워집니다.`)) return
              try {
                await api.deleteCohort(c.no)
                onSaved()
              } catch (e) {
                alert(errMsg(e))
              }
            }}
          >
            삭제
          </button>
        )}
      </td>
    </tr>
  )
}

function TeamForm({ initial, onDone, onCancel }: { initial: Partial<Team>; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: initial.name ?? '',
    callsign: initial.callsign ?? '',
    color: initial.color ?? TEAM_COLORS[0],
    motto: initial.motto ?? '',
    description: initial.description ?? '',
    sort: initial.sort ?? 0,
  })
  const [err, setErr] = useState<unknown>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    try {
      await api.saveTeam({ id: initial.id, ...f })
      onDone()
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <form onSubmit={save} className="doc-frame mb-6 grid gap-4 p-5 md:grid-cols-2">
      <p className="text-[18px] font-black md:col-span-2">{initial.id ? '팀 수정' : '새 팀'}</p>
      <div>
        <label className="form-label" htmlFor="tf-name">
          팀 이름
        </label>
        <input id="tf-name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={30} />
      </div>
      <div>
        <label className="form-label" htmlFor="tf-call">
          호출부호
        </label>
        <input id="tf-call" className="field" value={f.callsign} onChange={(e) => setF({ ...f, callsign: e.target.value })} maxLength={30} placeholder="비워 두면 '미정'" />
      </div>
      <div className="md:col-span-2">
        <span className="form-label">패치 색</span>
        <div className="flex flex-wrap items-center gap-2">
          {TEAM_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`색 ${c}`} aria-pressed={f.color === c} onClick={() => setF({ ...f, color: c })} className={cx('h-8 w-8 rounded-[6px] border-2', f.color === c ? 'border-foreground' : 'border-transparent')} style={{ background: c }} />
          ))}
          <span className="ml-3 inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <TeamMark team={{ name: f.name || '팀', color: f.color }} size={28} />
            미리보기
          </span>
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="tf-motto">
          구호 (선택)
        </label>
        <input id="tf-motto" className="field" value={f.motto} onChange={(e) => setF({ ...f, motto: e.target.value })} maxLength={60} />
      </div>
      <div>
        <label className="form-label" htmlFor="tf-sort">
          표시 순서
        </label>
        <input id="tf-sort" type="number" className="field" value={f.sort} onChange={(e) => setF({ ...f, sort: Number(e.target.value) || 0 })} />
      </div>
      <div className="md:col-span-2">
        <label className="form-label" htmlFor="tf-desc">
          소개 (선택)
        </label>
        <textarea id="tf-desc" className="field min-h-20" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={1000} />
      </div>
      {err ? (
        <div className="md:col-span-2">
          <ErrorBox error={err} />
        </div>
      ) : null}
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn btn-primary">
          {initial.id ? '수정 저장' : '팀 만들기'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  )
}

// ── 대나무숲 관리
export function BambooAdmin() {
  const rows = useAsync(() => api.listAnonAdmin(), [])
  const act = async (fn: () => Promise<void>, msg?: string) => {
    if (msg && !confirm(msg)) return
    try {
      await fn()
      rows.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }
  const list = rows.data ?? []

  return (
    <div>
      <p className="mb-4 border-l-2 border-destructive pl-3 text-[13.5px] text-muted-foreground">작성자 정보는 분란을 조사할 때만 확인해 주세요. 가린 글과 댓글은 러너에게 내용이 보이지 않습니다.</p>
      {rows.loading && <Loading />}
      {rows.error ? <ErrorBox error={rows.error} /> : null}
      {rows.data && list.length === 0 && <Empty title="대나무숲에 올라온 글이 없습니다" />}
      {list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[900px]">
            <thead>
              <tr>
                <th className="w-16">종류</th>
                <th>내용</th>
                <th className="w-32">등록증</th>
                <th className="w-28">관리인</th>
                <th className="w-24 text-right">등록</th>
                <th className="w-36 text-right">조치</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className={cx(r.hidden && 'opacity-60')}>
                  <td>{r.kind === 'post' ? <Pill>글</Pill> : <Pill tone="muted">댓글</Pill>}</td>
                  <td className="max-w-0">
                    <Link to={`/office/bamboo/${r.post_id}`} className="block truncate hover:text-seal">
                      {r.kind === 'post' ? <b className="font-bold">{r.title}</b> : <span className="text-muted-foreground">{r.title} ›</span>} <span className="text-[13.5px]">{r.body}</span>
                    </Link>
                    {r.hidden && <span className="text-[12px] text-destructive">가림</span>}
                  </td>
                  <td className="text-[13.5px]">{r.character?.name ?? <span className="text-muted-foreground">삭제된 등록증</span>}</td>
                  <td className="text-[13.5px]">{r.owner_name}</td>
                  <td className="text-right font-mono text-[12px] text-muted-foreground">{relTime(r.created_at)}</td>
                  <td className="whitespace-nowrap text-right text-[13px]">
                    <button type="button" className="hover:text-seal" onClick={() => act(() => api.setAnonHidden(r.kind, r.id, !r.hidden))}>
                      {r.hidden ? '가림 해제' : '가리기'}
                    </button>
                    <button type="button" className="ml-3 text-destructive hover:underline" onClick={() => act(() => (r.kind === 'post' ? api.deleteAnonPost(r.id) : api.deleteAnonComment(r.id)), r.kind === 'post' ? '이 글과 댓글을 모두 삭제할까요? 되돌릴 수 없습니다.' : '이 댓글을 삭제할까요? 되돌릴 수 없습니다.')}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── 운영진 문의함
type InboxFilter = 'open' | 'done' | 'all'

export function InboxAdmin() {
  const items = useAsync(() => api.listInboxAdmin(), [])
  const [filter, setFilter] = useState<InboxFilter>('open')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string | null>(null)
  const all = items.data ?? []
  const list = all.filter((i) => filter === 'all' || (filter === 'open' ? !i.reply : !!i.reply))

  return (
    <div>
      <p className="mb-4 max-w-3xl text-[13.5px] text-muted-foreground">오너가 운영진에게만 보낸 문의입니다. 익명으로 온 글에는 이름이 표시되지 않습니다. 답변은 보낸 사람에게만 보입니다.</p>
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'open' as InboxFilter, label: '답변 대기', count: all.filter((i) => !i.reply).length },
          { value: 'done' as InboxFilter, label: '답변 완료', count: all.filter((i) => !!i.reply).length },
          { value: 'all' as InboxFilter, label: '전체', count: all.length },
        ]}
      />
      {items.loading && <Loading />}
      {items.error ? <ErrorBox error={items.error} /> : null}
      {items.data && list.length === 0 && (
        <div className="mt-6">
          <Empty title="해당하는 문의가 없습니다" />
        </div>
      )}
      <ul className="mt-6 space-y-4">
        {list.map((i) => (
          <li key={i.id} className="doc-frame p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>{inboxCategoryLabel(i.category)}</Pill>
              <strong className="min-w-0 flex-1 truncate text-[16px]">{i.title}</strong>
              <span className="text-[13px]">{i.sender ?? <span className="text-muted-foreground">익명</span>}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{fmtDate(i.created_at, true)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{i.body}</p>
            <label htmlFor={`rp-${i.id}`} className="form-label mt-4">
              답변
            </label>
            <textarea id={`rp-${i.id}`} className="field min-h-24" value={drafts[i.id] ?? i.reply ?? ''} onChange={(e) => setDrafts({ ...drafts, [i.id]: e.target.value })} maxLength={4000} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  try {
                    await api.replyInbox(i.id, drafts[i.id] ?? i.reply ?? '')
                    setSaved(i.id)
                    setTimeout(() => setSaved(null), 1500)
                    items.reload()
                  } catch (e) {
                    alert(errMsg(e))
                  }
                }}
              >
                {saved === i.id ? '저장됨' : i.reply ? '답변 고치기' : '답변 보내기'}
              </button>
              {i.replied_at && <span className="text-[12px] text-muted-foreground">{fmtDate(i.replied_at, true)} 답변</span>}
              <button
                type="button"
                className="ml-auto text-[12px] text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  if (!confirm('이 문의를 삭제할까요? 보낸 사람 쪽에서도 사라집니다.')) return
                  try {
                    await api.deleteInboxAdmin(i.id)
                    items.reload()
                  } catch (e) {
                    alert(errMsg(e))
                  }
                }}
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 조사 (사건 파일)
export function CasesAdmin() {
  const cases = useAsync(() => api.listCases(), [])
  const incidents = useAsync(() => api.listIncidents(), [])
  const [sel, setSel] = useState<string | null>(null)
  const list = cases.data ?? []
  const current = sel && sel !== 'new' ? list.find((c) => c.id === sel) ?? null : null

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-3">
        <button type="button" className="btn btn-primary w-full" onClick={() => setSel('new')}>
          새 사건 파일
        </button>
        {cases.loading && <Loading />}
        <ul className="border-t-2 border-foreground">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setSel(c.id)} aria-pressed={sel === c.id} className={cx('block w-full border-b border-rule px-2 py-2.5 text-left', sel === c.id ? 'bg-muted' : 'hover:bg-muted/60')}>
                <span className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
                  {c.code}
                  {c.status === 'open' ? <Pill tone="seal">조사 중</Pill> : <Pill>종결</Pill>}
                </span>
                <span className="block truncate font-bold">{c.title}</span>
              </button>
            </li>
          ))}
          {cases.data && list.length === 0 && <li className="py-6 text-center text-[13px] text-muted-foreground">사건 파일이 없습니다.</li>}
        </ul>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">대상마다 조사 방법별로 단서를 적어 둡니다. 비워 둔 칸은 '흔적 없음'으로 나옵니다.</p>
      </aside>
      <div className="min-w-0">
        {sel ? (
          <CaseEditor
            key={sel}
            initial={current}
            nextCode={`C-${String(list.length + 1).padStart(2, '0')}`}
            incidents={incidents.data ?? []}
            onSaved={(id) => {
              cases.reload()
              setSel(id)
            }}
            onDeleted={() => {
              cases.reload()
              setSel(null)
            }}
          />
        ) : (
          <Empty title="왼쪽에서 사건을 고르거나 새로 만드세요" />
        )}
      </div>
    </div>
  )
}

function CaseEditor({ initial, nextCode, incidents, onSaved, onDeleted }: { initial: Case | null; nextCode: string; incidents: Incident[]; onSaved: (id: string) => void; onDeleted: () => void }) {
  const [f, setF] = useState({
    code: initial?.code ?? nextCode,
    title: initial?.title ?? '',
    briefing: initial?.briefing ?? '',
    incident_id: initial?.incident_id ?? '',
    status: initial?.status ?? 'open',
    question: initial?.question ?? '',
    choicesText: (initial?.choices ?? []).join('\n'),
    answer: initial?.answer ?? null,
    conclusion: initial?.conclusion ?? '',
  })
  const [err, setErr] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)
  const choices = f.choicesText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    try {
      const id = await api.saveCase({
        id: initial?.id,
        code: f.code,
        title: f.title,
        briefing: f.briefing,
        incident_id: f.incident_id || null,
        status: f.status as Case['status'],
        question: f.question,
        choices,
        answer: f.answer != null && f.answer < choices.length ? f.answer : null,
        conclusion: f.conclusion,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved(id)
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="doc-frame grid gap-4 p-5 md:grid-cols-[8rem_1fr]">
        <p className="text-[20px] font-black md:col-span-2">{initial ? '사건 파일 수정' : '새 사건 파일'}</p>
        <div>
          <label className="form-label" htmlFor="ce-code">
            코드
          </label>
          <input id="ce-code" className="field font-mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required maxLength={20} />
        </div>
        <div>
          <label className="form-label" htmlFor="ce-title">
            사건 이름
          </label>
          <input id="ce-title" className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={80} />
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="ce-brief">
            개요 (요원에게 보임)
          </label>
          <textarea id="ce-brief" className="field min-h-28" value={f.briefing} onChange={(e) => setF({ ...f, briefing: e.target.value })} maxLength={6000} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
          <div>
            <label className="form-label" htmlFor="ce-gate">
              관련 게이트
            </label>
            <select id="ce-gate" className="field" value={f.incident_id} onChange={(e) => setF({ ...f, incident_id: e.target.value })}>
              <option value="">없음</option>
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} · {i.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="ce-status">
              상태
            </label>
            <select id="ce-status" className="field" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Case['status'] })}>
              <option value="open">조사 중</option>
              <option value="closed">종결 (진상 · 정답 공개)</option>
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="ce-q">
            추리 문제 (선택)
          </label>
          <input id="ce-q" className="field" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} maxLength={200} />
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="ce-choices">
            선택지 (한 줄에 하나)
          </label>
          <textarea id="ce-choices" className="field min-h-20" value={f.choicesText} onChange={(e) => setF({ ...f, choicesText: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="ce-answer">
            정답
          </label>
          <select id="ce-answer" className="field" value={f.answer ?? ''} onChange={(e) => setF({ ...f, answer: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">정하지 않음</option>
            {choices.map((c, i) => (
              <option key={i} value={i}>
                {String.fromCharCode(65 + i)}. {c}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="form-label" htmlFor="ce-conc">
            진상 (종결하면 공개)
          </label>
          <textarea id="ce-conc" className="field min-h-24" value={f.conclusion} onChange={(e) => setF({ ...f, conclusion: e.target.value })} maxLength={6000} />
        </div>
        {err ? (
          <div className="md:col-span-2">
            <ErrorBox error={err} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button type="submit" className="btn btn-primary">
            {saved ? '저장됨' : initial ? '수정 저장' : '사건 만들기'}
          </button>
          {initial && (
            <>
              <Link to={`/office/cases/${initial.id}`} className="btn">
                요원 화면 보기
              </Link>
              <button
                type="button"
                className="btn btn-danger ml-auto"
                onClick={async () => {
                  if (!confirm(`'${initial.title}' 사건을 삭제할까요? 대상 · 단서 · 조사 기록이 모두 사라집니다.`)) return
                  try {
                    await api.deleteCase(initial.id)
                    onDeleted()
                  } catch (e) {
                    alert(errMsg(e))
                  }
                }}
              >
                사건 삭제
              </button>
            </>
          )}
        </div>
      </form>
      {initial ? <TargetsAndClues caseId={initial.id} /> : <p className="text-[13.5px] text-muted-foreground">사건을 만든 뒤 조사 대상과 단서를 넣을 수 있습니다.</p>}
    </div>
  )
}

function TargetsAndClues({ caseId }: { caseId: string }) {
  const targets = useAsync(() => api.listCaseTargets(caseId), [caseId])
  const clues = useAsync(() => api.listCaseClues(caseId), [caseId])
  const findings = useAsync(() => api.listCaseFindings(caseId), [caseId])
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api.saveCaseTarget({ case_id: caseId, name, detail, sort: (targets.data?.length ?? 0) + 1 })
      setName('')
      setDetail('')
      targets.reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <section>
      <SectionHead title="조사 대상과 단서" action={<span className="text-[13px] text-muted-foreground">조사 {findings.data?.length ?? 0}회</span>} />
      {(targets.loading || clues.loading) && <Loading />}
      <div className="space-y-5">
        {(targets.data ?? []).map((t) => (
          <TargetClues
            key={t.id}
            caseId={caseId}
            target={t}
            clues={(clues.data ?? []).filter((c) => c.target_id === t.id)}
            tries={(findings.data ?? []).filter((f) => f.target_id === t.id).length}
            onChanged={() => {
              targets.reload()
              clues.reload()
            }}
          />
        ))}
      </div>
      <form onSubmit={add} className="mt-5 grid gap-2 border border-dashed border-rule p-4 sm:grid-cols-[1fr_1.4fr_auto]">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="새 대상 이름 (예: 지하 배수로)" required maxLength={60} aria-label="새 대상 이름" />
        <input className="field" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="짧은 설명 (선택)" maxLength={120} aria-label="새 대상 설명" />
        <button type="submit" className="btn">
          대상 추가
        </button>
      </form>
    </section>
  )
}

function TargetClues({ caseId, target, clues, tries, onChanged }: { caseId: string; target: CaseTarget; clues: CaseClue[]; tries: number; onChanged: () => void }) {
  const [name, setName] = useState(target.name)
  const [detail, setDetail] = useState(target.detail ?? '')
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(APPROACHES.map((a) => [a.value, clues.find((c) => c.approach === a.value)?.body ?? ''])))
  const [saved, setSaved] = useState(false)

  const saveAll = async () => {
    try {
      await api.saveCaseTarget({ id: target.id, case_id: caseId, name, detail, sort: target.sort })
      for (const a of APPROACHES) {
        const prev = clues.find((c) => c.approach === a.value)?.body ?? ''
        if ((drafts[a.value] ?? '') !== prev) await api.saveCaseClue({ case_id: caseId, target_id: target.id, approach: a.value, body: drafts[a.value] ?? '' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onChanged()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="doc-frame-soft p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
        <input className="field font-bold" value={name} onChange={(e) => setName(e.target.value)} aria-label="대상 이름" />
        <input className="field" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="짧은 설명" aria-label="대상 설명" />
        <span className="text-[12px] text-muted-foreground">조사 {tries}회</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {APPROACHES.map((a) => (
          <div key={a.value}>
            <label className="form-label" htmlFor={`cl-${target.id}-${a.value}`}>
              {a.label}
              {a.kind && <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">({kindLabel(a.kind)}만)</span>}
            </label>
            <textarea id={`cl-${target.id}-${a.value}`} className="field min-h-20 text-[14px]" value={drafts[a.value] ?? ''} onChange={(e) => setDrafts({ ...drafts, [a.value]: e.target.value })} placeholder="비워 두면 흔적 없음" maxLength={2000} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={saveAll}>
          {saved ? '저장됨' : '이 대상 저장'}
        </button>
        <button
          type="button"
          className="ml-auto text-[12.5px] text-muted-foreground hover:text-destructive"
          onClick={async () => {
            if (!confirm(`'${target.name}' 대상을 삭제할까요? 단서와 조사 기록도 사라집니다.`)) return
            try {
              await api.deleteCaseTarget(target.id)
              onChanged()
            } catch (e) {
              alert(errMsg(e))
            }
          }}
        >
          대상 삭제
        </button>
      </div>
    </div>
  )
}

// ── 커뮤 안내 문서
export function GuideEditor() {
  const [params] = useSearchParams()
  const initial = params.get('doc')
  const [slug, setSlug] = useState(initial && guideDoc(initial) ? initial : GUIDE_DOCS[0].slug)
  return (
    <div>
      <Tabs value={slug} onChange={setSlug} items={GUIDE_DOCS.map((d) => ({ value: d.slug, label: d.title }))} />
      <div className="pt-6">
        <DocEditor key={slug} slug={slug} />
      </div>
    </div>
  )
}

function DocEditor({ slug }: { slug: string }) {
  const def = guideDoc(slug)!
  const page = useAsync(() => api.getPage(slug), [slug])
  const [title, setTitle] = useState<string | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<unknown>(null)

  if (page.loading) return <Loading />
  const t = title ?? page.data?.title ?? def.title
  const b = body ?? page.data?.body ?? def.body

  const save = async () => {
    setErr(null)
    try {
      await api.savePage({ slug, title: t.trim() || def.title, body: b })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      page.reload()
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="space-y-4">
        <div>
          <label className="form-label" htmlFor="gd-title">
            제목
          </label>
          <input id="gd-title" className="field" value={t} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="form-label" htmlFor="gd-body">
            본문
          </label>
          <textarea id="gd-body" className="field min-h-[560px] text-[15px] leading-[1.8]" value={b} onChange={(e) => setBody(e.target.value)} />
        </div>
        {err ? <ErrorBox error={err} /> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary px-6" onClick={save}>
            {saved ? '저장됨' : '문서 저장'}
          </button>
          <Link to={`/guide/${slug}`} className="btn">
            러너 화면 보기
          </Link>
          <button
            type="button"
            className="btn btn-ghost ml-auto"
            onClick={() => {
              if (!confirm('기본 문서 내용으로 되돌릴까요? 저장해야 반영됩니다.')) return
              setTitle(def.title)
              setBody(def.body)
            }}
          >
            기본 내용 불러오기
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">{page.data ? `${fmtDate(page.data.updated_at, true)} 저장본` : '아직 저장한 적 없음 · 기본 문서가 보이는 중'}</p>
      </div>
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p className="font-bold text-foreground">쓰는 법</p>
        <p>
          <code className="font-mono text-foreground">## 제목</code> 큰 제목 · <code className="font-mono text-foreground">### 제목</code> 작은 제목
        </p>
        <p>
          <code className="font-mono text-foreground">- 내용</code> 목록 · <code className="font-mono text-foreground">1. 내용</code> 순서 목록
        </p>
        <p>
          <code className="font-mono text-foreground">&gt; 내용</code> 안내 상자
        </p>
        <p>
          <code className="font-mono text-foreground">:::</code> 줄로 감싸면 상태창 상자. 줄 앞에 <code className="font-mono text-foreground">[알림]</code> <code className="font-mono text-foreground">[경보]</code> <code className="font-mono text-foreground">[팀]</code>을 붙일 수 있습니다.
        </p>
        <p>
          <code className="font-mono text-foreground">---</code> 장면 전환 · <code className="font-mono text-foreground">**굵게**</code> · <code className="font-mono text-foreground">[글자](#/apply)</code> 링크
        </p>
      </div>
    </div>
  )
}
