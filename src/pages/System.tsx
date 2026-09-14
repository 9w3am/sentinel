import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GradeBadge, KindMark, PageTitle, SectionHead, TONE, WRAP, cx } from '../components/ui'
import { GRADES } from '../config/world'
import { usePageMeta } from '../lib/backend'

const TERMS: [string, string][] = [
  ['가이딩', '가이드가 센티넬을 진정시키는 것. 손을 잡는 접촉형, 곁에만 있어도 되는 방사형.'],
  ['폭주', '한계를 넘은 센티넬이 통제력을 잃는 상태.'],
  ['각인', '센티넬과 가이드 사이의 되돌릴 수 없는 유대. 센티넬은 평생 한 명.'],
  ['매칭률', '두 사람의 파장이 맞는 정도. 높을수록 안정이 빠르다.'],
  ['정신체', '각성자의 마음이 동물 모습으로 나타난 것.'],
  ['존', '감각 하나에 빠져 반응이 없는 상태.'],
  ['실드', '정신 간섭을 막는 방벽.'],
  ['게이트', '이계로 통하는 틈. 등급은 마력량 기준.'],
]

const MATCH: [number, string, keyof typeof TONE][] = [
  [40, '비권고', 'muted'],
  [55, '응급 시', 'warn'],
  [75, '임시 가이딩', 'ok'],
  [90, '전담 페어', 'primary'],
  [100, '각인 적합', 'seal'],
]

const STEPS: [string, string][] = [
  ['편입 인가', '관리부에서 인가 번호를 받는다'],
  ['편입 신청', '인가 번호로 계정을 만든다'],
  ['등록증 신청', '집무실에서 등급 · 소속 등을 적는다'],
  ['심사', '관리부 승인 후 요원 명부에 공개'],
]

export default function System() {
  usePageMeta('등급 안내', '센티넬과 가이드, 등급과 매칭률 안내.')
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [hash])

  return (
    <>
      <PageTitle title="등급 안내" crumbs={[{ label: '등급 안내' }]} desc="센티넬은 폭주하고, 가이드는 그것을 멈춘다." />

      <section className={cx(WRAP, 'grid gap-px pt-12 md:grid-cols-2')}>
        {[
          ['sentinel', '센티넬', '감각과 신체가 인간의 한계를 넘은 각성자. 강하지만 쓸수록 무너진다.'],
          ['guide', '가이드', '무너지는 센티넬을 붙잡는 각성자. 대신 자신이 소진된다.'],
        ].map(([k, t, d]) => (
          <div key={k} className="border-t-2 border-foreground py-6 pr-8">
            <div className="flex items-center gap-3">
              <KindMark kind={k} size={18} />
              <h2 className="text-[34px] font-black tracking-[-0.04em]">{t}</h2>
            </div>
            <p className="mt-2 max-w-md text-[16px] text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section id="grades" className={cx(WRAP, 'scroll-mt-24 pt-14')}>
        <SectionHead title="등급" />
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[680px]">
            <thead>
              <tr>
                <th className="w-20">등급</th>
                <th className="w-24">명칭</th>
                <th>센티넬</th>
                <th>가이드</th>
              </tr>
            </thead>
            <tbody>
              {GRADES.map((g) => (
                <tr key={g.value}>
                  <td>
                    <GradeBadge grade={g.value} />
                  </td>
                  <td className="font-bold">{g.label}</td>
                  <td className="text-[14px]">{g.sentinel}</td>
                  <td className="text-[14px] text-muted-foreground">{g.guide}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cx(WRAP, 'grid gap-12 pt-14 lg:grid-cols-2')}>
        <div>
          <SectionHead title="알아 둘 말" />
          <dl>
            {TERMS.map(([t, d]) => (
              <div key={t} className="grid grid-cols-[88px_1fr] border-b border-rule py-3">
                <dt className="font-bold">{t}</dt>
                <dd className="text-[14px] text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <SectionHead title="매칭률" />
          <div className="flex h-11">
            {MATCH.map(([to, label, tone], i) => {
              const from = i === 0 ? 0 : MATCH[i - 1][0]
              return (
                <div key={label} className="grid place-items-center border-r-2 border-background text-[12px] font-bold text-ink last:border-r-0" style={{ width: `${to - from}%`, background: TONE[tone] }}>
                  {to - from >= 15 ? label : ''}
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>0</span>
            <span>40</span>
            <span>55</span>
            <span>75</span>
            <span>90</span>
            <span>100</span>
          </div>
          <p className="mt-4 text-[15px]">
            <b className="text-seal">90% 이상</b>이면 각인 적합. 등록 요원은{' '}
            <Link to="/office/matching" className="underline underline-offset-4 hover:text-seal">
              매칭률 조회
            </Link>
            에서 확인할 수 있습니다.
          </p>

          <div id="procedure" className="scroll-mt-24 pt-12">
            <SectionHead title="등록 절차" />
            <ol>
              {STEPS.map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[44px_1fr] items-baseline border-b border-rule py-3.5">
                  <span className="font-mono text-[14px] text-seal">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <b className="font-bold">{t}</b>
                    <span className="ml-3 text-[14px] text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  )
}
