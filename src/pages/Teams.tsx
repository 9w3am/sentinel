import { Link, useParams } from 'react-router-dom'
import { TeamMark } from '../components/TeamMark'
import { Empty, GradeBadge, KindBadge, Loading, PageTitle, Pill, SectionHead, WRAP, cx } from '../components/ui'
import { TEAM_ROLES, WORLD, approachLabel } from '../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import type { CaseFinding, Character } from '../lib/types'
import { fmtDate, relTime } from '../lib/util'

const roleIndex = (r?: string | null) => {
  const i = TEAM_ROLES.findIndex((x) => x.value === r)
  return i < 0 ? 99 : i
}
const byRole = (a: Character, b: Character) => roleIndex(a.team_role) - roleIndex(b.team_role) || a.name.localeCompare(b.name, 'ko')

function useTeamData() {
  const { session } = useAuth()
  const teams = useAsync(() => api.listTeams(), [])
  const chars = useAsync(() => api.listPublicCharacters(), [])
  const entries = useAsync(() => api.listAllEntries(), [])
  const incidents = useAsync(() => api.listIncidents(), [])
  // 조사 단서는 요원만 볼 수 있다
  const findings = useAsync(async () => {
    if (!session?.role) return [] as CaseFinding[]
    const cases = await api.listCases()
    return (await Promise.all(cases.map((c) => api.listCaseFindings(c.id)))).flat()
  }, [session?.role])
  const loading = teams.loading || chars.loading || entries.loading
  return { member: !!session?.role, teams: teams.data ?? [], chars: chars.data ?? [], entries: entries.data ?? [], incidents: incidents.data ?? [], findings: findings.data ?? [], loading }
}

export function TeamList() {
  usePageMeta('현장 팀', `${WORLD.orgName} 현장 팀 편성과 실적.`)
  const { member, teams, chars, entries, findings, loading } = useTeamData()

  const rows = teams.map((t) => {
    const members = chars.filter((c) => c.team_id === t.id)
    const ids = new Set(members.map((m) => m.id))
    return {
      t,
      members,
      leader: members.find((m) => m.team_role === '팀장'),
      gates: new Set(entries.filter((e) => ids.has(e.character_id)).map((e) => e.incident_id)).size,
      clues: findings.filter((f) => f.found && f.team_name === t.name).length,
    }
  })

  return (
    <>
      <PageTitle title="현장 팀" crumbs={[{ label: '현장 팀' }]} desc={`${WORLD.orgName}의 현장 활동은 모두 팀 단위로 이루어집니다.`}>
        <Link to="/guide/sheet/teams" className="btn">
          팀 편성표 →
        </Link>
      </PageTitle>
      <section className={cx(WRAP, 'pt-8')}>
        {loading && <Loading />}
        {!loading && rows.length === 0 && <Empty title="아직 편성된 팀이 없습니다">운영진이 팀을 만들면 이곳에 올라옵니다.</Empty>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-doc min-w-[760px]">
              <thead>
                <tr>
                  <th className="w-14" aria-label="패치" />
                  <th>팀</th>
                  <th className="w-40">호출부호</th>
                  <th className="w-20 text-right">인원</th>
                  <th className="w-40">팀장</th>
                  <th className="w-28 text-right">게이트 참여</th>
                  {member && <th className="w-28 text-right">조사 단서</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ t, members, leader, gates, clues }) => (
                  <tr key={t.id} className="group">
                    <td>
                      <TeamMark team={t} size={30} />
                    </td>
                    <td>
                      <Link to={`/teams/${t.id}`} className="text-[16px] font-bold group-hover:text-seal">
                        {t.name}
                      </Link>
                      {t.motto && <span className="ml-3 text-[13px] text-muted-foreground">{t.motto}</span>}
                    </td>
                    <td className="font-mono text-[14px]">{t.callsign ? <span className="text-seal">“{t.callsign}”</span> : <span className="text-muted-foreground">미정</span>}</td>
                    <td className="text-right font-mono text-[14px]">{members.length}명</td>
                    <td className="text-[14px]">{leader ? leader.name : <span className="text-muted-foreground">—</span>}</td>
                    <td className="text-right font-mono text-[14px]">{gates}건</td>
                    {member && <td className="text-right font-mono text-[14px]">{clues}건</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && <p className="mt-4 text-[13px] text-muted-foreground">실적은 명부 공개 요원 기준입니다. 순위에 따른 벌칙은 없습니다.</p>}
      </section>
    </>
  )
}

export function TeamDetail() {
  const { id = '' } = useParams()
  const { member, teams, chars, entries, incidents, findings, loading } = useTeamData()
  const team = teams.find((t) => t.id === id)
  usePageMeta(team ? `${team.name} · 현장 팀` : '현장 팀')

  if (loading) return <Loading />
  if (!team)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <Empty title="없는 팀입니다">
          <Link to="/teams" className="btn mt-4">
            현장 팀 목록
          </Link>
        </Empty>
      </div>
    )

  const members = chars.filter((c) => c.team_id === team.id).sort(byRole)
  const ids = new Set(members.map((m) => m.id))
  const teamEntries = entries.filter((e) => ids.has(e.character_id))
  const gates = incidents
    .filter((i) => teamEntries.some((e) => e.incident_id === i.id))
    .map((i) => ({ i, who: teamEntries.filter((e) => e.incident_id === i.id).map((e) => members.find((m) => m.id === e.character_id)?.name ?? '요원') }))
  const clues = findings.filter((f) => f.found && f.team_name === team.name)

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground" aria-label="현재 위치">
        <Link to="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden="true">›</span>
        <Link to="/teams" className="hover:text-foreground">
          현장 팀
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-foreground">{team.name}</span>
      </nav>

      <article className="mx-auto mt-6 max-w-5xl border border-rule bg-card">
        <header className="grid items-center gap-6 border-b border-rule p-6 sm:grid-cols-[auto_1fr_auto] sm:p-8">
          <TeamMark team={team} size={72} />
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">{WORLD.orgName} 현장 팀</p>
            <h1 className="text-[36px] font-black leading-tight tracking-[-0.04em]">{team.name}</h1>
            <p className="mt-1 font-mono text-[14px]">
              {team.callsign ? (
                <>
                  호출부호 <span className="text-seal">“{team.callsign}”</span>
                </>
              ) : (
                <span className="text-muted-foreground">호출부호 미정</span>
              )}
            </p>
          </div>
          <dl className={cx('grid gap-6 border-t border-rule pt-5 text-left sm:border-0 sm:pt-0 sm:text-right', member ? 'grid-cols-3' : 'grid-cols-2')}>
            {(
              [
                ['인원', `${members.length}명`],
                ['게이트', `${gates.length}건`],
                ...(member ? [['단서', `${clues.length}건`]] : []),
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-muted-foreground">{k}</dt>
                <dd className="font-mono text-[22px] font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        {(team.motto || team.description) && (
          <div className="border-b border-rule px-6 py-6 sm:px-8">
            {team.motto && <p className="text-[20px] font-black tracking-[-0.02em]">“{team.motto}”</p>}
            {team.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-[15.5px] leading-[1.85] text-muted-foreground">{team.description}</p>}
          </div>
        )}

        <div className="px-6 py-8 sm:px-8">
          <SectionHead title="편성" />
          {members.length === 0 ? (
            <p className="py-6 text-[14px] text-muted-foreground">배치된 공개 요원이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-doc min-w-[620px]">
                <thead>
                  <tr>
                    <th className="w-20">역할</th>
                    <th>이름</th>
                    <th className="w-28">구분</th>
                    <th className="w-16">등급</th>
                    <th className="w-16 text-right">기수</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="group">
                      <td className="text-[14px]">{m.team_role ?? <span className="text-muted-foreground">—</span>}</td>
                      <td>
                        <Link to={`/registry/${m.id}`} className="font-bold group-hover:text-seal">
                          {m.name}
                        </Link>
                        {m.codename && <span className="ml-2 text-[13px] text-muted-foreground">{m.codename}</span>}
                      </td>
                      <td>
                        <KindBadge kind={m.kind} />
                      </td>
                      <td>
                        <GradeBadge grade={m.grade} size="sm" />
                      </td>
                      <td className="text-right font-mono text-[13px]">{m.cohort_no ? `${m.cohort_no}기` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SectionHead title="게이트 참여" className="mt-12" />
          {gates.length === 0 ? (
            <p className="py-6 text-[14px] text-muted-foreground">참여한 게이트가 없습니다.</p>
          ) : (
            <ul>
              {gates.map(({ i, who }) => (
                <li key={i.id} className="grid gap-x-4 gap-y-1 border-b border-rule py-3 sm:grid-cols-[5.5rem_1fr_auto]">
                  <span className="font-mono text-[13px] text-muted-foreground">{i.code}</span>
                  <span className="min-w-0">
                    <Link to={`/incidents/${i.id}`} className="font-medium hover:text-seal">
                      {i.title}
                    </Link>
                    <span className="ml-2 text-[13px] text-muted-foreground">{who.join(', ')}</span>
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">{fmtDate(i.occurred_at)}</span>
                </li>
              ))}
            </ul>
          )}

          {member && (
            <>
              <SectionHead title="조사에서 찾은 단서" className="mt-12" />
              {clues.length === 0 ? (
                <p className="py-6 text-[14px] text-muted-foreground">아직 찾은 단서가 없습니다.</p>
              ) : (
                <ul className="space-y-4 pt-2">
                  {clues.map((f) => (
                    <li key={f.id} className="border-l-2 border-seal pl-4">
                      <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                        <Pill tone="seal">{approachLabel(f.approach)}</Pill>
                        <span className="text-foreground">{f.target_name}</span>
                        <span>{f.character_name}</span>
                        <span className="font-mono">{relTime(f.created_at)}</span>
                      </p>
                      <p className="mt-1 line-clamp-3 text-[14.5px] leading-[1.75]">{f.clue}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </article>
    </section>
  )
}
