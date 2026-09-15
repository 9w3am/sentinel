import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { ALERT_LEVELS, WORLD } from '../config/world'
import { api, useAsync, useAuth } from '../lib/backend'
import type { Settings } from '../lib/types'
import { Emblem, Empty, Icon, Loading, WRAP, alertColor, cx } from './ui'

const NAV = [
  { to: '/about', label: '파수국 소개', end: false },
  { to: '/rules', label: '파수국 규정', end: false },
  { to: '/incidents', label: '게이트 현황', end: false },
  { to: '/system', label: '등급 안내', end: false },
  { to: '/registry', label: '요원 명부', end: false },
  { to: '/teams', label: '현장 팀', end: false },
  { to: '/notices', label: '알림마당', end: false },
]

// 세계관 밖 커뮤 안내
const GUIDE_LINKS = [
  { to: '/guide', label: '커뮤 안내' },
  { to: '/apply', label: '편입 신청서' },
  { to: '/apply/check', label: '결과 조회' },
  { to: '/profile-examples', label: '프로필 문서 예시' },
]

export interface SiteCtx {
  settings?: Settings
  reloadSettings: () => void
}
export const useSiteContext = () => useOutletContext<SiteCtx>()

export function SiteLayout() {
  const { pathname, hash } = useLocation()
  const settings = useAsync(() => api.getSettings(), [])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const level = settings.data?.alert_level ?? 1
  const ctx: SiteCtx = { settings: settings.data, reloadSettings: settings.reload }

  return (
    <div className="min-h-screen">
      <Rail level={level} onMenu={() => setOpen(true)} />
      <div className="flex min-h-screen flex-col lg:pl-[76px]">
        <TopBar onMenu={() => setOpen(true)} level={level} />
        <main className="flex-1">
          <Suspense fallback={<Loading />}>
            <Outlet context={ctx} />
          </Suspense>
        </main>
        <Footer />
      </div>
      {open && <Drawer level={level} onClose={() => setOpen(false)} />}
    </div>
  )
}

function Rail({ level, onMenu }: { level: number; onMenu: () => void }) {
  const color = alertColor(level)
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-rule bg-black py-5 lg:flex">
      <Link to="/" aria-label={`${WORLD.orgName} 홈`}>
        <Emblem size={36} />
      </Link>
      <Link to="/" className="mt-6 text-[16px] font-black tracking-[0.32em] [writing-mode:vertical-rl]">
        {WORLD.orgName}
      </Link>
      <button type="button" onClick={onMenu} className="mt-auto flex flex-col gap-[5px] p-2" aria-label="전체 메뉴">
        <i className="block h-0.5 w-[22px] bg-foreground" />
        <i className="block h-0.5 w-[14px] bg-foreground" />
        <i className="block h-0.5 w-[22px] bg-foreground" />
      </button>
      <Link to="/incidents" className="mt-6 w-11 border py-1.5 text-center text-[11px] leading-tight" style={{ borderColor: color, color }} title={`경보 ${level}단계 · ${ALERT_LEVELS[level - 1]?.name}`}>
        경보
        <b className="block text-[20px] font-black">{level}</b>
      </Link>
    </aside>
  )
}

// 집무실 알림 숫자: 받은 결속 신청 · 반려된 내 등록증 · (관리부) 심사 대기 · 편입 신청 · 문의
function useOfficeBadges() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const data = useAsync(async () => {
    const zero = { bonds: 0, rejected: 0, admin: 0 }
    if (!session?.role) return zero
    const admin = session.role === 'admin'
    const [mine, rels, all, apps, inbox] = await Promise.all([
      api.listMyCharacters(),
      api.listMyRelations(),
      admin ? api.listAllCharacters() : Promise.resolve([]),
      admin ? api.listApplications().catch(() => []) : Promise.resolve([]),
      admin ? api.listInboxAdmin().catch(() => []) : Promise.resolve([]),
    ])
    const ids = new Set(mine.map((c) => c.id))
    return {
      bonds: rels.filter((r) => r.status === 'requested' && ids.has(r.to_character_id) && r.created_by !== session.userId).length,
      rejected: mine.filter((c) => c.status === 'rejected').length,
      admin: all.filter((c) => c.status === 'pending').length + apps.filter((a) => a.status === 'submitted').length + inbox.filter((i) => !i.reply).length,
    }
  }, [session?.userId, session?.role, pathname])
  return data.data ?? { bonds: 0, rejected: 0, admin: 0 }
}

function Badge({ n, tone = 'seal' }: { n: number; tone?: 'seal' | 'danger' }) {
  if (n <= 0) return null
  return <span className={cx('grid h-[18px] min-w-[18px] place-items-center px-1 text-[11px] font-bold leading-none text-ink', tone === 'danger' ? 'bg-destructive' : 'bg-seal')}>{n}</span>
}

function TopBar({ onMenu, level }: { onMenu: () => void; level: number }) {
  const { session } = useAuth()
  const badges = useOfficeBadges()
  const total = badges.bonds + badges.rejected + badges.admin
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-6 px-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5 lg:hidden">
          <Emblem size={28} />
          <span className="text-[17px] font-black tracking-[-0.02em]">{WORLD.orgName}</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-medium lg:flex" aria-label="주 메뉴">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('whitespace-nowrap transition-colors hover:text-seal', isActive && 'text-seal')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[13px]">
          <span className="font-mono text-[12px] lg:hidden" style={{ color: alertColor(level) }}>
            경보 {level}
          </span>
          <NavLink to="/guide" className={({ isActive }) => cx('hidden whitespace-nowrap border px-2 py-1 hover:border-seal hover:text-seal sm:inline', isActive ? 'border-seal text-seal' : 'border-rule text-muted-foreground')}>
            커뮤 안내
          </NavLink>
          {session ? (
            <>
              <span className="hidden text-muted-foreground xl:inline">{session.displayName}</span>
              <Link to="/office" className="btn btn-primary btn-sm relative" aria-label={total ? `집무실, 확인할 알림 ${total}건` : '집무실'}>
                집무실
                {total > 0 && (
                  <span className="absolute -right-2 -top-2">
                    <Badge n={total} tone="danger" />
                  </span>
                )}
              </Link>
            </>
          ) : (
            <span className="hidden items-center gap-3 sm:flex">
              <Link to="/auth" className="font-medium hover:text-seal">
                로그인
              </Link>
              <span className="text-[#44423c]">|</span>
              <Link to="/apply" className="whitespace-nowrap text-muted-foreground hover:text-foreground">
                편입 신청
              </Link>
            </span>
          )}
          <button type="button" className="btn btn-ghost btn-sm px-2 lg:hidden" onClick={onMenu} aria-label="전체 메뉴">
            <Icon.menu />
          </button>
        </div>
      </div>
    </header>
  )
}

function Drawer({ level, onClose }: { level: number; onClose: () => void }) {
  const { session } = useAuth()
  return (
    <div className="drawer-in fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="전체 메뉴">
      <div className="flex h-16 items-center justify-between border-b border-rule px-5 sm:px-8 lg:px-10">
        <span className="flex items-center gap-2.5">
          <Emblem size={28} />
          <span className="text-[17px] font-black">{WORLD.orgName}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm px-2" onClick={onClose} aria-label="메뉴 닫기">
          <Icon.close />
        </button>
      </div>
      <div className={cx(WRAP, 'grid flex-1 content-start gap-10 overflow-y-auto py-10 lg:grid-cols-[1fr_360px]')}>
        <nav aria-label="전체 메뉴">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('block border-b border-rule py-4 text-[28px] font-black tracking-[-0.03em] hover:text-seal sm:text-[40px]', isActive && 'text-seal')}>
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/registry/map" className={({ isActive }) => cx('block border-b border-rule py-4 text-[20px] font-bold tracking-[-0.02em] text-muted-foreground hover:text-seal sm:text-[26px]', isActive && 'text-seal')}>
            결속 관계도
          </NavLink>
        </nav>
        <div className="space-y-3">
          <div className="border p-4" style={{ borderColor: alertColor(level) }}>
            <p className="text-[13px] text-muted-foreground">현재 경보</p>
            <p className="text-[26px] font-black" style={{ color: alertColor(level) }}>
              {level}단계 · {ALERT_LEVELS[level - 1]?.name}
            </p>
          </div>
          {session ? (
            <Link to="/office" className="btn btn-primary w-full">
              집무실 ({session.displayName})
            </Link>
          ) : (
            <Link to="/auth" className="btn btn-primary w-full">
              로그인
            </Link>
          )}
          <div className="border-t-2 border-foreground pt-2">
            <p className="py-1 text-[12.5px] text-muted-foreground">세계관 밖 · 러너 안내</p>
            {GUIDE_LINKS.map((g) => (
              <Link key={g.to} to={g.to} className="flex items-center justify-between border-b border-rule py-3 text-[16px] font-bold hover:text-seal">
                {g.label}
                <Icon.arrow />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-rule">
      <div className={cx(WRAP, 'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 text-[12px] text-muted-foreground')}>
        <span>{WORLD.orgName} · 본 누리집의 기록은 파수국 규정에 따라 보존됩니다.</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {GUIDE_LINKS.map((g) => (
            <Link key={g.to} to={g.to} className="hover:text-foreground">
              {g.label}
            </Link>
          ))}
          <span className="font-mono">{api.mode === 'local' ? '시연 모드 · 이 브라우저에만 저장됨' : `© ${WORLD.orgNameEn}`}</span>
        </span>
      </div>
    </footer>
  )
}

// ── 집무실 (로그인 필요)
const OFFICE_NAV: { group: string; items: { to: string; label: string; end: boolean }[] }[] = [
  {
    group: '요원',
    items: [
      { to: '/office', label: '개요', end: true },
      { to: '/office/cards', label: '내 등록증', end: false },
      { to: '/office/bonds', label: '결속 관계', end: false },
      { to: '/registry/map', label: '결속 관계도', end: false },
      { to: '/office/matching', label: '매칭률', end: false },
    ],
  },
  {
    group: '러닝',
    items: [
      { to: '/office/threads', label: '교신 기록', end: false },
      { to: '/office/radio', label: '상황실 무전', end: false },
      { to: '/office/missions', label: '의뢰함', end: false },
      { to: '/office/training', label: '특별 훈련', end: false },
      { to: '/office/cases', label: '조사', end: false },
    ],
  },
  {
    group: '게시판',
    items: [
      { to: '/office/board', label: '내부 게시판', end: false },
      { to: '/office/bamboo', label: '대나무숲', end: false },
      { to: '/office/inbox', label: '문의함', end: false },
    ],
  },
]

export function OfficeLayout() {
  const { session, loading } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()
  const ctx = useSiteContext()
  const badges = useOfficeBadges()
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (nav && el) nav.scrollLeft = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2
  }, [loc.pathname, session?.role])

  const signOut = async () => {
    await api.signOut()
    navigate('/', { replace: true })
  }

  if (loading) return <Loading label="인증 확인 중" />
  if (!session) return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname)}`} replace />
  if (!session.role)
    return (
      <div className={cx(WRAP, 'py-20')}>
        <Empty title="편입이 완료되지 않은 계정입니다">
          관리부가 발급한 편입 인가 번호로 가입한 계정만 집무실을 쓸 수 있습니다. 자격이 정지된 경우에도 이 화면이 보입니다.
          <div className="mt-6">
            <button type="button" className="btn" onClick={signOut}>
              로그아웃
            </button>
          </div>
        </Empty>
      </div>
    )

  const groups = session.role === 'admin' ? [...OFFICE_NAV, { group: '운영', items: [{ to: '/office/admin', label: '관리부 콘솔', end: false }] }] : OFFICE_NAV

  return (
    <>
      <section className="border-b border-rule">
        <div className={cx(WRAP, 'flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-8')}>
          <div className="min-w-0 pb-5">
            <p className="text-[13px] text-muted-foreground">집무실</p>
            <h1 className="mt-1 max-w-[calc(100vw-40px)] truncate pb-1 text-[36px] font-black leading-none tracking-[-0.04em] sm:max-w-[640px] sm:text-[44px]" title={session.displayName}>
              {session.displayName}
              <span className="ml-2 text-[0.45em] font-medium tracking-normal text-muted-foreground">요원</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 pb-6 text-[13px]">
            <span className={cx('border px-2 py-0.5', session.role === 'admin' ? 'border-seal text-seal' : 'border-rule text-muted-foreground')}>{session.role === 'admin' ? '관리부' : '정회원'}</span>
            <button type="button" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              로그아웃 →
            </button>
          </div>
        </div>
        <nav ref={navRef} className={cx(WRAP, 'no-scrollbar relative flex gap-x-5 overflow-x-auto pb-3 lg:flex-wrap lg:gap-y-2')} aria-label="집무실 메뉴">
          {groups.map((g) => (
            <div key={g.group} className="flex shrink-0 items-center gap-0.5">
              <span className="mr-1.5 border-r border-rule pr-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">{g.group}</span>
              {g.items.map((n) => {
                const count = n.to === '/office/bonds' ? badges.bonds : n.to === '/office/cards' ? badges.rejected : n.to === '/office/admin' ? badges.admin : 0
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('tab shrink-0', n.to === '/office/admin' && !isActive && 'text-seal')}>
                    {({ isActive }) => (
                      <span aria-current={isActive ? 'page' : undefined} className={cx('-mx-3 -my-1.5 flex items-center gap-1.5 px-3 py-1.5', isActive && 'bg-foreground font-bold text-background')}>
                        {n.label}
                        <Badge n={count} tone={n.to === '/office/cards' ? 'danger' : 'seal'} />
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
      </section>
      <div className={cx(WRAP, 'py-10')}>
        <Suspense fallback={<Loading />}>
          <Outlet context={ctx} />
        </Suspense>
      </div>
    </>
  )
}
