import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './ui'

// 커뮤 안내 문서 문법은 src/config/guide.ts 머리말 참고
type Block =
  | { t: 'h2'; text: string; id: string; no: number }
  | { t: 'h3'; text: string; id: string }
  | { t: 'p'; lines: string[] }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'note'; lines: string[] }
  | { t: 'caution'; lines: string[] }
  | { t: 'sys'; lines: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'hr' }

const IMG_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
const isBreak = (l: string) => !l || l === ':::' || l === '---' || l.startsWith('#') || l.startsWith('- ') || l.startsWith('> ') || l.startsWith('※ ') || l.startsWith('|') || /^\d+\.\s/.test(l)

export function parseDoc(src: string): Block[] {
  const out: Block[] = []
  const lines = src.replace(/\r/g, '').split('\n')
  let i = 0
  let h = 0
  let sec = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    if (line === ':::') {
      const box: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== ':::') box.push(lines[i++].trim())
      i++
      out.push({ t: 'sys', lines: box.filter(Boolean) })
      continue
    }
    if (line === '---') {
      out.push({ t: 'hr' })
      i++
      continue
    }
    if (line.startsWith('### ')) {
      out.push({ t: 'h3', text: line.slice(4), id: `s${h++}` })
      i++
      continue
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      out.push({ t: 'h2', text: line.replace(/^#+\s/, ''), id: `s${h++}`, no: ++sec })
      i++
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const l = lines[i].trim()
        if (!/^\|?\s*:?-{2,}/.test(l)) rows.push(cells(l))
        i++
      }
      out.push({ t: 'table', head: rows[0] ?? [], rows: rows.slice(1) })
      continue
    }
    if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
      const ordered = !line.startsWith('- ')
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i].trim()
        if (ordered ? /^\d+\.\s/.test(l) : l.startsWith('- ')) items.push(l.replace(ordered ? /^\d+\.\s/ : /^-\s/, ''))
        else break
        i++
      }
      out.push({ t: ordered ? 'ol' : 'ul', items })
      continue
    }
    if (line.startsWith('> ') || line.startsWith('※ ')) {
      const kind = line.startsWith('> ') ? 'note' : 'caution'
      const prefix = kind === 'note' ? '> ' : '※ '
      const box: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(prefix)) box.push(lines[i++].trim().slice(2))
      out.push({ t: kind, lines: box })
      continue
    }
    const para: string[] = []
    while (i < lines.length && !isBreak(lines[i].trim())) para.push(lines[i++].trim())
    out.push({ t: 'p', lines: para })
  }
  return out
}

export function docOutline(src: string) {
  return parseDoc(src).filter((b): b is Extract<Block, { t: 'h2' }> => b.t === 'h2')
}

/** **굵게**, ==형광펜==, [글자](#/주소 또는 https://…) */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==|\[[^\]]+\]\([^)\s]+\))/g)
  return parts.map((p, i) => {
    const bold = p.match(/^\*\*([^*]+)\*\*$/)
    if (bold)
      return (
        <strong key={i} className="font-bold text-foreground">
          {bold[1]}
        </strong>
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

export function DocBody({ src, className }: { src: string; className?: string }) {
  const blocks = parseDoc(src)
  return (
    <div className={cx('text-[16px] leading-[1.9]', className)}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h2':
            return (
              <h2 key={i} id={b.id} className="mb-5 mt-16 flex scroll-mt-24 items-stretch border-b-2 border-foreground first:mt-0">
                <span className="grid min-w-11 place-items-center bg-seal px-2 font-mono text-[15px] font-semibold text-ink">{String(b.no).padStart(2, '0')}</span>
                <span className="px-3.5 py-2 text-[22px] font-black leading-snug tracking-[-0.03em]">{b.text}</span>
              </h2>
            )
          case 'h3':
            return (
              <h3 key={i} id={b.id} className="mb-2 mt-8 scroll-mt-24 border-l-[3px] border-seal pl-3 text-[17px] font-bold leading-snug">
                {b.text}
              </h3>
            )
          case 'ul':
            return (
              <ul key={i} className="my-4 space-y-2 border-l border-rule pl-5">
                {b.items.map((it, j) => (
                  <li key={j} className="relative text-foreground/90 before:absolute before:-left-[1.3rem] before:top-[0.8em] before:h-[5px] before:w-[5px] before:bg-seal">
                    {inline(it)}
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="my-4 space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="grid grid-cols-[2rem_1fr] text-foreground/90">
                    <span className="font-mono text-[14px] text-seal">{String(j + 1).padStart(2, '0')}</span>
                    <span>{inline(it)}</span>
                  </li>
                ))}
              </ol>
            )
          case 'note':
            return (
              <div key={i} className="my-5 border border-rule bg-muted px-4 py-3 text-[15px] leading-[1.85] text-foreground/85">
                {lines(b.lines)}
              </div>
            )
          case 'caution':
            return (
              <p key={i} className="my-4 border-l-[3px] border-warn bg-warn/10 px-4 py-2.5 text-[14.5px] leading-[1.8]">
                <span className="mr-1.5 font-bold text-warn">※</span>
                {lines(b.lines)}
              </p>
            )
          case 'table':
            return (
              <div key={i} className="my-5 overflow-x-auto border-t-2 border-foreground">
                <table className="w-full border-collapse text-[14px] leading-[1.7] sm:text-[14.5px]">
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th key={j} className="whitespace-nowrap border-b border-rule bg-muted px-3 py-2 text-left text-[13px] font-bold text-muted-foreground">
                          {inline(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {b.head.map((_, k) => {
                          const v = r[k] ?? ''
                          return (
                            <td key={k} className={cx('border-b border-rule px-3 py-2 align-top', k === 0 && 'font-bold', MARK_TONE[v] && `text-center text-[17px] font-black ${MARK_TONE[v]}`)}>
                              {inline(v)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'sys':
            return (
              <div key={i} className="sys-window my-6 max-w-md font-mono text-[13.5px] leading-[1.9]">
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
            return (
              <p key={i} className="my-4 max-w-[68ch] text-foreground/90">
                {lines(b.lines)}
              </p>
            )
        }
      })}
    </div>
  )
}
