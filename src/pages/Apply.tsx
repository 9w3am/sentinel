import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Emblem, Empty, ErrorBox, Loading, PageTitle, Pill, Segmented, WRAP, copyText, cx } from '../components/ui'
import { APPLY_FREQ, APPLY_WANTS, GRADE_VALUES, KINDS, TEAM_ROLES, WORLD, cohortStatusLabel } from '../config/world'
import { CONFIRM_PHRASE } from '../config/guide'
import { api, useAsync, usePageMeta } from '../lib/backend'
import type { ApplicationCheck } from '../lib/types'
import { errMsg, fmtDate } from '../lib/util'

function Part({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-rule px-6 py-7 sm:px-8">
      <legend className="sr-only">{title}</legend>
      <p className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-[13px] text-seal">{no}</span>
        <span className="text-[19px] font-black tracking-[-0.02em]">{title}</span>
      </p>
      <div className="space-y-5">{children}</div>
    </fieldset>
  )
}

export default function Apply() {
  usePageMeta('편입 신청서', `${WORLD.orgName} 편입 신청.`)
  const cohorts = useAsync(() => api.listCohorts(), [])
  const open = [...(cohorts.data ?? [])].filter((c) => c.status === 'recruiting').sort((a, b) => b.no - a.no)[0]

  const [f, setF] = useState({ nick: '', contact: '', name: '', kind: 'sentinel', grade: 'C', age: '', one_line: '', keywords: '', ability: '', background: '', role: '상관없음', freq: APPLY_FREQ[1], message: '', secret: '', qna: '', pair: '', confirm: '' })
  const [wants, setWants] = useState<string[]>([])
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [done, setDone] = useState<{ receipt: string; pin: string; cohort: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!open) return
    setErr(null)
    const norm = (v: string) => v.replace(/\s+/g, '').replace(/[.。]$/, '')
    if (norm(f.confirm) !== norm(CONFIRM_PHRASE)) return setErr(new Error('확인 문구가 다릅니다. 커뮤 공지의 확인 문구를 그대로 적어 주세요.'))
    if (!agree) return setErr(new Error('세계관과 커뮤 규칙을 읽었다는 칸에 체크해 주세요.'))
    setBusy(true)
    try {
      const { nick, contact, ...rest } = f
      const r = await api.submitApplication({ owner_nick: nick, contact, answers: { ...rest, wants } })
      setDone({ ...r, cohort: open.no })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  const copyBoth = async () => {
    if (done && (await copyText(`접수번호 ${done.receipt}\n확인 코드 ${done.pin}`))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <>
      <PageTitle title="편입 신청서" crumbs={[{ label: '커뮤 안내', to: '/guide' }, { label: '편입 신청서' }]} desc="계정이 없어도 신청할 수 있습니다. 합격하면 결과 조회에서 편입 인가 번호를 받습니다.">
        <Link to="/apply/check" className="btn">
          결과 조회 →
        </Link>
      </PageTitle>

      <section className={cx(WRAP, 'grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start')}>
        <div className="min-w-0">
          {cohorts.loading && <Loading />}
          {cohorts.error ? <ErrorBox error={cohorts.error} /> : null}

          {done && (
            <div className="border-2 border-seal bg-card p-6 sm:p-8" role="status">
              <p className="text-[13px] text-muted-foreground">접수 완료 · 제{done.cohort}기 편입</p>
              <h2 className="mt-1 text-[28px] font-black tracking-[-0.03em]">신청서를 받았습니다</h2>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  ['접수번호', done.receipt],
                  ['확인 코드', done.pin],
                ].map(([k, v]) => (
                  <div key={k} className="border border-rule bg-muted px-4 py-3">
                    <dt className="text-[12.5px] text-muted-foreground">{k}</dt>
                    <dd className="mt-1 select-all font-mono text-[26px] font-semibold tracking-[0.08em]">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-l-4 border-destructive pl-3 text-[14.5px]">이 화면을 닫으면 확인 코드를 다시 볼 수 없습니다. 지금 저장해 두세요.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={copyBoth}>
                  {copied ? '복사했습니다' : '둘 다 복사'}
                </button>
                <Link to={`/apply/check?r=${encodeURIComponent(done.receipt)}`} className="btn">
                  결과 조회 화면
                </Link>
              </div>
            </div>
          )}

          {!cohorts.loading && !open && !done && (
            <Empty title="지금은 편입 신청 기간이 아닙니다">
              모집 일정은 커뮤 공지와 알림마당에 올립니다.
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link to="/guide/guide-notice" className="btn">
                  커뮤 공지
                </Link>
                <Link to="/apply/check" className="btn">
                  결과 조회
                </Link>
              </div>
            </Empty>
          )}

          {open && !done && (
            <form onSubmit={submit} className="border border-rule bg-card">
              <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Emblem size={24} />
                    <span className="font-black tracking-[-0.02em]">{WORLD.orgName}</span>
                  </div>
                  <p className="mt-5 whitespace-nowrap text-[28px] font-black tracking-[0.3em] sm:text-[34px] sm:tracking-[0.45em]">편입 신청서</p>
                </div>
                <dl className="grid grid-cols-[4.5rem_1fr] self-end border-y-2 border-foreground text-[13.5px]">
                  <dt className="border-b border-rule bg-muted px-2.5 py-2 text-muted-foreground">모집</dt>
                  <dd className="border-b border-rule px-2.5 py-2 font-bold">{open.title}</dd>
                  <dt className="bg-muted px-2.5 py-2 text-muted-foreground">작성일</dt>
                  <dd className="px-2.5 py-2 font-mono">{fmtDate(new Date().toISOString())}</dd>
                </dl>
              </div>

              <Part no="01" title="신청인">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="ap-nick">
                      오너 닉네임 *
                    </label>
                    <input id="ap-nick" className="field" value={f.nick} onChange={set('nick')} required maxLength={40} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="ap-contact">
                      연락 수단 (선택)
                    </label>
                    <input id="ap-contact" className="field" value={f.contact} onChange={set('contact')} maxLength={120} placeholder="운영진만 봅니다" />
                  </div>
                </div>
              </Part>

              <Part no="02" title="캐릭터">
                <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
                  <div>
                    <label className="form-label" htmlFor="ap-name">
                      이름 *
                    </label>
                    <input id="ap-name" className="field" value={f.name} onChange={set('name')} required maxLength={40} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="ap-age">
                      나이
                    </label>
                    <input id="ap-age" className="field" value={f.age} onChange={set('age')} maxLength={20} />
                  </div>
                </div>
                <div>
                  <span className="form-label">구분 *</span>
                  <Segmented name="구분" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={KINDS.map((k) => ({ value: k.value as string, label: k.label }))} />
                </div>
                <div>
                  <span className="form-label">희망 등급</span>
                  <Segmented name="희망 등급" value={f.grade} onChange={(v) => setF({ ...f, grade: v })} options={GRADE_VALUES.map((g) => ({ value: g, label: g }))} />
                  {f.grade === 'SS' && <p className="mt-1.5 text-[13px] text-warn">SS급은 아래 '운영진에게 한마디'에 이유를 적어 주세요.</p>}
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-line">
                    한 줄 소개 *
                  </label>
                  <input id="ap-line" className="field" value={f.one_line} onChange={set('one_line')} required maxLength={80} />
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-kw">
                    성격 키워드
                  </label>
                  <input id="ap-kw" className="field" value={f.keywords} onChange={set('keywords')} maxLength={120} placeholder="쉼표로 3~5개" />
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-ability">
                    능력 · 감각
                  </label>
                  <textarea id="ap-ability" className="field min-h-24" value={f.ability} onChange={set('ability')} maxLength={2000} />
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-bg">
                    이력
                  </label>
                  <textarea id="ap-bg" className="field min-h-28" value={f.background} onChange={set('background')} maxLength={4000} />
                </div>
              </Part>

              <Part no="03" title="희망 사항">
                <div>
                  <span className="form-label">희망 팀 역할</span>
                  <Segmented name="희망 팀 역할" value={f.role} onChange={(v) => setF({ ...f, role: v })} options={[...TEAM_ROLES.filter((r) => r.value !== '팀장').map((r) => ({ value: r.value as string, label: r.value })), { value: '상관없음', label: '상관없음' }]} />
                </div>
                <div>
                  <span className="form-label">커뮤에서 해 보고 싶은 것 (여러 개)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {APPLY_WANTS.map((w) => {
                      const on = wants.includes(w)
                      return (
                        <button key={w} type="button" aria-pressed={on} onClick={() => setWants(on ? wants.filter((x) => x !== w) : [...wants, w])} className={cx('border px-3 py-1.5 text-[14px]', on ? 'border-seal bg-seal font-bold text-ink' : 'border-rule hover:border-foreground')}>
                          {w}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <span className="form-label">활동 빈도</span>
                  <Segmented name="활동 빈도" value={f.freq} onChange={(v) => setF({ ...f, freq: v })} options={APPLY_FREQ.map((x) => ({ value: x, label: x }))} />
                  <p className="mt-1.5 text-[13px] text-muted-foreground">참고용입니다. 활동량에 따른 불이익은 없습니다.</p>
                </div>
              </Part>

              <Part no="04" title="비공개란 · 운영진만 봅니다">
                <div>
                  <label className="form-label" htmlFor="ap-secret">
                    비밀 설정 (선택)
                  </label>
                  <textarea id="ap-secret" className="field min-h-20" value={f.secret} onChange={set('secret')} maxLength={3000} placeholder="러닝 중에 풀고 싶은 설정" />
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-qna">
                    캐릭터 문답 (선택)
                  </label>
                  <textarea id="ap-qna" className="field min-h-20" value={f.qna} onChange={set('qna')} maxLength={3000} placeholder="예: 게이트 앞에서 가장 먼저 하는 일은?" />
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-pair">
                    선관 희망 (선택)
                  </label>
                  <input id="ap-pair" className="field" value={f.pair} onChange={set('pair')} maxLength={80} placeholder="함께 합격하길 바라는 상대 오너 닉네임" />
                  <p className="mt-1.5 text-[13px] text-muted-foreground">합격을 보장하지 않습니다. 둘 다 합격하면 가입 뒤 결속 조율로 관계를 맺어 주세요.</p>
                </div>
              </Part>

              <Part no="05" title="확인">
                <div>
                  <label className="form-label" htmlFor="ap-msg">
                    운영진에게 한마디
                  </label>
                  <textarea id="ap-msg" className="field min-h-20" value={f.message} onChange={set('message')} maxLength={2000} placeholder="궁금한 점, SS급 이유 등" />
                </div>
                <div>
                  <label className="form-label" htmlFor="ap-confirm">
                    확인 문구 *
                  </label>
                  <input id="ap-confirm" className="field" value={f.confirm} onChange={set('confirm')} required maxLength={60} placeholder="커뮤 공지의 확인 문구" autoComplete="off" />
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    <Link to="/guide/guide-notice" className="text-seal underline underline-offset-4">
                      커뮤 공지
                    </Link>
                    맨 아래에 있는 문장을 그대로 적어 주세요.
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-[14.5px]">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--seal)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>
                    <Link to="/guide/guide-world" className="text-seal underline underline-offset-4">
                      세계관
                    </Link>
                    과{' '}
                    <Link to="/guide/guide-rules" className="text-seal underline underline-offset-4">
                      커뮤 규칙
                    </Link>
                    을 읽었고 지키겠습니다.
                  </span>
                </label>
                {err ? <ErrorBox error={err} /> : null}
                <div className="flex justify-end border-t border-rule pt-5">
                  <button type="submit" className="btn btn-primary px-8" disabled={busy}>
                    {busy ? '제출 중…' : '신청서 제출'}
                  </button>
                </div>
              </Part>
            </form>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="border-t-2 border-foreground pt-3">
            <p className="text-[13px] text-muted-foreground">모집 현황</p>
            {(cohorts.data ?? []).length === 0 ? (
              <p className="mt-2 text-[14px] text-muted-foreground">아직 기수가 없습니다.</p>
            ) : (
              <ul className="mt-2">
                {[...(cohorts.data ?? [])]
                  .sort((a, b) => b.no - a.no)
                  .map((c) => (
                    <li key={c.no} className="flex items-center justify-between border-b border-rule py-2 text-[14px]">
                      <span>{c.title}</span>
                      <Pill tone={c.status === 'recruiting' ? 'seal' : 'muted'} solid={c.status === 'recruiting'}>
                        {cohortStatusLabel(c.status)}
                      </Pill>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="border-t-2 border-foreground pt-3">
            <p className="text-[13px] text-muted-foreground">순서</p>
            <ol className="mt-2 space-y-1.5 text-[14px]">
              {['신청서 제출', '접수번호 · 확인 코드 저장', '합격 발표 확인', '결과 조회에서 인가 번호 받기', '가입 · 등록증 작성', '심사 뒤 팀 배치'].map((s, i) => (
                <li key={s} className="grid grid-cols-[1.8rem_1fr]">
                  <span className="font-mono text-[13px] text-seal">{String(i + 1).padStart(2, '0')}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <Link to="/guide/guide-apply" className="btn w-full">
            신청 안내 전체 보기
          </Link>
        </aside>
      </section>
    </>
  )
}

export function ApplyCheck() {
  usePageMeta('편입 결과 조회')
  const [params] = useSearchParams()
  const [receipt, setReceipt] = useState(params.get('r') ?? '')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<ApplicationCheck | null | undefined>(undefined)
  const [err, setErr] = useState<unknown>(null)
  const [copied, setCopied] = useState(false)

  const check = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      setRes(await api.checkApplication(receipt, pin))
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle title="편입 결과 조회" crumbs={[{ label: '커뮤 안내', to: '/guide' }, { label: '편입 결과 조회' }]} desc="신청서를 낼 때 받은 접수번호와 확인 코드를 넣어 주세요." />
      <section className={cx(WRAP, 'grid gap-10 pt-10 lg:grid-cols-[420px_1fr] lg:items-start')}>
        <form onSubmit={check} className="corners space-y-4 bg-card p-5 sm:p-6">
          <div>
            <label className="form-label" htmlFor="ck-r">
              접수번호
            </label>
            <input id="ck-r" className="field font-mono uppercase" value={receipt} onChange={(e) => setReceipt(e.target.value)} required autoComplete="off" placeholder="1-XXXXXX" />
          </div>
          <div>
            <label className="form-label" htmlFor="ck-p">
              확인 코드
            </label>
            <input id="ck-p" className="field font-mono uppercase" value={pin} onChange={(e) => setPin(e.target.value)} required autoComplete="off" placeholder="8자리" />
          </div>
          {err ? <ErrorBox error={err} /> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? '확인 중…' : '결과 확인'}
          </button>
        </form>

        <div className="min-w-0">
          {res === null && <ErrorBox error={new Error('접수번호나 확인 코드가 맞지 않습니다. 대소문자는 가리지 않습니다.')} />}
          {res && (
            <div className="border border-rule bg-card p-6 sm:p-8" role="status">
              <p className="text-[13px] text-muted-foreground">
                제{res.cohort_no ?? '?'}기 편입 · {fmtDate(res.created_at)} 접수
              </p>
              {res.status === 'submitted' && (
                <>
                  <h2 className="mt-1 text-[26px] font-black">심사 중입니다</h2>
                  <p className="mt-2 text-[15px] text-muted-foreground">합격 발표 공고가 올라온 뒤 다시 확인해 주세요.</p>
                </>
              )}
              {res.status === 'rejected' && (
                <>
                  <h2 className="mt-1 text-[26px] font-black">이번 기수에는 함께하지 못하게 되었습니다</h2>
                  {res.result_note && <p className="mt-3 border-l-2 border-rule pl-3 text-[15px]">{res.result_note}</p>}
                  <p className="mt-3 text-[14px] text-muted-foreground">다음 기수 모집에 다시 신청할 수 있습니다.</p>
                </>
              )}
              {res.status === 'accepted' && (
                <>
                  <h2 className="mt-1 text-[26px] font-black text-seal">합격입니다</h2>
                  {res.result_note && <p className="mt-3 border-l-2 border-seal pl-3 text-[15px]">{res.result_note}</p>}
                  {res.invite_code ? (
                    <>
                      <div className="mt-5 border border-rule bg-muted px-4 py-3">
                        <p className="text-[12.5px] text-muted-foreground">편입 인가 번호</p>
                        <p className="mt-1 select-all font-mono text-[26px] font-semibold tracking-[0.08em]">{res.invite_code}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link to={`/auth?mode=join&code=${encodeURIComponent(res.invite_code)}`} className="btn btn-primary">
                          이 번호로 가입하기
                        </Link>
                        <button
                          type="button"
                          className="btn"
                          onClick={async () => {
                            if (await copyText(res.invite_code!)) {
                              setCopied(true)
                              setTimeout(() => setCopied(false), 1500)
                            }
                          }}
                        >
                          {copied ? '복사했습니다' : '번호 복사'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-[15px]">
                      인가 번호는 이미 가입에 쓰였습니다.{' '}
                      <Link to="/auth" className="text-seal underline underline-offset-4">
                        로그인
                      </Link>
                      해 주세요.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          {res === undefined && !err && <p className="text-[14.5px] text-muted-foreground">확인 코드를 잃어버렸다면 새로 신청해 주세요. 운영진도 코드를 볼 수 없습니다.</p>}
          {err ? <p className="mt-3 text-[13px] text-muted-foreground">{errMsg(err)}</p> : null}
        </div>
      </section>
    </>
  )
}
