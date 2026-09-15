// 러닝 화면들이 같이 쓰는 조각
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, cx } from '../../components/ui'
import { api, useAsync } from '../../lib/backend'
import type { CharacterBrief } from '../../lib/types'

export function PlayHead({ kicker, title, action, children }: { kicker: string; title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{kicker}</p>
          <h2 className="text-[30px] font-black tracking-[-0.03em]">{title}</h2>
        </div>
        {action}
      </div>
      {children && <div className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  )
}

/** 승인된 내 등록증 (캐입 명의로 쓸 수 있는 것) */
export function useApproved() {
  const mine = useAsync(() => api.listMyCharacters(), [])
  return { loading: mine.loading && !mine.data, list: (mine.data ?? []).filter((c) => c.status === 'approved') }
}

export function CharSelect({ list, value, onChange, id, label = '캐릭터' }: { list: CharacterBrief[]; value: string; onChange: (v: string) => void; id?: string; label?: string }) {
  return (
    <select id={id} aria-label={label} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.codename ? ` · ${c.codename}` : ''}
        </option>
      ))}
    </select>
  )
}

export function NeedCard() {
  return (
    <div className="border border-dashed border-rule px-5 py-6 text-center text-[14px] text-muted-foreground">
      승인된 등록증이 있어야 참여할 수 있습니다.
      <Link to="/office/cards" className="btn btn-sm ml-3">
        내 등록증
      </Link>
    </div>
  )
}

export function Faces({ list, max = 5, size = 'w-8' }: { list: CharacterBrief[]; max?: number; size?: string }) {
  const shown = list.slice(0, max)
  return (
    <span className="flex items-center">
      {shown.map((c, i) => (
        <span key={c.id} className={cx('block border-2 border-background', i > 0 && '-ml-2.5', size)} title={c.name}>
          <Avatar src={c.avatar_url} name={c.name} kind={c.kind} className="w-full" />
        </span>
      ))}
      {list.length > max && <span className="ml-1.5 font-mono text-[12px] text-muted-foreground">+{list.length - max}</span>}
    </span>
  )
}

/** 화면이 보일 때만 주기적으로 새로 고친다 */
export function usePolling(fn: () => void, ms: number) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') ref.current()
    }, ms)
    return () => window.clearInterval(t)
  }, [ms])
}

export const hhmm = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
