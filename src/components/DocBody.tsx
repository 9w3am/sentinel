import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './ui'

// 커뮤 안내 문서 문법은 src/config/guide.ts 머리말 참고
type Block =
  | { t: 'h2' | 'h3'; text: string; id: string }
  | { t: 'p'; lines: string[] }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'note'; lines: string[] }
  | { t: 'sys'; lines: string[] }
  | { t: 'hr' }

const IMG_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i

export function parseDoc(src: string): Block[] {
  const out: Block[] = []
  const lines = src.replace(/\r/g, '').split('\n')
  let i = 0
  let h = 0
  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()
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
      out.push({ t: 'h2', text: line.replace(/^#+\s/, ''), id: `s${h++}` })
      i++
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
    if (line.startsWith('> ')) {
      const note: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) note.push(lines[i++].trim().slice(2))
      out.push({ t: 'note', lines: note })
      continue
    }
    const para: string[] = []
    while (i < lines.length) {
      const l = lines[i].trim()
      if (!l || l === ':::' || l === '---' || l.startsWith('#') || l.startsWith('- ') || l.startsWith('> ') || /^\d+\.\s/.test(l)) break
      para.push(l)
      i++
    }
    out.push({ t: 'p', lines: para })
  }
  return out
}

export function docOutline(src: string) {
  return parseDoc(src).filter((b): b is { t: 'h2' | 'h3'; text: string; id: string } => b.t === 'h2')
}

/** **굵게**, [글자](#/주소 또는 https://…) */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g)
  return parts.map((p, i) => {
    const bold = p.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={i} className="font-bold text-foreground">{bold[1]}</strong>
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

export function DocBody({ src, className }: { src: string; className?: string }) {
  const blocks = parseDoc(src)
  return (
    <div className={cx('text-[16px] leading-[1.9]', className)}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h2':
            return (
              <h2 key={i} id={b.id} className="mb-4 mt-14 scroll-mt-24 border-b-2 border-foreground pb-2 text-[24px] font-black leading-snug tracking-[-0.03em] first:mt-0">
                {b.text}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={i} id={b.id} className="mb-1.5 mt-8 scroll-mt-24 text-[17px] font-bold">
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
              <p key={i} className="my-5 border border-rule bg-muted px-4 py-3 text-[14.5px] leading-[1.8] text-muted-foreground">
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(l)}
                  </Fragment>
                ))}
              </p>
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
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(l)}
                  </Fragment>
                ))}
              </p>
            )
        }
      })}
    </div>
  )
}
