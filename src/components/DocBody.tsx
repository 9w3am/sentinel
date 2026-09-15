import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './ui'

// 커뮤 안내 문서 문법은 src/config/guide.ts 의 GUIDE_SYNTAX 참고
type Align = 'left' | 'center'
type Block =
  | { t: 'h1'; text: string; en?: string; id: string }
  | { t: 'h2'; text: string; right?: string; id: string }
  | { t: 'h3'; text: string; id: string }
  | { t: 'p'; lines: string[]; tone?: 'center' | 'muted' }
  | { t: 'quote'; lines: string[] }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'arrow'; items: { text: string; subs: string[] }[] }
  | { t: 'note'; lines: string[] }
  | { t: 'caution'; lines: string[] }
  | { t: 'warning'; title: string; lines: string[] }
  | { t: 'sys'; lines: string[] }
  | { t: 'table'; head: string[]; rows: string[][]; align: Align[] }
  | { t: 'qa'; q: string; a: string[] }
  | { t: 'timeline'; rows: { when: string; items: string[] }[] }
  | { t: 'dday'; when: string; label: string }
  | { t: 'form'; text: string }
  | { t: 'hr' }

const IMG_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
/** "앞 | 뒤" → [앞, 뒤] */
const split = (s: string): [string, string | undefined] => {
  const k = s.indexOf(' | ')
  return k < 0 ? [s.trim(), undefined] : [s.slice(0, k).trim(), s.slice(k + 3).trim()]
}
const BREAK_RE = /^(#|- |-> |~ |> |>> |※ |\||\^ |Q\. |@ |\+ |%% |!!! |```)/
const isBreak = (l: string) => !l || l === ':::' || l === '---' || BREAK_RE.test(l) || /^\d+\.\s/.test(l)

export function parseDoc(src: string): Block[] {
  const out: Block[] = []
  const raw = src.replace(/\r/g, '').split('\n')
  const at = (k: number) => (raw[k] ?? '').trim()
  let i = 0
  let h = 0
  const take = (prefix: string) => {
    const box: string[] = []
    while (i < raw.length && at(i).startsWith(prefix)) box.push(at(i++).slice(prefix.length))
    return box
  }

  while (i < raw.length) {
    const line = at(i)
    if (!line) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const box: string[] = []
      i++
      while (i < raw.length && !at(i).startsWith('```')) box.push(raw[i++].replace(/\s+$/, ''))
      i++
      out.push({ t: 'form', text: box.join('\n') })
      continue
    }
    if (line === ':::') {
      const box: string[] = []
      i++
      while (i < raw.length && at(i) !== ':::') box.push(at(i++))
      i++
      out.push({ t: 'sys', lines: box.filter(Boolean) })
      continue
    }
    if (line === '---') {
      out.push({ t: 'hr' })
      i++
      continue
    }
    if (line.startsWith('!!! ')) {
      i++
      const box: string[] = []
      while (i < raw.length && at(i)) box.push(at(i++))
      out.push({ t: 'warning', title: line.slice(4), lines: box })
      continue
    }
    if (line.startsWith('### ')) {
      out.push({ t: 'h3', text: line.slice(4), id: `s${h++}` })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      const [text, right] = split(line.slice(3))
      out.push({ t: 'h2', text, right, id: `s${h++}` })
      i++
      continue
    }
    if (line.startsWith('# ')) {
      const [text, en] = split(line.slice(2))
      out.push({ t: 'h1', text, en, id: `s${h++}` })
      i++
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[][] = []
      let align: Align[] = []
      while (i < raw.length && at(i).startsWith('|')) {
        const l = at(i++)
        if (/^\|?\s*:?-{2,}/.test(l)) align = cells(l).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : 'left'))
        else rows.push(cells(l))
      }
      out.push({ t: 'table', head: rows[0] ?? [], rows: rows.slice(1), align })
      continue
    }
    if (line.startsWith('-> ')) {
      const items: { text: string; subs: string[] }[] = []
      while (i < raw.length) {
        const l = at(i)
        if (l.startsWith('-> ')) items.push({ text: l.slice(3), subs: [] })
        else if (l.startsWith('~ ') && items.length) items[items.length - 1].subs.push(l.slice(2))
        else break
        i++
      }
      out.push({ t: 'arrow', items })
      continue
    }
    if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
      const ordered = !line.startsWith('- ')
      const items: string[] = []
      while (i < raw.length) {
        const l = at(i)
        if (ordered ? /^\d+\.\s/.test(l) : l.startsWith('- ')) items.push(l.replace(ordered ? /^\d+\.\s/ : /^-\s/, ''))
        else break
        i++
      }
      out.push({ t: ordered ? 'ol' : 'ul', items })
      continue
    }
    if (line.startsWith('>> ')) {
      out.push({ t: 'quote', lines: take('>> ') })
      continue
    }
    if (line.startsWith('> ')) {
      out.push({ t: 'note', lines: take('> ') })
      continue
    }
    if (line.startsWith('※ ')) {
      out.push({ t: 'caution', lines: take('※ ') })
      continue
    }
    if (line.startsWith('^ ')) {
      out.push({ t: 'p', lines: take('^ '), tone: 'center' })
      continue
    }
    if (line.startsWith('~ ')) {
      out.push({ t: 'p', lines: take('~ '), tone: 'muted' })
      continue
    }
    if (line.startsWith('Q. ')) {
      i++
      while (i < raw.length && !at(i) && at(i + 1).startsWith('A. ')) i++
      const a: string[] = []
      while (i < raw.length && !isBreak(at(i))) a.push(at(i++).replace(/^A\.\s/, ''))
      out.push({ t: 'qa', q: line.slice(3), a })
      continue
    }
    if (line.startsWith('@ ') || line.startsWith('+ ')) {
      const rows: { when: string; items: string[] }[] = []
      while (i < raw.length && (at(i).startsWith('@ ') || at(i).startsWith('+ '))) {
        const l = at(i++)
        if (l.startsWith('@ ')) {
          const [when, what] = split(l.slice(2))
          rows.push({ when, items: what ? [what] : [] })
        } else if (rows.length) rows[rows.length - 1].items.push(l.slice(2))
      }
      out.push({ t: 'timeline', rows })
      continue
    }
    if (line.startsWith('%% ')) {
      const [when, label] = split(line.slice(3))
      out.push({ t: 'dday', when, label: label ?? '' })
      i++
      continue
    }
    const para = [line]
    i++
    while (i < raw.length && !isBreak(at(i))) para.push(at(i++))
    out.push({ t: 'p', lines: para })
  }
  return out
}

export function docOutline(src: string) {
  return parseDoc(src).flatMap((b) => (b.t === 'h1' ? [{ id: b.id, text: b.text, level: 1 }] : b.t === 'h2' ? [{ id: b.id, text: b.text, level: 2 }] : []))
}

/** **굵게**, *기울임*, ==형광펜==, [글자](#/주소 또는 https://…) */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|==[^=]+==|\[[^\]]+\]\([^)\s]+\))/g)
  return parts.map((p, i) => {
    const bold = p.match(/^\*\*([^*]+)\*\*$/)
    if (bold)
      return (
        <strong key={i} className="font-bold text-foreground">
          {bold[1]}
        </strong>
      )
    const em = p.match(/^\*([^*]+)\*$/)
    if (em)
      return (
        <em key={i} className="italic text-foreground/70">
          {em[1]}
        </em>
      )
    const mark = p.match(/^==([^=]+)==$/)
    if (mark)
      return (
        <mark key={i} className="bg-seal px-1 font-bold text-ink">
          {mark[1]}
        </mark>
      )
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) {
      const [, label, href] = link
      if (href.startsWith('#/')) {
        return (
          <Link key={i} to={href.slice(1)} className="text-seal underline underline-offset-4 hover:no-underline">
            {label}
          </Link>
        )
      }
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-seal underline underline-offset-4">
          {label}
        </a>
      )
    }
    return <Fragment key={i}>{p}</Fragment>
  })
}

const lines = (ls: string[]) =>
  ls.map((l, j) => (
    <Fragment key={j}>
      {j > 0 && <br />}
      {inline(l)}
    </Fragment>
  ))

/** 표 칸 안에서는 <br> 로 줄을 바꾼다 */
const cell = (v: string) => lines(v.split(/<br\s*\/?>/i))

const SYS_TONE: Record<string, string> = {
  경보: 'text-destructive',
  팀: 'text-[var(--kind-g)]',
  결속: 'text-[var(--kind-g)]',
}

function SysLine({ line }: { line: string }) {
  const m = line.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (!m) return <p className="pl-[0.2em] text-foreground/90">{line}</p>
  return (
    <p>
      <span className={cx('font-medium', SYS_TONE[m[1]] ?? 'text-seal')}>[{m[1]}]</span> {m[2]}
    </p>
  )
}

// 러닝 주의표 기호는 색으로도 구분한다
const MARK_TONE: Record<string, string> = { '○': 'text-ok', '△': 'text-warn', '✕': 'text-destructive' }

function parseWhen(s: string) {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)).getTime()
}

function DDay({ when, label }: { when: string; label: string }) {
  const target = parseWhen(when)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (target === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])

  const diff = target === null ? 0 : target - now
  const sec = Math.max(0, Math.floor(diff / 1000))
  const [d, hh, mm, ss] = [Math.floor(sec / 86400), Math.floor(sec / 3600) % 24, Math.floor(sec / 60) % 60, sec % 60]
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="relative my-10 overflow-hidden border border-rule bg-card px-5 py-9 text-center">
      <span className="absolute inset-x-0 top-0 h-[2px] bg-seal" aria-hidden="true" />
      {label && <p className="text-[14px] text-muted-foreground">{label}</p>}
      {target === null ? (
        <p className="font-display-en mt-4 pl-[0.5em] text-[22px] font-bold tracking-[0.5em] text-seal sm:text-[30px]">COMING SOON</p>
      ) : diff > 0 ? (
        <>
          <p className="font-display-en mt-3 text-[52px] font-bold leading-none text-seal sm:text-[64px]">D-{d}</p>
          <p className="mt-4 font-mono text-[15px] tabular-nums sm:text-[17px]">
            {d}일 {pad(hh)}시간 {pad(mm)}분 {pad(ss)}초
          </p>
          <p className="mt-1 font-mono text-[12.5px] text-muted-foreground">{when}</p>
        </>
      ) : (
        <p className="mt-4 text-[22px] font-black text-seal">진행 중</p>
      )}
    </div>
  )
}

function FormBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 클립보드 권한이 없으면 직접 긁어 가면 된다
    }
  }
  return (
    <div className="my-6 border border-rule bg-card">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2 text-[13px]">
        <span className="text-muted-foreground">양식</span>
        <button type="button" className="font-bold text-seal hover:underline" onClick={copy}>
          {copied ? '복사했습니다' : '양식 복사'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-[13.5px] leading-[1.95] text-foreground/90">{text}</pre>
    </div>
  )
}

export function DocBody({ src, className }: { src: string; className?: string }) {
  const blocks = parseDoc(src)
  return (
    <div className={cx('text-[16px] leading-[1.9]', className)}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h1':
            return (
              <div key={i} id={b.id} className="mb-10 mt-28 scroll-mt-24 text-center first:mt-10">
                <span className="mx-auto block h-12 w-px bg-linear-to-b from-transparent to-seal" aria-hidden="true" />
                {b.en && <p className="font-display-en mt-5 pl-[0.4em] text-[12px] tracking-[0.4em] text-seal">{b.en}</p>}
                <h2 className="font-display-ko mt-2 pl-[0.22em] text-[26px] font-black leading-snug tracking-[0.22em] sm:text-[32px]">{b.text}</h2>
                <span className="mx-auto mt-5 flex w-44 items-center gap-2" aria-hidden="true">
                  <span className="h-px flex-1 bg-rule" />
                  <span className="h-1.5 w-1.5 rotate-45 bg-seal" />
                  <span className="h-px flex-1 bg-rule" />
                </span>
              </div>
            )
          case 'h2':
            return (
              <h3 key={i} id={b.id} className="mb-4 mt-14 flex scroll-mt-24 flex-wrap items-end gap-x-4 gap-y-1 border-b border-rule pb-2.5">
                <span className="flex items-center gap-3 text-[20px] font-black leading-snug tracking-[-0.02em] sm:text-[21px]">
                  <span className="h-[1.05em] w-1 shrink-0 bg-seal" aria-hidden="true" />
                  {b.text}
                </span>
                {b.right && <span className="ml-auto text-[13px] font-normal text-muted-foreground">{b.right}</span>}
              </h3>
            )
          case 'h3':
            return (
              <h4 key={i} id={b.id} className="mb-2 mt-10 scroll-mt-24 text-[18px] font-bold leading-snug">
                {b.text}
              </h4>
            )
          case 'ul':
            return (
              <ul key={i} className="my-4 space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="grid grid-cols-[1.4rem_1fr] text-foreground/90">
                    <span className="mt-[0.78em] h-[5px] w-[5px] rounded-full bg-foreground/60" aria-hidden="true" />
                    <span>{inline(it)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="my-5 space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="grid grid-cols-[2.2rem_1fr] text-foreground/90">
                    <span className="font-display-en text-[16px] font-bold text-seal">{j + 1}.</span>
                    <span>{inline(it)}</span>
                  </li>
                ))}
              </ol>
            )
          case 'arrow':
            return (
              <ul key={i} className="my-5 space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="grid grid-cols-[1.7rem_1fr] text-foreground/90">
                    <span className="text-[14px] leading-[1.9rem] text-seal" aria-hidden="true">
                      ➔
                    </span>
                    <div>
                      {inline(it.text)}
                      {it.subs.map((s, k) => (
                        <p key={k} className="text-[14px] leading-[1.8] text-muted-foreground">
                          {inline(s)}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )
          case 'quote':
            return (
              <blockquote key={i} className="font-display-ko mx-auto my-8 max-w-[32em] text-center text-[17px] leading-[1.9] text-foreground sm:text-[18px]">
                <span className="text-seal">“</span>
                {lines(b.lines)}
                <span className="text-seal">”</span>
              </blockquote>
            )
          case 'note':
            return (
              <div key={i} className="my-5 border border-rule bg-muted px-4 py-3 text-[15px] leading-[1.85] text-foreground/85">
                {lines(b.lines)}
              </div>
            )
          case 'caution':
            return (
              <p key={i} className="my-5 border-l-[3px] border-warn bg-warn/10 px-4 py-2.5 text-[14.5px] leading-[1.8]">
                <span className="mr-1.5 font-bold text-warn">※</span>
                {lines(b.lines)}
              </p>
            )
          case 'warning':
            return (
              <section key={i} className="relative my-10 border-y border-seal/50 bg-seal/[0.06] px-5 py-8 text-center">
                <p className="font-display-en text-[20px] font-bold tracking-[0.16em] text-seal sm:text-[28px]">! {b.title} !</p>
                <div className="mx-auto mt-4 max-w-[38em] space-y-1.5 text-[15px] leading-[1.9] text-foreground/85">
                  {b.lines.map((l, j) => (
                    <p key={j}>{inline(l)}</p>
                  ))}
                </div>
              </section>
            )
          case 'table': {
            const allCenter = b.align.length > 0 && b.align.every((a) => a === 'center')
            // 가운데 정렬 한 줄짜리 표(합격 요소 같은 것)는 휴대폰에서 칸을 세로로 쌓는다
            if (allCenter && b.rows.length === 1)
              return (
                <div key={i} className="my-6 grid border-t-2 border-foreground sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ '--cols': b.head.length } as CSSProperties}>
                  {b.head.map((c, k) => (
                    <div key={k} className="border-b border-rule sm:border-r sm:last:border-r-0">
                      <p className="bg-muted px-3 py-2.5 text-center text-[13px] font-bold text-muted-foreground">{cell(c)}</p>
                      <p className="px-3 py-4 text-center text-[14.5px] leading-[2]">{cell(b.rows[0][k] ?? '')}</p>
                    </div>
                  ))}
                </div>
              )
            return (
              <div key={i} className="my-6 overflow-x-auto border-t-2 border-foreground">
                <table className="w-full border-collapse text-[14px] leading-[1.75] sm:text-[14.5px]">
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th key={j} className={cx('whitespace-nowrap border-b border-rule bg-muted px-3 py-2.5 text-[13px] font-bold text-muted-foreground', b.align[j] === 'center' ? 'text-center' : 'text-left', allCenter && 'border-r last:border-r-0')}>
                          {cell(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {b.head.map((_, k) => {
                          const v = r[k] ?? ''
                          const center = b.align[k] === 'center' || !!MARK_TONE[v]
                          return (
                            <td key={k} className={cx('border-b border-rule px-3 py-2.5 align-top', k === 0 && !center && 'font-bold', center && 'text-center', MARK_TONE[v] && `text-[17px] font-black ${MARK_TONE[v]}`, allCenter && 'border-r py-4 leading-[2] last:border-r-0')}>
                              {cell(v)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          case 'qa':
            return (
              <div key={i} className="border-b border-rule py-5 first:pt-0">
                <p className="grid grid-cols-[2.2rem_1fr] font-bold">
                  <span className="font-display-en text-[18px] leading-[1.6] text-seal">Q.</span>
                  <span>{inline(b.q)}</span>
                </p>
                <div className="mt-1.5 grid grid-cols-[2.2rem_1fr] text-foreground/80">
                  <span className="font-display-en text-[18px] leading-[1.6] text-muted-foreground">A.</span>
                  <div>{lines(b.a)}</div>
                </div>
              </div>
            )
          case 'timeline':
            return (
              <ol key={i} className="my-8 ml-1 border-l border-rule">
                {b.rows.map((r, j) => (
                  <li key={j} className="relative pb-6 pl-6 last:pb-1 sm:grid sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                    <span className="absolute -left-[5px] top-[0.62em] h-[9px] w-[9px] rotate-45 border border-seal bg-background" aria-hidden="true" />
                    <p className="font-bold text-seal">{inline(r.when)}</p>
                    <ul className="text-foreground/85">
                      {r.items.map((t, k) => (
                        <li key={k}>{inline(t)}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )
          case 'dday':
            return <DDay key={i} when={b.when} label={b.label} />
          case 'form':
            return <FormBlock key={i} text={b.text} />
          case 'sys':
            return (
              <div key={i} className="sys-window my-7 max-w-md font-mono text-[13.5px] leading-[1.9]">
                {b.lines.map((l, j) => (
                  <SysLine key={j} line={l} />
                ))}
              </div>
            )
          case 'hr':
            return (
              <div key={i} className="my-12 flex items-center justify-center gap-3" aria-hidden="true">
                <span className="h-px w-16 bg-rule" />
                <span className="h-1.5 w-1.5 rotate-45 bg-seal" />
                <span className="h-px w-16 bg-rule" />
              </div>
            )
          default:
            if (b.lines.length === 1 && IMG_RE.test(b.lines[0])) {
              return <img key={i} src={b.lines[0]} alt="" loading="lazy" referrerPolicy="no-referrer" className="my-5 block h-auto max-h-[480px] w-auto max-w-full border border-rule object-contain" />
            }
            if (b.tone === 'center')
              return (
                <p key={i} className="mx-auto my-7 max-w-[36em] text-center leading-[2.15] text-foreground/85">
                  {lines(b.lines)}
                </p>
              )
            if (b.tone === 'muted')
              return (
                <p key={i} className="my-3 text-[14px] leading-[1.8] text-muted-foreground">
                  {lines(b.lines)}
                </p>
              )
            return (
              <p key={i} className="my-4 text-foreground/90">
                {lines(b.lines)}
              </p>
            )
        }
      })}
    </div>
  )
}
