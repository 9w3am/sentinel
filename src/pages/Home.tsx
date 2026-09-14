import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSiteContext } from '../components/Layout'
import { Pill, WRAP, cx } from '../components/ui'
import { ALERT_LEVELS, WORLD, incidentStatusLabel } from '../config/world'
import { api, useAsync, usePageMeta } from '../lib/backend'
import type { Incident, Notice } from '../lib/types'
import { fmtDate } from '../lib/util'

const p2 = (n: number) => String(n).padStart(2, '0')
const hhmm = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`
}
function when(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return hhmm(iso)
  if (d.toDateString() === y.toDateString()) return '어제'
  return `${p2(d.getMonth() + 1)}.${p2(d.getDate())}`
}
const statusColor = (s: Incident['status']) => (s === 'open' ? 'var(--destructive)' : s === 'responding' ? 'var(--seal)' : 'var(--muted-foreground)')

// 경보 문구를 첫 문장 / 나머지로 나눈다
function splitMessage(msg: string) {
  const m = msg.match(/^(.+?[.!?。])\s+(.+)$/)
  return m ? [m[1], m[2]] : [msg, '']
}

type NoticeTab = 'all' | 'normal' | 'alert'

export default function Home() {
  usePageMeta('', `${WORLD.orgName} 공식 누리집. 게이트 현황, 등급 안내, 요원 명부.`)
  const { settings } = useSiteContext()
  const notices = useAsync(() => api.listNotices(), [])
  const incidents = useAsync(() => api.listIncidents(), [])
  const [tab, setTab] = useState<NoticeTab>('all')

  const level = settings?.alert_level ?? 1
  const info = ALERT_LEVELS[level - 1] ?? ALERT_LEVELS[0]
  const danger = level >= 4
  const [lead, rest] = splitMessage(settings?.alert_message || info.desc)

  const noticeList = (notices.data ?? []).filter((n) => tab === 'all' || (tab === 'normal' ? n.level === 'normal' : n.level !== 'normal')).slice(0, 6)

  return (
    <>
      {/* ── 경보판 + 게이트 기록 */}
      <section className="border-b border-rule">
        <div className="grid lg:grid-cols-[minmax(0,780px)_1fr]">
          <div className="alert-cut relative min-h-[470px] overflow-hidden text-ink sm:min-h-[540px] lg:min-h-[560px]" style={{ background: danger ? 'var(--destructive)' : 'var(--seal)' }}>
            <div className="dots pointer-events-none absolute right-10 top-0 h-[360px] w-[360px] opacity-55" />
            <div className="tape pointer-events-none absolute -right-[70px] top-[34px] h-[30px] w-[340px] rotate-[38deg]" />
            <div className="absolute left-6 top-7 flex items-baseline gap-4 text-[14px] font-bold sm:left-11">
              <span>오늘의 경보</span>
              <span className="font-mono text-[13px] font-medium">발령 {hhmm(settings?.updated_at)} · 상황실</span>
            </div>
            <p className="absolute left-6 right-6 top-[84px] max-w-[450px] text-[20px] font-bold leading-[1.5] sm:left-11 sm:text-[22px]">
              {lead}
              {rest && <span className="mt-2.5 block text-[15px] font-medium leading-[1.7]">{rest}</span>}
            </p>
            <div className="absolute bottom-[132px] right-6 sm:bottom-14 sm:right-[120px]">
              <span className="stamp stamp-in text-[24px] sm:text-[26px]">
                {info.name.split('').join(' ')}
                <small>경보 {level}단계</small>
              </span>
            </div>
            <div className="absolute -bottom-[56px] left-4 select-none text-[250px] font-black leading-none tracking-[-0.06em] sm:-bottom-[78px] sm:left-7 sm:text-[360px]" aria-label={`경보 ${level}단계`}>
              {level}
              <small className="ml-3 align-[60px] text-[84px] tracking-[-0.04em] sm:align-[78px] sm:text-[120px]">단계</small>
            </div>
          </div>

          <div className="px-5 py-8 sm:px-8 lg:px-10">
            <div className="corners px-5 pb-4 pt-5 sm:px-6">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[22px] font-black tracking-[-0.03em]">게이트 발생 기록</h2>
                <Link to="/incidents" className="text-[13px] text-muted-foreground hover:text-seal">
                  전체 기록 →
                </Link>
              </div>
              {(incidents.data ?? []).slice(0, 5).map((i) => {
                const c = statusColor(i.status)
                return (
                  <Link
                    key={i.id}
                    to={`/incidents/${i.id}`}
                    className={cx('grid h-14 grid-cols-[44px_68px_38px_minmax(64px,1fr)_64px] items-center gap-1.5 border-t border-rule text-[15px] hover:bg-muted xl:grid-cols-[56px_84px_44px_minmax(64px,1fr)_68px]', i.status === 'closed' && 'text-muted-foreground')}
                  >
                    <span className="font-mono text-[13px] text-muted-foreground">{when(i.occurred_at)}</span>
                    <span className="font-mono text-[14px]">{i.code}</span>
                    <span className="grid h-[30px] w-[30px] place-items-center border-2 text-[15px] font-black" style={{ color: i.status === 'closed' ? undefined : c }}>
                      {i.grade}
                    </span>
                    <span className="truncate">{i.location}</span>
                    <span className="text-right text-[14px] font-bold" style={{ color: c }}>
                      {incidentStatusLabel(i.status)}
                    </span>
                  </Link>
                )
              })}
              {incidents.data?.length === 0 && <p className="border-t border-rule py-10 text-center text-[14px] text-muted-foreground">기록된 게이트가 없습니다.</p>}
              <p className="mt-3 text-[13px] text-muted-foreground">
                등급은 측정된 마력량 기준. <b className="font-medium text-foreground">A급 이상</b>은 발생 즉시 알림 발송.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 알림마당 + 민원 */}
      <section className={cx(WRAP, 'grid gap-12 pt-12 lg:grid-cols-[1fr_400px]')}>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <h2 className="text-[26px] font-black tracking-[-0.03em]">알림마당</h2>
            <div role="tablist" className="flex gap-0.5">
              {(
                [
                  ['all', '전체'],
                  ['normal', '공지'],
                  ['alert', '경보'],
                ] as [NoticeTab, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={tab === v} className="tab" onClick={() => setTab(v)}>
                  {l}
                </button>
              ))}
            </div>
            <Link to="/notices" className="ml-auto text-[13px] text-muted-foreground hover:text-seal">
              더보기 +
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-doc min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-16">번호</th>
                  <th className="w-20">분류</th>
                  <th>제목</th>
                  <th className="w-28 text-right">등록일</th>
                </tr>
              </thead>
              <tbody>
                {noticeList.map((n) => (
                  <NoticeRow key={n.id} n={n} />
                ))}
              </tbody>
            </table>
            {notices.data && noticeList.length === 0 && <p className="py-10 text-center text-[14px] text-muted-foreground">게시된 글이 없습니다.</p>}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-[22px] font-black tracking-[-0.03em]">자주 찾는 민원</h2>
          <div>
            {[
              ['편입 신청', '편입 인가 번호가 있는 경우', '/auth?mode=join'],
              ['등급 안내', 'SS급부터 미분류까지', '/system'],
              ['결속 신고', '각인 · 전담 페어 등록 (요원 전용)', '/office/bonds'],
              ['매칭률 조회', '등록 요원만 가능', '/office/matching'],
              ['요원 명부', '공개 등록자 검색', '/registry'],
            ].map(([t, d, to], idx) => (
              <Link
                key={t}
                to={to}
                className={cx('group grid grid-cols-[1fr_auto] items-center px-4 py-[17px]', idx === 0 ? 'bg-seal text-ink' : 'border-b border-rule hover:bg-muted', idx === 1 && 'border-t border-rule')}
              >
                <span>
                  <b className="block text-[18px] font-bold">{t}</b>
                  <span className={cx('block text-[13px]', idx === 0 ? 'text-ink/80' : 'text-muted-foreground')}>{d}</span>
                </span>
                <span className={cx('text-[20px] transition-transform group-hover:translate-x-1', idx === 0 ? 'text-ink' : 'text-muted-foreground')}>→</span>
              </Link>
            ))}
          </div>
          <div className="mt-6 border border-rule px-4 py-4 text-[13px] leading-relaxed text-muted-foreground">
            상황실 · 24시간
            <b className="block font-mono text-[24px] font-medium text-foreground">내선 0000</b>
            폭주 징후를 보았다면 거리를 두고 신고하십시오.
          </div>
        </div>
      </section>
    </>
  )
}

function NoticeRow({ n }: { n: Notice }) {
  return (
    <tr className={cx('group', n.pinned && 'bg-muted')}>
      <td className="text-[13px] text-muted-foreground">{n.pinned ? '공지' : <span className="font-mono">{n.doc_no}</span>}</td>
      <td>{n.level === 'normal' ? <Pill>공지</Pill> : <Pill tone={n.level === 'critical' ? 'danger' : 'seal'} solid>{n.level === 'critical' ? '긴급' : '경보'}</Pill>}</td>
      <td>
        <Link to={`/notices/${n.id}`} className="block truncate font-medium group-hover:text-seal">
          {n.title}
        </Link>
      </td>
      <td className="text-right font-mono text-[13px] text-muted-foreground">{fmtDate(n.created_at).replace(/\. /g, '.').replace(/\.$/, '')}</td>
    </tr>
  )
}
