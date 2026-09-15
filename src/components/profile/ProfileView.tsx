import { useEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { DocInline } from '../DocBody'
import { cx } from '../ui'
import { StickerArt } from './stickers'
import { PROFILE_FONT_URL, THEMES, blockHasContent, clamp, fontCss, isDark, isUrl, labelOf, readableOn, type PBlock, type Page, type ProfileDoc, type Sticker } from './model'
import './profile.css'

let fontsRequested = false
function useProfileFonts() {
  useEffect(() => {
    if (fontsRequested) return
    fontsRequested = true
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = PROFILE_FONT_URL
    document.head.appendChild(link)
  }, [])
}

export interface EditHooks {
  page: number
  block: string | null
  sticker: string | null
  onPage: (page: number) => void
  onBlock: (page: number, id: string) => void
  onSticker: (page: number, id: string) => void
  onMoveSticker: (page: number, id: string, x: number, y: number) => void
}

const lines = (s = '') =>
  s.split('\n').map((l, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {DocInline(l)}
    </span>
  ))
const listOf = (s = '') =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
const rowsOf = (b: PBlock) => (b.rows ?? []).filter((r) => r[0]?.trim() || r[1]?.trim())
const pct = (v?: string | number) => clamp(Math.round(Number(v) || 0), 0, 100)
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function ProfileDocView({ doc, className, edit }: { doc: ProfileDoc; className?: string; edit?: EditHooks }) {
  useProfileFonts()
  const theme = THEMES.find((t) => t.key === doc.theme) ?? THEMES[0]
  const style = {
    '--pdx-bg': theme.bg,
    '--pdx-fg': theme.fg,
    '--pdx-accent': doc.accent,
    '--pdx-on-accent': readableOn(doc.accent),
    '--pdx-f-title': fontCss(doc.fontTitle),
    '--pdx-f-body': fontCss(doc.fontBody),
    '--pdx-tex-op': doc.textureOp / 100,
    '--doc-accent': doc.accent,
  } as CSSProperties
  return (
    <div className={cx('pdx', `pdx-t-${doc.theme}`, edit && 'is-editing', className)} data-ratio={doc.ratio} data-dark={isDark(theme.bg) || undefined} data-title-italic={doc.fontTitle === 'italic' || undefined} data-title-font={doc.fontTitle} style={style}>
      {doc.pages.map((p, i) => (
        <PageView key={p.id} page={p} index={i} doc={doc} edit={edit} />
      ))}
    </div>
  )
}

function PageView({ page, index, doc, edit }: { page: Page; index: number; doc: ProfileDoc; edit?: EditHooks }) {
  const tex = page.texture === 'theme' ? doc.texture : page.texture
  const bg = page.bg
  const hasImg = isUrl(bg.url)
  const imgLayer = (cls: string) => (
    <div className={cls} data-filter={bg.filter} style={{ '--dim': bg.dim / 100 } as CSSProperties}>
      <img src={bg.url} alt="" referrerPolicy="no-referrer" className="pdx-bgimg" style={{ objectPosition: `center ${bg.pos}` }} />
    </div>
  )
  const content = (
    <div className="pdx-content">
      {page.blocks.map((b) => (
        <BlockShell key={b.id} b={b} editing={!!edit} selected={!!edit && edit.page === index && edit.block === b.id} onPick={edit ? () => edit.onBlock(index, b.id) : undefined} />
      ))}
      {edit && page.blocks.length === 0 && <p className="pdx-empty">비어 있는 페이지입니다. 왼쪽 '칸'에서 칸을 추가하세요.</p>}
    </div>
  )
  return (
    <section className={cx('pdx-page', `pdx-pad-${page.pad}`, hasImg && `pdx-area-${bg.area}`, edit && edit.page === index && 'is-current')} data-page={index + 1} onClick={edit ? () => edit.onPage(index) : undefined}>
      {hasImg && bg.area === 'full' && imgLayer('pdx-bg')}
      <div className="pdx-tex" data-tex={tex} aria-hidden="true" />
      <div className="pdx-deco" aria-hidden="true" />
      {hasImg && bg.area === 'top' && imgLayer('pdx-hero')}
      {hasImg && bg.area === 'side' ? (
        <div className="pdx-split">
          {imgLayer('pdx-side')}
          {content}
        </div>
      ) : (
        content
      )}
      <div className="pdx-stickers">
        {page.stickers.map((s) => (
          <StickerEl key={s.id} s={s} page={index} edit={edit} accent={doc.accent} />
        ))}
      </div>
    </section>
  )
}

function StickerEl({ s, page, edit, accent }: { s: Sticker; page: number; edit?: EditHooks; accent: string }) {
  const frame = useRef(0)
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (!edit) return
    e.preventDefault()
    e.stopPropagation()
    edit.onSticker(page, s.id)
    const pageEl = e.currentTarget.closest('.pdx-page') as HTMLElement | null
    if (!pageEl) return
    const rect = pageEl.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const x = Math.round(((ev.clientX - rect.left) / rect.width) * 1000) / 10
        const y = Math.round(((ev.clientY - rect.top) / rect.height) * 1000) / 10
        edit.onMoveSticker(page, s.id, clamp(x, -10, 110), clamp(y, -10, 110))
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return (
    <div className={cx('pdx-sticker', edit && edit.sticker === s.id && 'is-selected')} style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s}%`, opacity: s.o / 100, transform: `translate(-50%, -50%) rotate(${s.r}deg)` }} onPointerDown={down}>
      <StickerArt k={s.k} color={s.c || accent} text={s.text} />
    </div>
  )
}

function BlockShell({ b, editing, selected, onPick }: { b: PBlock; editing: boolean; selected: boolean; onPick?: () => void }) {
  const filled = blockHasContent(b)
  if (!filled && !editing) return null
  const st = b.style ?? {}
  const style: CSSProperties = {
    textAlign: st.align,
    fontFamily: st.font ? fontCss(st.font) : undefined,
    fontStyle: st.font === 'italic' ? 'italic' : undefined,
    transform: st.tilt ? `rotate(${st.tilt}deg)` : undefined,
  }
  return (
    <div
      className={cx('pdx-b', `pdx-b-${b.t}`, selected && 'is-selected')}
      data-v={b.variant}
      data-box={st.box && st.box !== 'none' ? st.box : undefined}
      data-align={st.align}
      data-size={st.size && st.size !== 'm' ? st.size : undefined}
      data-tone={st.tone && st.tone !== 'ink' ? st.tone : undefined}
      data-width={st.width && st.width !== 'full' ? st.width : undefined}
      style={style}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation()
              onPick()
            }
          : undefined
      }
    >
      {filled ? <BlockBody b={b} /> : <span className="pdx-empty">{labelOf(b.t)} · 내용을 적어 주세요</span>}
    </div>
  )
}

const Ico = {
  prev: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5v14M19 5 9 12l10 7z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4v16l13-8z" fill="currentColor" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 5v14M5 5l10 7-10 7z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
}

function BlockBody({ b }: { b: PBlock }) {
  switch (b.t) {
    case 'title':
      return (
        <div className="pdx-title">
          {b.variant === 'script' && <p className="pdx-title-script">{b.text2 || 'Profile'}</p>}
          {b.variant === 'stack' && <p className="pdx-kicker">PROFILE</p>}
          <h1 className="pdx-title-main">{b.text}</h1>
          {b.variant !== 'script' && b.text2 && <p className="pdx-title-sub">{b.text2}</p>}
        </div>
      )
    case 'banner':
      return (
        <div className="pdx-banner">
          {b.text2 && <p className="pdx-banner-en">{b.text2}</p>}
          <p className="pdx-banner-main">{lines(b.text)}</p>
        </div>
      )
    case 'heading':
      return <h2 className="pdx-h">{b.text}</h2>
    case 'text':
      return <p className="pdx-text">{lines(b.text)}</p>
    case 'quote':
      return <blockquote className="pdx-quote">{lines(b.text)}</blockquote>
    case 'speech':
      return (
        <div className="pdx-speech">
          {b.text2 && <p className="pdx-speaker">{b.text2}</p>}
          <p className="pdx-line">{lines(b.text)}</p>
        </div>
      )
    case 'window':
      return (
        <div className="pdx-window">
          <p className="pdx-window-title">{b.text2 || (b.variant === 'alert' ? 'WARNING' : 'STATUS')}</p>
          <div className="pdx-window-body">
            {(b.text ?? '')
              .split('\n')
              .filter((l) => l.trim())
              .map((l, i) => {
                const m = l.match(/^\[([^\]]+)\]\s*(.*)$/)
                return (
                  <p key={i}>
                    {m ? (
                      <>
                        <b>[{m[1]}]</b> {DocInline(m[2])}
                      </>
                    ) : (
                      DocInline(l)
                    )}
                  </p>
                )
              })}
          </div>
        </div>
      )
    case 'info': {
      const rows = rowsOf(b)
      if (b.variant === 'grid')
        return (
          <div className="pdx-info-grid">
            {rows.map(([k, v], i) => (
              <div key={i}>
                <span>{k}</span>
                {DocInline(v ?? '')}
              </div>
            ))}
          </div>
        )
      if (b.variant === 'inline')
        return (
          <p className="pdx-info-inline">
            {rows.map(([k, v], i) => (
              <span key={i}>
                <b>{k}</b>
                {DocInline(v ?? '')}
              </span>
            ))}
          </p>
        )
      return (
        <dl className="pdx-info">
          {rows.map(([k, v], i) => (
            <div key={i}>
              <dt>{k}</dt>
              <dd>{DocInline(v ?? '')}</dd>
            </div>
          ))}
        </dl>
      )
    }
    case 'tags': {
      const items = listOf(b.text)
      if (b.variant === 'plain') return <p className="pdx-tags-plain">{items.join(' · ')}</p>
      return (
        <ul className="pdx-tags">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )
    }
    case 'check':
      return (
        <ul className="pdx-check">
          {(b.rows ?? [])
            .filter((r) => r[0]?.trim())
            .map(([k, m], i) => (
              <li key={i}>
                <span>{k}</span>
                <b data-mark={m}>{m}</b>
              </li>
            ))}
        </ul>
      )
    case 'gauge': {
      const rows = (b.rows ?? []).filter((r) => r[0]?.trim())
      if (b.variant === 'number')
        return (
          <div className="pdx-gauge-num">
            {rows.map(([k, v], i) => (
              <div key={i}>
                <b>{pct(v)}</b>
                <span>{k}</span>
              </div>
            ))}
          </div>
        )
      return (
        <div className="pdx-gauge">
          {rows.map(([k, v], i) => (
            <div key={i} className="pdx-gauge-row">
              <span className="pdx-gauge-label">{k}</span>
              {b.variant === 'segment' ? (
                <span className="pdx-gauge-seg">
                  {Array.from({ length: 10 }, (_, j) => (
                    <i key={j} data-on={j < Math.round(pct(v) / 10) || undefined} />
                  ))}
                </span>
              ) : (
                <span className="pdx-gauge-track">
                  <span style={{ width: `${pct(v)}%` }} />
                </span>
              )}
              <b>{pct(v)}</b>
            </div>
          ))}
        </div>
      )
    }
    case 'likes':
      return (
        <div className="pdx-likes">
          <div>
            <p className="pdx-likes-hd">
              <span className="pdx-like-ico">♥</span>좋아하는 것
            </p>
            <ul>
              {listOf(b.text).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="pdx-likes-hd">
              <span className="pdx-dislike-ico">✕</span>싫어하는 것
            </p>
            <ul>
              {listOf(b.text2).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      )
    case 'relation': {
      const rows = (b.rows ?? []).filter((r) => r[0]?.trim())
      if (b.variant === 'list')
        return (
          <dl className="pdx-info">
            {rows.map(([n, k, l], i) => (
              <div key={i}>
                <dt>{n}</dt>
                <dd>
                  {k && <b className="pdx-rel-kind">{k}</b>} {DocInline(l ?? '')}
                </dd>
              </div>
            ))}
          </dl>
        )
      return (
        <div className="pdx-rel">
          {rows.map(([n, k, l, img], i) => (
            <div key={i} className="pdx-rel-card">
              <span className="pdx-rel-av">{isUrl(img) ? <img src={img} alt="" referrerPolicy="no-referrer" /> : n.slice(0, 1)}</span>
              <span className="min-w-0">
                <span className="pdx-rel-name">{n}</span>
                {k && <span className="pdx-rel-kind">{k}</span>}
                {l && <span className="pdx-rel-line">{DocInline(l)}</span>}
              </span>
            </div>
          ))}
        </div>
      )
    }
    case 'timeline': {
      const rows = rowsOf(b)
      return (
        <ol className={b.variant === 'table' ? 'pdx-tl-table' : 'pdx-tl'}>
          {rows.map(([w, t], i) => (
            <li key={i}>
              <b>{w}</b>
              <span>{DocInline(t ?? '')}</span>
            </li>
          ))}
        </ol>
      )
    }
    case 'player': {
      const p = pct(b.num)
      const total = 214
      const meta = (
        <div>
          <p className="pdx-player-song">{b.text || '곡 제목'}</p>
          {b.text2 && <p className="pdx-player-artist">{b.text2}</p>}
        </div>
      )
      if (b.variant === 'mini')
        return (
          <p className="pdx-player-mini">
            <span aria-hidden="true">♪</span> {b.text} {b.text2 && <span className="pdx-player-artist">— {b.text2}</span>}
          </p>
        )
      const bar = (
        <>
          <div className="pdx-player-bar">
            <span style={{ width: `${p}%` }} />
            <i style={{ left: `${p}%` }} />
          </div>
          <div className="pdx-player-time">
            <span>{mmss(Math.round((total * p) / 100))}</span>
            <span>{mmss(total)}</span>
          </div>
        </>
      )
      if (b.variant === 'vinyl')
        return (
          <div className="pdx-player pdx-player-vinyl">
            <div className="pdx-vinyl" aria-hidden="true">
              <span />
            </div>
            <div className="min-w-0">
              {meta}
              {bar}
            </div>
          </div>
        )
      return (
        <div className="pdx-player">
          {meta}
          {bar}
          <div className="pdx-player-ctrl">
            {Ico.prev}
            {Ico.play}
            {Ico.next}
          </div>
        </div>
      )
    }
    case 'image': {
      const u = b.urls?.[0]
      if (!isUrl(u)) return null
      return (
        <figure className="pdx-figure">
          <div className="pdx-figure-img">
            <img src={u} alt={b.text || ''} loading="lazy" referrerPolicy="no-referrer" />
          </div>
          {b.text && <figcaption>{b.text}</figcaption>}
        </figure>
      )
    }
    case 'collage': {
      const urls = (b.urls ?? []).filter((u) => isUrl(u))
      return (
        <div className="pdx-collage" data-n={urls.length}>
          {urls.map((u, i) => (
            <figure key={i}>
              <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </figure>
          ))}
        </div>
      )
    }
    case 'divider':
      if (b.variant === 'dots') return <p className="pdx-div-dots">· · ·</p>
      if (b.variant === 'star')
        return (
          <p className="pdx-div-star">
            <span />✦<span />
          </p>
        )
      if (b.variant === 'wave')
        return (
          <svg className="pdx-div-wave" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 6 Q10 0 20 6 T40 6 T60 6 T80 6 T100 6 T120 6 T140 6 T160 6 T180 6 T200 6 T220 6 T240 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )
      if (b.variant === 'tape') return <div className="pdx-div-tape" />
      return <hr className="pdx-hr" />
    case 'spacer':
      return <div style={{ height: `${(b.num ?? 40) / 8}cqi` }} />
  }
}
