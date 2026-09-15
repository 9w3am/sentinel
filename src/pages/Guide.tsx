import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DocBody, docOutline } from '../components/DocBody'
import { EdenSkyline } from '../components/GuideArt'
import { Sheet, type SheetCol } from '../components/Sheet'
import { TeamMark } from '../components/TeamMark'
import { Empty, GradeBadge, KindBadge, Loading, Pill, cx } from '../components/ui'
import { GUIDE_COVER, GUIDE_DOCS, GUIDE_SHEETS, GUIDE_UPDATES, guideDoc } from '../config/guide'
import { TEAM_ROLES, cohortStatusLabel } from '../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import type { Character, Team } from '../lib/types'
import { fmtDate, registryNo } from '../lib/util'

const roleIndex = (r?: string | null) => {
  const i = TEAM_ROLES.findIndex((x) => x.value === r)
  return i < 0 ? 99 : i
}

const MENU = [
  ...GUIDE_DOCS.map((d) => ({ key: d.slug, to: `/guide/${d.slug}`, en: d.en, ko: d.title })),
  { key: 'sheet', to: `/guide/sheet/${GUIDE_SHEETS[0].key}`, en: 'MEMBER', ko: '시트' },
]

export default function Guide() {
  const { slug, sheet } = useParams()
  const title = sheet ? GUIDE_SHEETS.find((s) => s.key === sheet)?.title : slug ? guideDoc(slug)?.title : undefined
  usePageMeta(title ? `${title} · 커뮤 안내` : '커뮤 안내', '센티넬버스 팀 커뮤니티 에덴의 안내 문서.')

  return (
    <>
      <GuideHero home={!slug && !sheet} />
      <GuideMenu current={sheet ? 'sheet' : (slug ?? '')} />
      {sheet ? <SheetView sheet={sheet} /> : slug ? <DocView slug={slug} /> : <GuideHome />}
    </>
  )
}

function GuideHero({ home }: { home: boolean }) {
  return (
    <header className="guide-hero">
      <div className={cx('relative z-[1] mx-auto max-w-[1100px] px-5 text-center', home ? 'pb-[clamp(170px,24vw,330px)] pt-16 sm:pt-24' : 'pb-[clamp(104px,14vw,196px)] pt-10 sm:pt-14')}>
        <p className="font-display-en pl-[0.42em] text-[10.5px] tracking-[0.42em] text-muted-foreground sm:text-[12px]">{GUIDE_COVER.kicker}</p>
        <Link to="/guide" className="mt-4 inline-block">
          <span className={cx('font-display-en block pl-[0.28em] font-bold leading-none tracking-[0.28em] text-foreground', home ? 'text-[68px] sm:text-[124px]' : 'text-[46px] sm:text-[72px]')}>{GUIDE_COVER.title}</span>
        </Link>
        <p className={cx('font-display-ko pl-[0.5em] tracking-[0.5em] text-foreground/80', home ? 'mt-5 text-[15px] sm:text-[18px]' : 'mt-3 text-[13px] sm:text-[15px]')}>{GUIDE_COVER.ko}</p>
        {home && (
          <div className="mx-auto mt-10 max-w-[30em] space-y-1 text-[14.5px] leading-[2] text-foreground/65 sm:text-[15.5px]">
            {GUIDE_COVER.tagline.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        )}
      </div>
      <EdenSkyline className={cx('pointer-events-none absolute inset-x-0 bottom-0 w-full [mask-image:linear-gradient(to_bottom,transparent,#000_40%)]', home ? 'h-[clamp(150px,26vw,340px)]' : 'h-[clamp(96px,14vw,196px)]')} />
    </header>
  )
}

function GuideMenu({ current }: { current: string }) {
  const ref = useRef<HTMLUListElement>(null)
  // 휴대폰에서는 지금 문서가 메뉴 가운데 오도록
  useEffect(() => {
    const ul = ref.current
    const el = ul?.querySelector<HTMLElement>('[aria-current="page"]')
    if (ul) ul.scrollLeft = el ? el.offsetLeft - ul.clientWidth / 2 + el.clientWidth / 2 : 0
  }, [current])

  return (
    <nav aria-label="안내 문서" className="border-y border-rule bg-background">
      <ul ref={ref} className="no-scrollbar mx-auto flex max-w-[1180px] overflow-x-auto px-2 lg:justify-center">
        {MENU.map((m) => {
          const on = current === m.key
          return (
            <li key={m.key} className="shrink-0">
              <Link to={m.to} aria-current={on ? 'page' : undefined} className={cx('group relative block px-4 py-3.5 text-center xl:px-5', on ? 'text-seal' : 'text-foreground/80 hover:text-foreground')}>
                <span className="font-display-en block text-[14px] font-bold tracking-[0.14em] sm:text-[15px]">{m.en}</span>
                <span className={cx('mt-0.5 block text-[11.5px]', on ? 'text-seal/80' : 'text-muted-foreground')}>{m.ko}</span>
                <span className={cx('absolute inset-x-4 top-0 h-[2px] bg-seal transition-opacity', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Lead({ lines }: { lines: string[] }) {
  return (
    <div className="text-center">
      <span className="mx-auto block h-px w-10 bg-seal" aria-hidden="true" />
      <div className="mx-auto my-7 max-w-[36em] space-y-1 text-[15px] leading-[2] text-foreground/75 sm:text-[15.5px]">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <span className="mx-auto block h-px w-10 bg-seal" aria-hidden="true" />
    </div>
  )
}

function SectionHead({ en, ko }: { en: string; ko: string }) {
  return (
    <div className="mb-4 flex items-end gap-3">
      <h2 className="font-display-en text-[22px] font-bold leading-none tracking-[0.14em]">{en}</h2>
      <span className="text-[13px] leading-none text-muted-foreground">{ko}</span>
    </div>
  )
}

function CohortBoard({ onSchedule = false }: { onSchedule?: boolean }) {
  const cohorts = useAsync(() => api.listCohorts(), [])
  if (cohorts.loading) return <p className="border-t border-rule py-4 text-[14px] text-muted-foreground">불러오는 중…</p>
  const list = [...(cohorts.data ?? [])].sort((a, b) => b.no - a.no)
  const open = list.some((c) => c.status === 'recruiting')
  return (
    <div>
      <ul className="border-t border-rule">
        {list.length === 0 && <li className="border-b border-rule py-4 text-[14px] text-muted-foreground">첫 모집을 준비하고 있습니다.</li>}
        {list.map((c) => (
          <li key={c.no} className="border-b border-rule py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[16px] font-bold">{c.title}</span>
              <Pill tone={c.status === 'recruiting' ? 'seal' : c.status === 'running' ? 'ok' : 'muted'} solid={c.status === 'recruiting'}>
                {cohortStatusLabel(c.status)}
              </Pill>
            </div>
            {c.note && <p className="mt-1 text-[13.5px] text-muted-foreground">{c.note}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {!onSchedule && (
          <Link to="/guide/guide-schedule" className="btn btn-sm">
          일정 보기
        </Link>
        )}
        <Link to={open ? '/apply' : '/apply/check'} className={cx('btn btn-sm', open && 'btn-primary')}>
          {open ? '편입 신청서' : '결과 조회'}
        </Link>
      </div>
    </div>
  )
}

function GuideHome() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-8 pt-16 sm:px-8 sm:pt-20">
      <Lead lines={GUIDE_COVER.welcome} />
      <p className="mx-auto mt-10 flex max-w-[52em] flex-wrap justify-center gap-x-3 gap-y-1.5 text-[14.5px] text-foreground/85">
        {GUIDE_COVER.tags.map((t, n) => (
          <span key={t} className="flex items-center gap-3">
            {n > 0 && (
              <span className="text-seal/70" aria-hidden="true">
                |
              </span>
            )}
            {t}
          </span>
        ))}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link to="/guide/guide-notice" className="btn">
          공지사항부터 읽기
        </Link>
        <Link to="/apply" className="btn btn-primary">
          편입 신청서
        </Link>
      </div>

      <div className="mt-24 grid gap-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
        <section>
          <SectionHead en="CONTENTS" ko="안내 문서" />
          <ol className="border-t border-rule">
            {GUIDE_DOCS.map((d, n) => (
              <li key={d.slug}>
                <Link to={`/guide/${d.slug}`} className="group grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-4 transition-colors hover:bg-card sm:gap-5 sm:px-2">
                  <span className="font-display-en text-[17px] text-muted-foreground group-hover:text-seal">{String(n + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-[17px] font-bold">{d.title}</span>
                      <span className="font-display-en text-[11px] tracking-[0.24em] text-seal/80">{d.en}</span>
                    </span>
                    <span className="mt-0.5 block text-[13.5px] text-muted-foreground">{d.summary}</span>
                  </span>
                  <span className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-seal" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <div className="space-y-14">
          <section>
            <SectionHead en="RECRUIT" ko="모집 현황" />
            <CohortBoard />
          </section>
          <section>
            <SectionHead en="UPDATE" ko="최신 업데이트" />
            <ul className="border-t border-rule">
              {GUIDE_UPDATES.map((u, n) => (
                <li key={n} className="grid grid-cols-[6.4rem_1fr] gap-3 border-b border-rule py-3 text-[14px]">
                  <span className="font-mono text-[12.5px] leading-[1.9] text-muted-foreground">{u.date}</span>
                  <span className="text-foreground/85">{u.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function DocView({ slug }: { slug: string }) {
  const { session } = useAuth()
  const def = guideDoc(slug)
  const page = useAsync(() => api.getPage(slug), [slug])

  if (!def)
    return (
      <div className="mx-auto max-w-[860px] px-5 py-16">
        <Empty title="없는 문서입니다">
          <Link to="/guide" className="btn mt-4">
            안내 처음으로
          </Link>
        </Empty>
      </div>
    )
  if (page.loading) return <Loading />

  const title = page.data?.title || def.title
  const body = page.data?.body ?? def.body
  const outline = docOutline(body).filter((h) => h.level === 1)
  const idx = GUIDE_DOCS.findIndex((d) => d.slug === slug)
  const prev = GUIDE_DOCS[idx - 1]
  const next = GUIDE_DOCS[idx + 1]
  const navCls = 'group block px-2 py-6'

  return (
    <article className="mx-auto max-w-[860px] px-5 pb-6 pt-14 sm:px-8 sm:pt-20">
      <header className="text-center">
        <p className="font-display-en pl-[0.4em] text-[13px] tracking-[0.4em] text-seal">{def.en}</p>
        <h1 className="font-display-ko mt-3 pl-[0.2em] text-[34px] font-black leading-tight tracking-[0.2em] sm:text-[48px]">{title}</h1>
        <div className="mt-8">
          <Lead lines={def.intro} />
        </div>
      </header>

      {outline.length > 1 && (
        <nav className="mt-10 flex flex-wrap justify-center gap-2 text-[13.5px]" aria-label="이 문서 목차">
          {outline.map((h) => (
            <button key={h.id} type="button" className="border border-rule px-3 py-1 text-muted-foreground transition-colors hover:border-seal hover:text-foreground" onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {h.text}
            </button>
          ))}
        </nav>
      )}

      {slug === 'guide-schedule' && (
        <div className="mx-auto mt-14 max-w-[520px]">
          <SectionHead en="RECRUIT" ko="모집 현황" />
          <CohortBoard onSchedule />
        </div>
      )}

      <DocBody src={body} className="mt-6" />

      {session?.role === 'admin' && (
        <div className="mt-12 text-center">
          <Link to={`/office/admin?tab=guide&doc=${slug}`} className="btn btn-sm">
            이 문서 고치기
          </Link>
        </div>
      )}

      <div className="mt-20 grid border-y border-rule sm:grid-cols-2">
        <Link to={prev ? `/guide/${prev.slug}` : '/guide'} className={cx(navCls, 'border-b border-rule sm:border-b-0 sm:border-r')}>
          <span className="font-display-en block text-[11px] tracking-[0.3em] text-muted-foreground">{prev ? 'PREV' : 'HOME'}</span>
          <span className="mt-1 block text-[18px] font-bold group-hover:text-seal">← {prev ? prev.title : '안내 처음'}</span>
        </Link>
        <Link to={next ? `/guide/${next.slug}` : '/apply'} className={cx(navCls, 'sm:text-right')}>
          <span className="font-display-en block text-[11px] tracking-[0.3em] text-muted-foreground">{next ? 'NEXT' : 'APPLY'}</span>
          <span className="mt-1 block text-[18px] font-bold group-hover:text-seal">{next ? next.title : '편입 신청서'} →</span>
        </Link>
      </div>
      <p className="mt-5 text-center font-mono text-[12px] text-muted-foreground">LAST UPDATE {page.data ? fmtDate(page.data.updated_at, true) : GUIDE_COVER.updated}</p>
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
      <div className="mx-auto max-w-[860px] px-5 py-16">
        <Empty title="없는 시트입니다">
          <Link to="/guide" className="btn mt-4">
            안내 처음으로
          </Link>
        </Empty>
      </div>
    )

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
    <div className="mx-auto max-w-[1180px] px-5 pb-6 pt-14 sm:px-8 sm:pt-20">
      <header className="text-center">
        <p className="font-display-en pl-[0.4em] text-[13px] tracking-[0.4em] text-seal">SHEET</p>
        <h1 className="font-display-ko mt-3 pl-[0.2em] text-[32px] font-black leading-tight tracking-[0.2em] sm:text-[44px]">{def.title}</h1>
        <p className="mt-4 text-[14.5px] text-muted-foreground">
          {def.summary}. 요원 명부가 바뀌면 자동으로 맞춰집니다.{updated && ` · ${fmtDate(updated)} 반영`}
        </p>
        <nav className="mt-7 flex flex-wrap justify-center gap-2" aria-label="시트">
          {GUIDE_SHEETS.map((s) => (
            <Link key={s.key} to={`/guide/sheet/${s.key}`} aria-current={s.key === sheet ? 'page' : undefined} className={cx('border px-3.5 py-1.5 text-[14px]', s.key === sheet ? 'border-seal bg-seal font-bold text-ink' : 'border-rule text-muted-foreground hover:text-foreground')}>
              {s.title}
            </Link>
          ))}
        </nav>
      </header>

      {chars.loading || teams.loading || cohorts.loading ? (
        <Loading />
      ) : (
        <div className="mt-12 space-y-12">
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
      )}
    </div>
  )
}
