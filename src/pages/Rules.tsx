import { Link } from 'react-router-dom'
import { Emblem, Loading, WRAP, cx } from '../components/ui'
import { DEFAULT_RULES, WORLD } from '../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import { fmtDate } from '../lib/util'

type Block = { kind: 'article' | 'annex' | 'text'; head?: string; lines: string[] }

// '제n조 …' 줄은 조항 제목, '부칙'은 부칙 제목, 나머지는 그 아래 내용
function parse(body: string): Block[] {
  const blocks: Block[] = []
  let cur: Block | null = null
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) {
      cur = null
      continue
    }
    if (/^제\s*\d+\s*조/.test(line) || /^부\s*칙/.test(line)) {
      cur = { kind: /^부/.test(line) ? 'annex' : 'article', head: line, lines: [] }
      blocks.push(cur)
      continue
    }
    if (!cur) {
      cur = { kind: 'text', lines: [] }
      blocks.push(cur)
    }
    cur.lines.push(line)
  }
  return blocks
}

function ArticleHead({ text }: { text: string }) {
  const m = text.match(/^(제\s*\d+\s*조|부\s*칙)\s*(.*)$/)
  if (!m) return <>{text}</>
  return (
    <>
      <span className="font-black">{m[1]}</span>
      {m[2] && <span className="ml-2 font-medium text-muted-foreground">{m[2]}</span>}
    </>
  )
}

export default function Rules() {
  usePageMeta('협회 규정', `${WORLD.orgName} 운영 규정.`)
  const { session } = useAuth()
  const page = useAsync(() => api.getPage('rules'), [])

  if (page.loading) return <Loading />

  const title = page.data?.title ?? DEFAULT_RULES.title
  const blocks = parse(page.data?.body ?? DEFAULT_RULES.body)
  const articles = blocks.filter((b) => b.kind === 'article')
  const jump = (i: number) => document.getElementById(`art-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          홈
        </Link>
        <span>›</span>
        <span className="text-foreground">협회 규정</span>
      </nav>

      <div className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-[190px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 border-b-2 border-foreground pb-2 text-[14px] font-bold">목차</p>
            <ol className="space-y-2 text-[14px]">
              {articles.map((a, i) => (
                <li key={i}>
                  <button type="button" onClick={() => jump(i)} className="text-left text-muted-foreground hover:text-seal">
                    {a.head}
                  </button>
                </li>
              ))}
            </ol>
            {session?.role === 'admin' && (
              <Link to="/office/admin?tab=rules" className="btn btn-sm mt-6">
                규정 고치기
              </Link>
            )}
          </div>
        </aside>

        <article className="border border-rule bg-card">
          <header className="px-6 pb-7 pt-10 text-center sm:px-14">
            <div className="flex items-center justify-center gap-2.5">
              <Emblem size={30} />
              <span className="text-[18px] font-black tracking-[-0.02em]">{WORLD.orgName}</span>
            </div>
            <h1 className="mt-7 text-[28px] font-black tracking-[0.12em] sm:text-[34px]">{title}</h1>
          </header>

          <dl className="mx-6 grid grid-cols-[5.5rem_1fr] border-y-2 border-foreground text-[14px] sm:mx-14 sm:grid-cols-[5.5rem_1fr_5.5rem_1fr]">
            <dt className="border-b border-rule bg-muted px-3 py-2.5 text-muted-foreground sm:border-b-0">시행일</dt>
            <dd className="border-b border-rule px-3 py-2.5 sm:border-b-0">{page.data ? fmtDate(page.data.updated_at) : '누리집 개설일'}</dd>
            <dt className="bg-muted px-3 py-2.5 text-muted-foreground">소관</dt>
            <dd className="px-3 py-2.5">관리부</dd>
          </dl>

          <div className="space-y-7 px-6 py-10 sm:px-14">
            {blocks.map((b, i) =>
              b.kind === 'text' ? (
                <p key={i} className="text-[15.5px] leading-[1.9]">
                  {b.lines.join(' ')}
                </p>
              ) : (
                <div key={i} id={b.kind === 'article' ? `art-${articles.indexOf(b)}` : undefined} className={cx('scroll-mt-24', b.kind === 'annex' && 'border-t border-rule pt-7')}>
                  <h2 className="text-[17px]">
                    <ArticleHead text={b.head ?? ''} />
                  </h2>
                  {b.lines.map((l, j) => (
                    <p key={j} className="mt-1.5 text-[15.5px] leading-[1.9]">
                      {l}
                    </p>
                  ))}
                </div>
              ),
            )}
          </div>

          <footer className="flex justify-center px-6 pb-14 sm:px-14">
            <div className="relative text-center">
              <p className="text-[22px] font-black tracking-[0.15em]">{WORLD.orgName}장</p>
              <span className="stamp absolute -right-[88px] -top-2 text-[17px] text-seal">
                직 인<small>관리부</small>
              </span>
            </div>
          </footer>
        </article>
      </div>
    </section>
  )
}
