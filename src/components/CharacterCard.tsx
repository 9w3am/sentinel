import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { gradeLabel } from '../config/world'
import type { Character } from '../lib/types'
import { registryNo } from '../lib/util'
import { Avatar, GradeBadge, KindBadge, cx } from './ui'

type CardData = Pick<Character, 'id' | 'name' | 'codename' | 'kind' | 'grade' | 'affiliation' | 'avatar_url' | 'details'>

export function CharacterCard({ c, to, className, footer }: { c: CardData; to?: string; className?: string; footer?: ReactNode }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-rule px-3.5 py-2">
        <span className="truncate font-mono text-[11px] text-muted-foreground">{registryNo(c.id || 'preview', c.kind, c.grade)}</span>
        <KindBadge kind={c.kind} />
      </div>
      <div className="grid grid-cols-[76px_1fr] gap-3.5 p-3.5">
        <Avatar src={c.avatar_url} name={c.name} kind={c.kind} />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[20px] font-black tracking-[-0.03em] group-hover:text-seal">{c.name || '이름 없음'}</h3>
            <GradeBadge grade={c.grade} size="sm" />
          </div>
          <p className="truncate text-[13px] text-muted-foreground">
            {c.codename ? `${c.codename} · ` : ''}
            {c.affiliation || '소속 없음'}
          </p>
          <p className="mt-2 truncate text-[13px]">
            {gradeLabel(c.grade)}
            {c.details?.spirit && <span className="text-muted-foreground"> · 정신체 {c.details.spirit}</span>}
          </p>
        </div>
      </div>
      {c.details?.quote && <p className="line-clamp-2 border-t border-rule px-3.5 py-2 text-[13px] text-muted-foreground">{c.details.quote}</p>}
      {footer}
    </>
  )

  if (to)
    return (
      <Link to={to} className={cx('group block border border-rule bg-card transition-colors hover:border-foreground', className)}>
        {body}
      </Link>
    )
  return <div className={cx('border border-rule bg-card', className)}>{body}</div>
}
