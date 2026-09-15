// 집무실 개요의 러닝 바로가기: 지금 뛸 수 있는 것들
import { Link } from 'react-router-dom'
import { SectionHead } from '../../components/ui'
import { play, useAsync } from '../../lib/backend'
import { useApproved } from './playKit'

export function PlayHub() {
  const approved = useApproved()
  const threads = useAsync(() => play.listThreads(), [])
  const missions = useAsync(() => play.listMissions(), [])
  const events = useAsync(() => play.listEvents(), [])
  const radio = useAsync(() => play.listRadio('main'), [])
  const myIds = new Set(approved.list.map((c) => c.id))
  const all = threads.data ?? []
  const turn = all.filter((t) => t.status === 'open' && t.members.some((id) => myIds.has(id)) && t.last_character_id && !myIds.has(t.last_character_id))
  const openJoin = all.filter((t) => t.status === 'open' && t.open_join)
  const lastRadio = (radio.data ?? []).at(-1)

  const tiles = [
    { to: turn.length ? '/office/threads?f=turn' : '/office/threads', label: '교신 기록', big: turn.length, unit: '건 내 차례', sub: `난입 가능한 교신 ${openJoin.length}건` },
    { to: '/office/radio', label: '상황실 무전', big: (radio.data ?? []).length, unit: '건', sub: lastRadio ? `${lastRadio.character?.codename || lastRadio.character?.name}: ${lastRadio.body}` : '조용합니다' },
    { to: '/office/missions', label: '의뢰함', big: (missions.data ?? []).filter((m) => m.status === 'open').length, unit: '건 열림', sub: '아무 때나 혼자서도 수행' },
    { to: '/office/training', label: '특별 훈련', big: (events.data ?? []).filter((e) => e.status === 'open').length, unit: '건 접수 중', sub: '추첨 · 짝 뽑기 · 투표' },
  ]

  return (
    <section>
      <SectionHead
        title="지금 뛸 수 있는 것"
        action={
          <Link to="/guide/guide-system" className="text-[13px] text-muted-foreground hover:text-seal">
            뛰는 법 안내 →
          </Link>
        }
      />
      <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="group flex min-w-0 flex-col bg-card p-5 hover:bg-muted">
            <span className="text-[13px] text-muted-foreground group-hover:text-seal">{t.label} →</span>
            <span className="mt-2 text-[36px] font-black leading-none tabular-nums">
              {t.big}
              <span className="ml-1 text-[13px] font-normal text-muted-foreground">{t.unit}</span>
            </span>
            <span className="mt-2 truncate text-[13px] text-muted-foreground">{t.sub}</span>
          </Link>
        ))}
      </div>
      {approved.list.length === 0 && !approved.loading && (
        <ol className="mt-4 grid gap-2 text-[14px] sm:grid-cols-3">
          {[
            ['등록증 받기', '내 등록증에서 신청하고 승인을 받으면 캐릭터 명의로 참여할 수 있어요.', '/office/cards'],
            ['교신 열기 · 난입', '장소와 상황을 적고 교신을 열거나, 난입 허용 교신에 들어가요.', '/office/threads'],
            ['의뢰 · 훈련', '혼자여도 의뢰함에서 바로 뛸 수 있어요. 특별 훈련은 참가만 해 두면 됩니다.', '/office/missions'],
          ].map(([h, d, to], i) => (
            <li key={h}>
              <Link to={to} className="block h-full border border-dashed border-rule p-4 hover:border-seal">
                <span className="font-mono text-[12px] text-seal">STEP {i + 1}</span>
                <b className="mt-1 block">{h}</b>
                <span className="mt-1 block text-muted-foreground">{d}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
