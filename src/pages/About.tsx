import { PageTitle, SectionHead, WRAP, cx } from '../components/ui'
import { WORLD } from '../config/world'
import { usePageMeta } from '../lib/backend'

const HISTORY: [string, string][] = [
  ['2004', '제1차 대규모 게이트 발생. 최초의 센티넬 발현 보고'],
  ['2009', `${WORLD.orgName} 설립`],
  ['2012', '가이딩센터 개소, 전담 페어 제도 도입'],
  ['2019', '제2차 대규모 게이트 발생. 지부 체계 확대'],
  ['2023', '매칭률 검사 표준 채택'],
]

const DEPTS: [string, string][] = [
  ['대응국', '게이트 봉쇄와 현장 지휘'],
  ['가이딩센터', '상주 가이딩, 전담 페어 배정'],
  ['판정국', '등급 판정, 매칭률 검사'],
  ['감찰부', '폭주 사고와 규정 위반 조사'],
  ['연구소', '각성 · 정신체 연구'],
  ['교육원', '신규 각성자 적응 교육'],
]

export default function About() {
  usePageMeta('협회 소개', `${WORLD.orgName} 소개.`)
  return (
    <>
      <PageTitle title="협회 소개" crumbs={[{ label: '협회 소개' }]} desc="각성자를 등록하고, 게이트에 대응하고, 결속을 관리합니다." />

      <section className={cx(WRAP, 'grid gap-12 pt-12 lg:grid-cols-[1.2fr_1fr]')}>
        <div className="corners px-6 py-7 sm:px-8">
          <h2 className="text-[22px] font-black tracking-[-0.03em]">협회장 인사말</h2>
          <div className="mt-5 space-y-3 text-[17px] leading-[1.85]">
            <p>감각이 남들보다 멀리 닿는 것은 축복이기 전에 고통이었습니다.</p>
            <p className="text-muted-foreground">협회는 그 고통을 누구도 혼자 견디지 않게 하려고 있습니다. 오늘도 게이트 앞에 선 모든 요원에게 감사드립니다.</p>
          </div>
          <div className="mt-10 flex items-end justify-end gap-4">
            <span className="text-[17px] font-bold">{WORLD.orgName} 협회장</span>
            <span className="stamp text-[18px] text-seal">
              협 회 장<small>직인</small>
            </span>
          </div>
        </div>

        <div>
          <SectionHead title="연혁" />
          <ul>
            {HISTORY.map(([y, t]) => (
              <li key={y} className="grid grid-cols-[72px_1fr] border-b border-rule py-3.5">
                <span className="font-mono text-[15px] text-seal">{y}</span>
                <span className="text-[16px]">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cx(WRAP, 'pt-14')}>
        <SectionHead title="조직" action={<span className="text-[13px] text-muted-foreground">본부 6개 부서 · 지부 4곳</span>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {DEPTS.map(([t, d]) => (
            <div key={t} className="border-b border-rule py-5 pr-6">
              <h3 className="text-[20px] font-black tracking-[-0.03em]">{t}</h3>
              <p className="mt-1 text-[14px] text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
