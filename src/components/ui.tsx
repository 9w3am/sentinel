import { Fragment, useId, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ALERT_LEVELS, gradeLabel, kindLabel } from '../config/world'
import type { CharStatus } from '../lib/types'
import { errMsg } from '../lib/util'

export const WRAP = 'mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-10'
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

export type Tone = 'seal' | 'primary' | 'warn' | 'ok' | 'muted' | 'danger'
export const TONE: Record<Tone, string> = {
  seal: 'var(--seal)',
  primary: 'var(--foreground)',
  warn: 'var(--warn)',
  ok: 'var(--ok)',
  muted: 'var(--muted-foreground)',
  danger: 'var(--destructive)',
}

export const alertColor = (lv: number) => ['#8d8a80', '#f0c419', '#e8892a', '#d8432c', '#ff3b2f'][Math.min(5, Math.max(1, lv)) - 1]

export const kindColor = (k: string) =>
  k === 'sentinel' ? 'var(--kind-s)' : k === 'guide' ? 'var(--kind-g)' : k === 'undetermined' ? 'var(--kind-u)' : 'var(--muted-foreground)'

// ── 파수국 마크 (노란 사각형 + 눈)
export function Emblem({ size = 36, className, style }: { size?: number; ring?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} style={style} aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="var(--seal)" />
      <path d="M6 20 C11 12 29 12 34 20 C29 28 11 28 6 20Z" fill="none" stroke="#0f0f0d" strokeWidth="3" />
      <rect x="16.5" y="16.5" width="7" height="7" fill="#0f0f0d" />
    </svg>
  )
}

// ── 스탬프 (사각 도장)
export function SealStamp({ label = '승인', size = 100, className, tone = 'seal', top }: { label?: string; size?: number; className?: string; tone?: 'seal' | 'muted' | 'ink'; top?: string; bottom?: string }) {
  const color = tone === 'seal' ? 'var(--seal)' : tone === 'ink' ? '#0f0f0d' : 'var(--muted-foreground)'
  return (
    <span className={cx('stamp pointer-events-none select-none', className)} style={{ color, fontSize: Math.round(size * 0.24) }} role="img" aria-label={`${label} 도장`}>
      {label}
      {top && <small>{top}</small>}
    </span>
  )
}

export function DocFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('doc-frame', className)}>{children}</div>
}

export function DocMeta({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cx('grid grid-cols-2 border-t-2 border-foreground sm:grid-cols-4', className)}>
      {items.map(([k, v]) => (
        <div key={k} className="border-b border-rule px-3 py-2.5">
          <dt className="text-[12px] text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 text-[14px] font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function FieldRow({ label, children, mono }: { label: string; children?: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] border-b border-rule last:border-b-0 sm:grid-cols-[7.5rem_1fr]">
      <div className="bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">{label}</div>
      <div className={cx('min-w-0 px-3 py-2.5 text-[15px]', mono && 'font-mono text-[14px]')}>{children || children === 0 ? children : <span className="text-muted-foreground">—</span>}</div>
    </div>
  )
}

// ── 경보 단계
export function AlertSegments({ level, className, cell = 'h-2.5 w-6' }: { level: number; className?: string; cell?: string }) {
  const color = alertColor(level)
  return (
    <span className={cx('inline-flex gap-1', className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cx('-skew-x-[20deg]', cell)} style={{ background: n <= level ? color : 'transparent', boxShadow: `inset 0 0 0 1px ${n <= level ? color : 'var(--border)'}` }} />
      ))}
    </span>
  )
}

export function AlertLevelBar({ level, message }: { level: number; message?: string | null }) {
  const info = ALERT_LEVELS[level - 1] ?? ALERT_LEVELS[0]
  return (
    <div className="flex items-center gap-3 border-b border-rule px-5 py-2 text-[13px]">
      <strong style={{ color: alertColor(level) }}>
        경보 {level}단계 · {info.name}
      </strong>
      <span className="truncate text-muted-foreground">{message || info.desc}</span>
    </div>
  )
}

// ── 배지
export function Pill({ tone = 'muted', solid = false, children, className }: { tone?: Tone; solid?: boolean; children: ReactNode; className?: string }) {
  const c = TONE[tone]
  return (
    <span
      className={cx('inline-flex items-center gap-1 whitespace-nowrap border px-1.5 text-[12px] font-medium leading-[20px]', className)}
      style={solid ? { background: c, borderColor: c, color: '#0f0f0d' } : { borderColor: c, color: c }}
    >
      {children}
    </span>
  )
}

export function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = grade === 'SS' || grade === 'S' ? 'var(--seal)' : grade === 'A' ? 'var(--foreground)' : 'var(--muted-foreground)'
  const dims = size === 'lg' ? 'h-14 min-w-14 text-[26px]' : size === 'sm' ? 'h-[26px] min-w-[26px] text-[12px]' : 'h-[30px] min-w-[30px] text-[15px]'
  return (
    <span title={`${grade}급 · ${gradeLabel(grade)}`} className={cx('inline-grid place-items-center border-2 px-1 font-black leading-none', dims)} style={{ color, borderColor: color }}>
      {grade}
    </span>
  )
}

/** 구분 마크 — 센티넬: 터져 나가는 감각(파열) / 가이드: 흩어진 것을 묶는 고리(봉합) */
export function KindMark({ kind, size = 12 }: { kind: string; size?: number }) {
  const c = kindColor(kind)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      {kind === 'sentinel' && (
        <g fill={c}>
          <polygon points="24,0 29,15 24,11 19,15" />
          <polygon points="24,48 19,33 24,37 29,33" />
          <polygon points="0,24 15,19 11,24 15,29" />
          <polygon points="48,24 33,29 37,24 33,19" />
          <polygon points="24,16 32,24 24,32 16,24" />
          {size >= 20 && (
            <>
              <polygon points="33,15 41,7 36,17" />
              <polygon points="15,33 7,41 12,31" />
            </>
          )}
        </g>
      )}
      {kind === 'guide' && (
        <>
          <circle cx="24" cy="24" r="16" fill="none" stroke={c} strokeWidth={size >= 20 ? 3.2 : 5} />
          <g fill={c}>
            {size >= 20 && (
              <>
                <polygon points="20,4 28,4 24,14" />
                <polygon points="20,44 28,44 24,34" />
                <polygon points="4,20 4,28 14,24" />
                <polygon points="44,20 44,28 34,24" />
              </>
            )}
            <polygon points={size >= 20 ? '24,19 29,24 24,29 19,24' : '24,16 32,24 24,32 16,24'} />
          </g>
        </>
      )}
      {kind === 'normal' && <rect x="8" y="8" width="32" height="32" fill="none" stroke={c} strokeWidth="6" />}
      {kind === 'undetermined' && <circle cx="24" cy="24" r="17" fill="none" stroke={c} strokeWidth="6" strokeDasharray="9 6" />}
    </svg>
  )
}

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[12px] font-medium', className)} style={{ color: kindColor(kind) }}>
      <KindMark kind={kind} />
      {kindLabel(kind)}
    </span>
  )
}

export function StatusPill({ status }: { status: CharStatus }) {
  if (status === 'approved') return <Pill tone="ok">등록 완료</Pill>
  if (status === 'rejected') return <Pill tone="danger">반려</Pill>
  return <Pill tone="warn">심사 중</Pill>
}

// ── 증명사진
export function Avatar({ src, name, className, kind }: { src?: string | null; name?: string; className?: string; kind?: string }) {
  const id = safeId(useId())
  const c = kind ? kindColor(kind) : 'var(--muted-foreground)'
  return (
    <div className={cx('relative aspect-[3/4] shrink-0 overflow-hidden border border-rule bg-muted', className)}>
      {src ? (
        <img src={src} alt={`${name ?? ''} 사진`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <svg viewBox="0 0 60 80" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="사진 없음">
          <defs>
            <pattern id={`${id}h`} width="3" height="3" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill={c} opacity="0.25" />
            </pattern>
          </defs>
          <rect width="60" height="80" fill={`url(#${id}h)`} />
          <g fill={c} opacity="0.35">
            <circle cx="30" cy="33" r="11" />
            <path d="M8 80 C8 60 18 51 30 51 C42 51 52 60 52 80 Z" />
          </g>
        </svg>
      )}
    </div>
  )
}

// ── 상태 표시
export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[13px] text-muted-foreground" role="status">
      <span className="blink inline-block h-3 w-3 bg-seal" />
      {label}…
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="border border-destructive px-4 py-3 text-[14px] text-destructive" role="alert">
      {errMsg(error)}
    </div>
  )
}

export function Flash({ children, tone = 'seal' }: { children: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-start gap-3 border-l-4 bg-card px-4 py-3 text-[14px]" style={{ borderColor: TONE[tone] }} role="status">
      {children}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode; code?: string }) {
  return (
    <div className="border border-dashed border-rule px-6 py-14 text-center">
      <p className="text-[18px] font-bold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">{children}</div>}
    </div>
  )
}

// ── 머리말
export function PageTitle({ title, desc, crumbs = [], children }: { en?: string; title: string; desc?: ReactNode; crumbs?: { label: string; to?: string }[]; children?: ReactNode }) {
  return (
    <section className="border-b border-rule">
      <div className={cx(WRAP, 'pb-10 pt-8 sm:pb-12 sm:pt-10')}>
        <nav className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground" aria-label="현재 위치">
          <Link to="/" className="hover:text-foreground">
            홈
          </Link>
          {crumbs.map((c) => (
            <Fragment key={c.label}>
              <span aria-hidden="true">›</span>
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[40px] font-black leading-[1.05] tracking-[-0.04em] sm:text-[56px]">{title}</h1>
            {desc && <p className="mt-3 max-w-2xl text-[16px] text-muted-foreground">{desc}</p>}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

export function SectionHead({ title, action, className }: { no?: string; title: string; en?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('sechead mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-foreground pb-3', className)}>
      <h2 className="text-[24px] font-black tracking-[-0.03em]">{title}</h2>
      {action}
    </div>
  )
}

export function StatCard({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="border-t-2 border-foreground pt-3">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[40px] font-black leading-none tracking-[-0.03em] tabular-nums">
        {value}
        {unit && <span className="ml-1 text-[15px] font-normal text-muted-foreground">{unit}</span>}
      </p>
      {sub && <p className="mt-2 text-[13px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function Tabs<T extends string>({ items, value, onChange, className }: { items: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex flex-wrap gap-0.5', className)}>
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" aria-selected={it.value === value} className="tab" onClick={() => onChange(it.value)}>
          {it.label}
          {it.count != null && <span className="ml-1.5 text-[12px] opacity-60">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, name }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx('min-w-10 border px-3 py-1.5 text-[14px] transition-colors', o.value === value ? 'border-seal bg-seal font-bold text-ink' : 'border-rule hover:border-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── 아이콘
export const Icon = {
  arrow: (p: { className?: string }) => (
    <svg viewBox="0 0 16 16" width="14" height="14" className={p.className} aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  menu: () => (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d="M2 5h16M2 10h10M2 15h16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  close: () => (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  lock: () => (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
