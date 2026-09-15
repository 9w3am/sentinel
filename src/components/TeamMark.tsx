import { Link } from 'react-router-dom'
import { api, useAsync } from '../lib/backend'
import type { Team } from '../lib/types'

export const teamNumber = (name: string) => name.match(/\d+/)?.[0] ?? name.slice(0, 1)

/** 팀 패치: 팀 색 바탕에 팀 번호 */
export function TeamMark({ team, size = 28 }: { team?: Pick<Team, 'name' | 'color'> | null; size?: number }) {
  if (!team)
    return (
      <span className="inline-grid shrink-0 place-items-center border border-dashed border-rule font-mono text-[11px] text-muted-foreground" style={{ width: size, height: size, borderRadius: Math.round(size * 0.18) }} aria-hidden="true">
        —
      </span>
    )
  return (
    <span
      className="inline-grid shrink-0 place-items-center font-black leading-none text-ink"
      style={{ width: size, height: size, background: team.color, fontSize: Math.max(10, Math.round(size * 0.46)), borderRadius: Math.round(size * 0.18) }}
      aria-hidden="true"
    >
      {teamNumber(team.name)}
    </span>
  )
}

/** 등록 기록 등에서 쓰는 '팀 이름 · 역할' 링크 */
export function TeamLabel({ teamId, role }: { teamId: string; role?: string | null }) {
  const teams = useAsync(() => api.listTeams(), [])
  const t = teams.data?.find((x) => x.id === teamId)
  if (!t) return <span className="text-muted-foreground">—</span>
  return (
    <Link to={`/teams/${t.id}`} className="inline-flex items-center gap-2 hover:text-seal">
      <TeamMark team={t} size={20} />
      {t.name}
      {role && <span className="text-[13px] text-muted-foreground">· {role}</span>}
    </Link>
  )
}
