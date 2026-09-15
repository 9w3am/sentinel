import { Link, useParams } from 'react-router-dom'
import { DocBody, docOutline } from '../components/DocBody'
import { Sheet, type SheetCol } from '../components/Sheet'
import { TeamMark } from '../components/TeamMark'
import { Empty, GradeBadge, KindBadge, Loading, Pill, WRAP, cx } from '../components/ui'
import { GUIDE_DOCS, GUIDE_SHEETS, guideDoc } from '../config/guide'
import { TEAM_ROLES, WORLD, cohortStatusLabel } from '../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import type { Character, Team } from '../lib/types'
import { fmtDate, registryNo } from '../lib/util'

const roleIndex = (r?: string | null) => {
  const i = TEAM_ROLES.findIndex((x) => x.value === r)
  return i < 0 ? 99 : i
}

export default function Guide() {
  const { slug, sheet } = useParams()
  const docSlug = slug ?? GUIDE_DOCS[0].slug
  const current = sheet ? `sheet/${sheet}` : docSlug
  const title = sheet ? GUIDE_SHEETS.find((s) => s.key === sheet)?.title : guideDoc(docSlug)?.title
  usePageMeta(title ? `${title} · 커뮤 안내` : '커뮤 안내', '러너에게 보여 주는 커뮤 안내 문서.')

  const docs = GUIDE_DOCS.map((d) => ({ key: d.slug, to: `/guide/${d.slug}`, label: d.title, sub: d.summary }))
  const sheets = GUIDE_SHEETS.map((s) => ({ key: `sheet/${s.key}`, to: `/guide/sheet/${s.key}`, label: s.title, sub: s.summary }))

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground" aria-label="현재 위치">
        <Link to="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-foreground">커뮤 안내</span>
      </nav>

      {/* 휴대폰: 옆으로 넘기는 문서 목록 */}
      <div className="-mx-5 mt-5 flex gap-1 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:hidden" aria-label="안내 문서">
        {[...docs, ...sheets].map((it) => (
          <Link key={it.key} to={it.to} className={cx('shrink-0 border px-3 py-1.5 text-[14px]', current === it.key ? 'border-foreground bg-foreground font-bold text-background' : 'border-rule text-muted-foreground')}>
            {it.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-7">
            <p className="border-l-2 border-seal pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
              <b className="block text-[13px] text-foreground">세계관 밖 문서</b>
              러너를 위한 안내입니다. 누리집의 다른 화면은 {WORLD.orgName} 공식 누리집이라는 설정으로 꾸며져 있습니다.
            </p>
            <GuideNav title="문서" items={docs} current={current} />
            <GuideNav title="시트" items={sheets} current={current} />
            <Link to="/apply" className="btn btn-primary w-full">
              편입 신청서
            </Link>
          </div>
        </aside>
        <div className="min-w-0">{sheet ? <SheetView sheet={sheet} /> : <DocView slug={docSlug} />}</div>
      </div>
    </section>
  )
}

function GuideNav({ title, items, current }: { title: string; items: { key: string; to: string; label: string; sub: string }[]; current: string }) {
  return (
    <div>
      <p className="border-b-2 border-foreground pb-1.5 text-[13px] font-bold">{title}</p>
      <ul>
        {items.map((it) => (
          <li key={it.key}>
            <Link to={it.to} aria-current={current === it.key ? 'page' : undefined} className={cx('block border-b border-rule py-2.5 hover:text-seal', current === it.key && 'text-seal')}>
              <span className={cx('block text-[14.5px]', current === it.key && 'font-bold')}>{it.label}</span>
              <span className="block text-[12px] text-muted-foreground">{it.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DocView({ slug }: { slug: string }) {
  const { session } = useAuth()
  const def = guideDoc(slug)
  const page = useAsync(() => api.getPage(slug), [slug])

  if (!def)
    return (
      <Empty title="없는 문서입니다">
        <Link to="/guide" className="btn mt-4">
          안내 처음으로
        </Link>
      </Empty>
    )
  if (page.loading) return <Loading />

  const title = page.data?.title || def.title
  const body = page.data?.body ?? def.body
  const outline = docOutline(body)
  const idx = GUIDE_DOCS.findIndex((d) => d.slug === slug)
  const prev = GUIDE_DOCS[idx - 1]
  const next = GUIDE_DOCS[idx + 1]

  return (
    <article>
      <header className="border-b-2 border-foreground pb-5">
        <p className="font-mono text-[12px] text-muted-foreground">커뮤 안내 · {page.data ? `${fmtDate(page.data.updated_at)} 수정` : '기본 문서'}</p>
        <h1 className="mt-2 text-[34px] font-black leading-tight tracking-[-0.04em] sm:text-[44px]">{title}</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">{def.summary}</p>
      </header>
      {outline.length > 2 && (
        <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-b border-rule pb-4 text-[13.5px]" aria-label="이 문서 목차">
          {outline.map((h) => (
            <button key={h.id} type="button" className="text-muted-foreground hover:text-seal" onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {h.text}
            </button>
          ))}
        </nav>
      )}
      <DocBody src={body} className="mt-10 max-w-[760px]" />
      {session?.role === 'admin' && (
        <Link to={`/office/admin?tab=guide&doc=${slug}`} className="btn btn-sm mt-10">
          이 문서 고치기
        </Link>
      )}
      <div className="mt-14 grid gap-4 border-t-2 border-foreground pt-4 sm:grid-cols-2">
        {prev ? (
          <Link to={`/guide/${prev.slug}`} className="group">
            <span className="block text-[12px] text-muted-foreground">이전 문서</span>
            <span className="block font-bold group-hover:text-seal">← {prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        <Link to={next ? `/guide/${next.slug}` : '/guide/sheet/members'} className="group sm:text-right">
          <span className="block text-[12px] text-muted-foreground">{next ? '다음 문서' : '시트'}</span>
          <span className="block font-bold group-hover:text-seal">{next ? next.title : GUIDE_SHEETS[0].title} →</span>
        </Link>
      </div>
    </article>
  )
}

function SheetView({ sheet }: { sheet: string }) {
  const def = GUIDE_SHEETS.find((s) => s.key === sheet)
  const chars = useAsync(() => api.listPublicCharacters(), [])
  const teams = useAsync(() => api.listTeams(), [])
  const cohorts = useAsync(() => api.listCohorts(), [])

  if (!def)
    return (
      <Empty title="없는 시트입니다">
        <Link to="/guide" className="btn mt-4">
          안내 처음으로
        </Link>
      </Empty>
    )
  if (chars.loading || teams.loading || cohorts.loading) return <Loading />

  const list = chars.data ?? []
  const teamList = teams.data ?? []
  const teamOf = (c: Character) => teamList.find((t) => t.id === c.team_id) ?? null
  const updated = list.reduce((m, c) => (c.updated_at > m ? c.updated_at : m), '')

  const nameCell = (c: Character) => (
    <Link to={`/registry/${c.id}`} className="font-bold hover:text-seal">
      {c.name}
    </Link>
  )
  const base: Record<string, SheetCol<Character>> = {
    cohort: { key: 'cohort', label: '기수', width: '60px', align: 'center', render: (c) => <span className="font-mono text-[13px]">{c.cohort_no ? `${c.cohort_no}기` : '—'}</span> },
    no: { key: 'no', label: '등록번호', width: '132px', render: (c) => <span className="font-mono text-[12px] text-muted-foreground">{registryNo(c.id, c.kind, c.grade)}</span> },
    name: { key: 'name', label: '이름', render: nameCell },
    codename: { key: 'codename', label: '코드네임', render: (c) => c.codename || <span className="text-muted-foreground">—</span> },
    kind: { key: 'kind', label: '구분', width: '100px', render: (c) => <KindBadge kind={c.kind} /> },
    grade: { key: 'grade', label: '등급', width: '60px', align: 'center', render: (c) => <GradeBadge grade={c.grade} size="sm" /> },
    aff: { key: 'aff', label: '소속', render: (c) => <span className="text-[13.5px] text-muted-foreground">{c.affiliation || '—'}</span> },
    team: {
      key: 'team',
      label: '팀',
      width: '120px',
      render: (c) => {
        const t = teamOf(c)
        return t ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <TeamMark team={t} size={18} />
            {t.name}
          </span>
        ) : (
          <span className="text-muted-foreground">미배치</span>
        )
      },
    },
    role: { key: 'role', label: '역할', width: '64px', render: (c) => c.team_role || <span className="text-muted-foreground">—</span> },
  }
  const teamSort = (c: Character) => teamOf(c)?.sort ?? 999

  return (
    <div>
      <header className="border-b-2 border-foreground pb-5">
        <p className="font-mono text-[12px] text-muted-foreground">
          커뮤 시트 · 명부 공개 요원 기준{updated && ` · ${fmtDate(updated)} 반영`}
        </p>
        <h1 className="mt-2 text-[34px] font-black leading-tight tracking-[-0.04em] sm:text-[44px]">{def.title}</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">{def.summary}. 요원 명부가 바뀌면 자동으로 맞춰집니다.</p>
      </header>

      <div className="mt-8 space-y-12">
        {sheet === 'members' && (
          <Sheet
            cols={[base.cohort, base.no, base.name, base.codename, base.kind, base.grade, base.aff, base.team, base.role]}
            rows={[...list].sort((a, b) => (a.cohort_no ?? 999) - (b.cohort_no ?? 999) || teamSort(a) - teamSort(b) || roleIndex(a.team_role) - roleIndex(b.team_role) || a.name.localeCompare(b.name, 'ko'))}
            rowKey={(c) => c.id}
            minWidth={900}
            empty="명부에 공개된 요원이 아직 없습니다."
          />
        )}

        {sheet === 'teams' &&
          [...teamList, null].map((t: Team | null) => {
            const members = list.filter((c) => (t ? c.team_id === t.id : !c.team_id || !teamList.some((x) => x.id === c.team_id)))
            if (!t && members.length === 0) return null
            return (
              <section key={t?.id ?? 'none'}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <TeamMark team={t} size={30} />
                  <h2 className="text-[20px] font-black tracking-[-0.02em]">
                    {t ? (
                      <Link to={`/teams/${t.id}`} className="hover:text-seal">
                        {t.name}
                      </Link>
                    ) : (
                      '미배치'
                    )}
                  </h2>
                  {t && (t.callsign ? <span className="font-mono text-[13px] text-seal">“{t.callsign}”</span> : <span className="text-[13px] text-muted-foreground">호출부호 미정</span>)}
                  <span className="ml-auto text-[13px] text-muted-foreground">{members.length}명</span>
                </div>
                <Sheet
                  cols={[base.role, base.name, base.codename, base.kind, base.grade, base.cohort]}
                  rows={[...members].sort((a, b) => roleIndex(a.team_role) - roleIndex(b.team_role) || a.name.localeCompare(b.name, 'ko'))}
                  rowKey={(c) => c.id}
                  minWidth={560}
                  empty="배치된 요원이 없습니다."
                />
              </section>
            )
          })}
        {sheet === 'teams' && teamList.length === 0 && <Empty title="아직 편성된 팀이 없습니다">운영진이 팀을 만들면 이곳에 올라옵니다.</Empty>}

        {sheet === 'cohorts' && (
          <>
            {[...(cohorts.data ?? [])]
              .sort((a, b) => b.no - a.no)
              .map((co) => {
                const members = list.filter((c) => c.cohort_no === co.no)
                return (
                  <section key={co.no}>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h2 className="text-[20px] font-black tracking-[-0.02em]">{co.title}</h2>
                      <Pill tone={co.status === 'recruiting' ? 'seal' : co.status === 'running' ? 'ok' : 'muted'} solid={co.status === 'recruiting'}>
                        {cohortStatusLabel(co.status)}
                      </Pill>
                      <span className="ml-auto text-[13px] text-muted-foreground">{members.length}명</span>
                    </div>
                    <Sheet cols={[base.no, base.name, base.kind, base.grade, base.team, base.role]} rows={members} rowKey={(c) => c.id} minWidth={640} empty={co.status === 'recruiting' ? '모집 중입니다. 합격한 요원의 등록증이 승인되면 올라옵니다.' : '이 기수로 올라온 요원이 없습니다.'} />
                  </section>
                )
              })}
            {(cohorts.data ?? []).length === 0 && <Empty title="아직 기수가 없습니다">첫 모집이 시작되면 이곳에 기수별 명단이 생깁니다.</Empty>}
          </>
        )}
      </div>
    </div>
  )
}
