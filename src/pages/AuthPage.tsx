import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBox, Tabs, WRAP, cx } from '../components/ui'
import { api, useAuth, usePageMeta } from '../lib/backend'

type Mode = 'login' | 'join'

export default function AuthPage() {
  const { session, refresh } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'join' ? 'join' : 'login')
  usePageMeta(mode === 'login' ? '로그인' : '편입 신청', '등록 요원 로그인 · 편입 신청.')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const next = params.get('next') || '/office'

  if (session) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (mode === 'join' && pw !== pw2) return setErr(new Error('비밀번호 확인이 일치하지 않습니다.'))
    setBusy(true)
    try {
      if (mode === 'login') await api.signIn(email, pw)
      else await api.signUp(code, email, pw, name)
      await refresh()
      navigate(next, { replace: true })
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={cx(WRAP, 'grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_460px] lg:items-start')}>
      <div className="lg:pt-4">
        <h1 className="text-[44px] font-black leading-[1.05] tracking-[-0.04em] sm:text-[64px]">{mode === 'login' ? '로그인' : '편입 신청'}</h1>
        <p className="mt-4 max-w-lg text-[16px] leading-[1.8] text-muted-foreground">
          {mode === 'login' ? '집무실, 협회 게시판, 결속 신고는 등록 요원만 쓸 수 있습니다.' : '관리부에서 받은 편입 인가 번호가 있어야 계정을 만들 수 있습니다.'}
        </p>
        <ol className="mt-10 max-w-lg border-t-2 border-foreground">
          {[
            ['편입 인가 번호', '관리부가 한 사람에게 하나씩 발급합니다. 한 번 쓰면 사라집니다.'],
            ['이메일', '로그인에만 쓰이고 명부에는 나오지 않습니다.'],
            ['계정 공유 금지', '다른 사람과 계정을 나눠 쓰면 자격이 정지될 수 있습니다.'],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[2.5rem_1fr] border-b border-rule py-3.5">
              <span className="font-mono text-[13px] text-seal">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="font-bold">{t}</p>
                <p className="text-[14px] text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="corners bg-card">
        <div className="border-b border-rule px-5 py-4">
          <Tabs
            value={mode}
            onChange={(m) => {
              setMode(m)
              setErr(null)
            }}
            items={[
              { value: 'login' as Mode, label: '로그인' },
              { value: 'join' as Mode, label: '편입 신청' },
            ]}
          />
        </div>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          {mode === 'join' && (
            <div>
              <label className="form-label" htmlFor="code">
                편입 인가 번호
              </label>
              <input id="code" className="field font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SNTL-XXXX-XXXX" required autoComplete="off" />
            </div>
          )}
          <div>
            <label className="form-label" htmlFor="email">
              이메일
            </label>
            <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="form-label" htmlFor="pw">
              비밀번호
            </label>
            <input id="pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          {mode === 'join' && (
            <>
              <div>
                <label className="form-label" htmlFor="pw2">
                  비밀번호 확인
                </label>
                <input id="pw2" type="password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} autoComplete="new-password" />
              </div>
              <div>
                <label className="form-label" htmlFor="name">
                  호칭
                </label>
                <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} placeholder="게시판 · 관리부에 보이는 이름" />
                <p className="mt-1 text-[12.5px] text-muted-foreground">등록증 이름과는 따로 쓰는, 계정 주인을 구분하는 이름입니다.</p>
              </div>
            </>
          )}
          {err ? <ErrorBox error={err} /> : null}
          <button type="submit" className="btn btn-primary h-12 w-full text-[15px]" disabled={busy}>
            {busy ? '확인 중…' : mode === 'login' ? '로그인' : '편입 신청'}
          </button>
          {api.mode === 'local' && mode === 'join' && <p className="border border-dashed border-rule px-3 py-2 font-mono text-[12px] text-muted-foreground">시연 모드 · 운영자 번호 DEMO-ADMIN</p>}
        </form>
      </div>
    </section>
  )
}
