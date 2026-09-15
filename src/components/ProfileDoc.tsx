import { useRef, useState, type CSSProperties } from 'react'
import { DocInline } from './DocBody'
import { copyText, cx } from './ui'

// ─────────────────────────────────────────────
// 프로필 문서: 러너가 직접 꾸미는 캐릭터 문서.
// 등록증은 details.profile_doc, 신청서는 answers.doc 에 JSON 문자열로 넣는다.
// ─────────────────────────────────────────────

export type BlockType = 'heading' | 'text' | 'info' | 'quote' | 'tags' | 'check' | 'image' | 'divider'
export type Align = 'left' | 'center' | 'right'
export interface PBlock {
  id: string
  t: BlockType
  text?: string
  rows?: [string, string][]
  url?: string
  align?: Align
}
export type SkinKey = 'record' | 'scrap' | 'night' | 'poster'
export type FontKey = 'sans' | 'serif' | 'mono'
export interface ProfileDoc {
  v: 1
  skin: SkinKey
  accent: string
  font: FontKey
  title: string
  subtitle: string
  image: string
  blocks: PBlock[]
}

/** 신청서 전체가 30KB 안에 들어가도록 문서 크기를 묶는다 */
export const PROFILE_DOC_BYTES = 22000

export const SKINS: { key: SkinKey; label: string; desc: string; swatch: [string, string] }[] = [
  { key: 'record', label: '기록부', desc: '검정 바탕 · 서류 칸', swatch: ['#171714', '#e8e5dc'] },
  { key: 'scrap', label: '스크랩', desc: '종이 · 테이프 · 사진', swatch: ['#f3efe6', '#2a2722'] },
  { key: 'night', label: '야간 근무', desc: '남색 바탕 · 아치 사진', swatch: ['#10172b', '#e6e9f2'] },
  { key: 'poster', label: '포스터', desc: '큰 제목 · 강한 대비', swatch: ['#0b0b0b', '#f5f5f0'] },
]
export const ACCENTS = ['#f0c419', '#e8892a', '#d8432c', '#e07fa6', '#9b8cf0', '#6fa8dc', '#6cc3a6', '#c9c4b8']
export const FONTS: { key: FontKey; label: string; css: string }[] = [
  { key: 'sans', label: '고딕', css: '"Noto Sans KR", sans-serif' },
  { key: 'serif', label: '명조', css: '"Noto Serif KR", serif' },
  { key: 'mono', label: '타자', css: '"IBM Plex Mono", "Noto Sans KR", monospace' },
]
export const BLOCK_TYPES: { t: BlockType; label: string }[] = [
  { t: 'heading', label: '소제목' },
  { t: 'text', label: '글' },
  { t: 'info', label: '정보표' },
  { t: 'quote', label: '한마디' },
  { t: 'tags', label: '키워드' },
  { t: 'check', label: '주의표' },
  { t: 'image', label: '이미지' },
  { t: 'divider', label: '구분선' },
]
const MARKS: [string, string][] = [
  ['○', '○ 괜찮음'],
  ['△', '△ 조율'],
  ['✕', '✕ 안 됨'],
]
const TEXT_TOOLS: [string, string, string][] = [
  ['**', '굵게', 'font-bold'],
  ['*', '기울임', 'italic'],
  ['==', '형광펜', ''],
  ['~~', '포인트 색', ''],
]

const uid = () => Math.random().toString(36).slice(2, 10)
const isUrl = (s?: string) => !!s && /^https?:\/\/\S+$/i.test(s.trim())

export function newBlock(t: BlockType): PBlock {
  if (t === 'info') return { id: uid(), t, rows: [['', '']] }
  if (t === 'check') return { id: uid(), t, rows: [['', '○']] }
  if (t === 'image') return { id: uid(), t, url: '', text: '' }
  if (t === 'divider') return { id: uid(), t }
  return { id: uid(), t, text: '', align: t === 'quote' ? 'center' : 'left' }
}

export const emptyDoc = (): ProfileDoc => ({ v: 1, skin: 'record', accent: ACCENTS[0], font: 'sans', title: '', subtitle: '', image: '', blocks: [] })

function starterBlocks(name: string): PBlock[] {
  return [
    newBlock('quote'),
    { ...newBlock('heading'), text: '기본 정보' },
    { ...newBlock('info'), rows: [['이름', name], ['나이', ''], ['키', ''], ['구분 · 등급', ''], ['팀', '']] },
    { ...newBlock('heading'), text: '성격' },
    newBlock('tags'),
    newBlock('text'),
    { ...newBlock('heading'), text: '능력' },
    newBlock('text'),
    { ...newBlock('heading'), text: '러닝 주의' },
    { ...newBlock('check'), rows: [['유혈 묘사', '△'], ['감정선', '○'], ['사망 소재', '✕']] },
  ]
}

const hasContent = (b: PBlock) => !!(b.text?.trim() || b.url?.trim() || b.rows?.some(([k, v]) => k.trim() || (b.t === 'info' && v.trim())))
export const isEmptyDoc = (d: ProfileDoc) => !d.title.trim() && !d.subtitle.trim() && !d.image.trim() && !d.blocks.some(hasContent)
export const docBytes = (d: ProfileDoc) => new TextEncoder().encode(JSON.stringify(d)).length

/** 저장된 문자열을 검사해서 문서로 되돌린다. 모양이 틀리면 null */
export function parseProfileDoc(raw: unknown): ProfileDoc | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const o = JSON.parse(raw)
    if (!o || o.v !== 1 || !Array.isArray(o.blocks)) return null
    const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')
    const blocks: PBlock[] = (o.blocks as PBlock[])
      .filter((b) => b && BLOCK_TYPES.some((x) => x.t === b.t))
      .slice(0, 80)
      .map((b) => ({
        id: str(b.id, 20) || uid(),
        t: b.t,
        text: str(b.text),
        url: isUrl(str(b.url, 1000)) ? str(b.url, 1000) : '',
        align: b.align === 'center' || b.align === 'right' ? b.align : 'left',
        rows: Array.isArray(b.rows) ? b.rows.slice(0, 40).map((r) => [str(r?.[0], 200), str(r?.[1], 400)] as [string, string]) : undefined,
      }))
    return {
      v: 1,
      skin: SKINS.some((s) => s.key === o.skin) ? o.skin : 'record',
      accent: /^#[0-9a-f]{6}$/i.test(o.accent) ? o.accent : ACCENTS[0],
      font: FONTS.some((f) => f.key === o.font) ? o.font : 'sans',
      title: str(o.title, 60),
      subtitle: str(o.subtitle, 120),
      image: isUrl(str(o.image, 1000)) ? str(o.image, 1000) : '',
      blocks,
    }
  } catch {
    return null
  }
}

const lines = (s: string) =>
  s.split('\n').map((l, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {DocInline(l)}
    </span>
  ))

function BlockView({ b }: { b: PBlock }) {
  switch (b.t) {
    case 'heading':
      return b.text?.trim() ? <h2 className="pd-h">{b.text}</h2> : null
    case 'text':
      return b.text?.trim() ? (
        <p className="pd-text" style={{ textAlign: b.align }}>
          {lines(b.text)}
        </p>
      ) : null
    case 'quote':
      return b.text?.trim() ? (
        <blockquote className="pd-quote" style={{ textAlign: b.align }}>
          {lines(b.text)}
        </blockquote>
      ) : null
    case 'tags': {
      const items = (b.text ?? '')
        .split(/[,#\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
      return items.length ? (
        <ul className="pd-tags">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ) : null
    }
    case 'info': {
      const rows = (b.rows ?? []).filter(([k, v]) => k.trim() || v.trim())
      return rows.length ? (
        <dl className="pd-info">
          {rows.map(([k, v], i) => (
            <div key={i}>
              <dt>{k}</dt>
              <dd>{DocInline(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null
    }
    case 'check': {
      const rows = (b.rows ?? []).filter(([k]) => k.trim())
      return rows.length ? (
        <ul className="pd-check">
          {rows.map(([k, m], i) => (
            <li key={i}>
              <span>{k}</span>
              <b data-mark={m}>{m}</b>
            </li>
          ))}
        </ul>
      ) : null
    }
    case 'image':
      return isUrl(b.url) ? (
        <figure className="pd-figure">
          <img src={b.url} alt={b.text || ''} loading="lazy" referrerPolicy="no-referrer" />
          {b.text && <figcaption>{b.text}</figcaption>}
        </figure>
      ) : null
    case 'divider':
      return <hr className="pd-hr" />
  }
}

export function ProfileDocView({ doc, className }: { doc: ProfileDoc; className?: string }) {
  const font = FONTS.find((f) => f.key === doc.font)?.css
  const photo = isUrl(doc.image)
  return (
    <article className={cx('pd', `pd-${doc.skin}`, className)} style={{ '--pd-accent': doc.accent, '--pd-title-font': font } as CSSProperties}>
      <div className="pd-frame">
        <header className={cx('pd-head', photo && 'has-photo')}>
          {photo && (
            <figure className="pd-photo">
              <img src={doc.image} alt="" referrerPolicy="no-referrer" />
            </figure>
          )}
          <div className="pd-titles">
            <p className="pd-kicker">PROFILE</p>
            <h1 className="pd-title">{doc.title.trim() || '이름'}</h1>
            {doc.subtitle.trim() && <p className="pd-sub">{doc.subtitle}</p>}
          </div>
        </header>
        <div className="pd-body">
          {doc.blocks.map((b) => (
            <BlockView key={b.id} b={b} />
          ))}
        </div>
      </div>
    </article>
  )
}

function RowsEditor({ b, onRows }: { b: PBlock; onRows: (rows: [string, string][]) => void }) {
  const rows = b.rows ?? []
  const up = (i: number, k: 0 | 1, v: string) => onRows(rows.map((r, j) => (j === i ? ((k === 0 ? [v, r[1]] : [r[0], v]) as [string, string]) : r)))
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-1.5">
          <input className="field" value={r[0]} maxLength={200} placeholder={b.t === 'check' ? '소재' : '항목'} aria-label="항목" onChange={(e) => up(i, 0, e.target.value)} />
          {b.t === 'check' ? (
            <select className="field" value={r[1]} aria-label="표기" onChange={(e) => up(i, 1, e.target.value)}>
              {MARKS.map(([m, l]) => (
                <option key={m} value={m}>
                  {l}
                </option>
              ))}
            </select>
          ) : (
            <input className="field" value={r[1]} maxLength={400} placeholder="내용" aria-label="내용" onChange={(e) => up(i, 1, e.target.value)} />
          )}
          <button type="button" className="px-2 text-muted-foreground hover:text-destructive" aria-label="줄 지우기" onClick={() => onRows(rows.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="text-[13px] text-seal hover:underline" onClick={() => onRows([...rows, ['', b.t === 'check' ? '○' : '']])}>
        + 줄 추가
      </button>
    </div>
  )
}

export function ProfileDocEditor({ value, onChange, name = '', stacked = false }: { value: ProfileDoc; onChange: (d: ProfileDoc) => void; name?: string; stacked?: boolean }) {
  const d = value
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const [code, setCode] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const bytes = docBytes(d)
  const over = bytes > PROFILE_DOC_BYTES

  const set = (patch: Partial<ProfileDoc>) => onChange({ ...d, ...patch })
  const setBlock = (id: string, patch: Partial<PBlock>) => set({ blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= d.blocks.length) return
    const next = [...d.blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    set({ blocks: next })
  }
  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2000)
  }
  // 고른 글자를 표시로 감싼다. 아무것도 안 골랐으면 '글자'를 넣는다
  const wrap = (b: PBlock, mark: string) => {
    const el = refs.current[b.id]
    const text = b.text ?? ''
    const s = el?.selectionStart ?? text.length
    const e = el?.selectionEnd ?? text.length
    const picked = text.slice(s, e) || '글자'
    setBlock(b.id, { text: text.slice(0, s) + mark + picked + mark + text.slice(e) })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(s + mark.length, s + mark.length + picked.length)
    })
  }

  const fields = (b: PBlock) => {
    switch (b.t) {
      case 'heading':
        return <input className="field" value={b.text ?? ''} maxLength={60} placeholder="소제목" aria-label="소제목" onChange={(e) => setBlock(b.id, { text: e.target.value })} />
      case 'tags':
        return <input className="field" value={b.text ?? ''} maxLength={300} placeholder="쉼표로 나눠 적기 · 무뚝뚝, 단 거 좋아함" aria-label="키워드" onChange={(e) => setBlock(b.id, { text: e.target.value })} />
      case 'text':
      case 'quote':
        return (
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              {TEXT_TOOLS.map(([m, l, c]) => (
                <button key={m} type="button" className={cx('border border-rule px-2 py-0.5 text-[12.5px] hover:border-foreground', c)} onClick={() => wrap(b, m)}>
                  {l}
                </button>
              ))}
              <select aria-label="정렬" className="ml-auto border border-rule bg-background px-1.5 py-0.5 text-[12.5px]" value={b.align ?? 'left'} onChange={(e) => setBlock(b.id, { align: e.target.value as Align })}>
                <option value="left">왼쪽 정렬</option>
                <option value="center">가운데 정렬</option>
                <option value="right">오른쪽 정렬</option>
              </select>
            </div>
            <textarea
              ref={(el) => {
                refs.current[b.id] = el
              }}
              className={cx('field', b.t === 'text' ? 'min-h-24' : 'min-h-14')}
              value={b.text ?? ''}
              maxLength={4000}
              aria-label={b.t === 'text' ? '글' : '한마디'}
              placeholder={b.t === 'quote' ? '대사나 한마디' : '내용'}
              onChange={(e) => setBlock(b.id, { text: e.target.value })}
            />
          </div>
        )
      case 'info':
      case 'check':
        return <RowsEditor b={b} onRows={(rows) => setBlock(b.id, { rows })} />
      case 'image':
        return (
          <div className="grid gap-1.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <input className="field" value={b.url ?? ''} maxLength={1000} placeholder="https://…" aria-label="이미지 주소" onChange={(e) => setBlock(b.id, { url: e.target.value.trim() })} />
            <input className="field" value={b.text ?? ''} maxLength={80} placeholder="설명 (선택)" aria-label="이미지 설명" onChange={(e) => setBlock(b.id, { text: e.target.value })} />
          </div>
        )
      case 'divider':
        return <p className="text-[12.5px] text-muted-foreground">가로선이 들어갑니다.</p>
    }
  }

  const controls = (
    <div className="min-w-0 space-y-6">
      <div>
        <span className="form-label">스킨</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SKINS.map((s) => (
            <button key={s.key} type="button" aria-pressed={d.skin === s.key} onClick={() => set({ skin: s.key })} className={cx('border p-2 text-left transition-colors', d.skin === s.key ? 'border-seal' : 'border-rule hover:border-foreground')}>
              <span className="flex h-10 items-end gap-1 p-1.5" style={{ background: s.swatch[0] }}>
                <span className="h-1.5 w-8" style={{ background: d.accent }} />
                <span className="h-1 w-5 opacity-60" style={{ background: s.swatch[1] }} />
              </span>
              <span className="mt-1.5 block text-[13.5px] font-bold">{s.label}</span>
              <span className="block text-[11.5px] leading-snug text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className="form-label">포인트 색</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {ACCENTS.map((c) => (
              <button key={c} type="button" aria-label={`포인트 색 ${c}`} aria-pressed={d.accent === c} onClick={() => set({ accent: c })} className={cx('h-7 w-7 border-2', d.accent === c ? 'border-foreground' : 'border-transparent')} style={{ background: c }} />
            ))}
            <input type="color" aria-label="포인트 색 직접 고르기" value={d.accent} onChange={(e) => set({ accent: e.target.value })} className="h-7 w-9 cursor-pointer border border-rule bg-transparent" />
          </div>
        </div>
        <div>
          <span className="form-label">제목 글꼴</span>
          <div className="flex gap-1">
            {FONTS.map((f) => (
              <button key={f.key} type="button" aria-pressed={d.font === f.key} onClick={() => set({ font: f.key })} className={cx('border px-3 py-1.5 text-[14px]', d.font === f.key ? 'border-seal bg-seal font-bold text-ink' : 'border-rule hover:border-foreground')} style={{ fontFamily: f.css }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="form-label">제목</span>
          <input className="field" value={d.title} maxLength={60} placeholder={name || '캐릭터 이름'} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="block">
          <span className="form-label">부제</span>
          <input className="field" value={d.subtitle} maxLength={120} placeholder="코드네임이나 한 줄 소개" onChange={(e) => set({ subtitle: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className="form-label">대표 이미지 주소</span>
        <input className="field" value={d.image} maxLength={1000} placeholder="https://…" onChange={(e) => set({ image: e.target.value.trim() })} />
        {d.image && !isUrl(d.image) && <span className="mt-1 block text-[12.5px] text-warn">https:// 로 시작하는 주소만 보입니다.</span>}
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold">칸 {d.blocks.length}개</span>
          {d.blocks.length === 0 && (
            <button type="button" className="btn btn-sm" onClick={() => set({ title: d.title || name, blocks: starterBlocks(name) })}>
              기본 틀로 시작
            </button>
          )}
        </div>
        <ol className="space-y-2">
          {d.blocks.map((b, i) => (
            <li key={b.id} className="border border-rule bg-background">
              <div className="flex items-center gap-1 border-b border-rule px-2 py-1 text-[12.5px]">
                <span className="font-bold">{BLOCK_TYPES.find((x) => x.t === b.t)?.label}</span>
                <span className="ml-auto" />
                <button type="button" className="px-2 py-0.5 hover:text-seal disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로 올리기">
                  ↑
                </button>
                <button type="button" className="px-2 py-0.5 hover:text-seal disabled:opacity-30" disabled={i === d.blocks.length - 1} onClick={() => move(i, 1)} aria-label="아래로 내리기">
                  ↓
                </button>
                <button type="button" className="px-2 py-0.5 hover:text-destructive" onClick={() => set({ blocks: d.blocks.filter((x) => x.id !== b.id) })} aria-label="칸 지우기">
                  ✕
                </button>
              </div>
              <div className="p-2">{fields(b)}</div>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-muted-foreground">칸 추가</span>
          {BLOCK_TYPES.map((x) => (
            <button key={x.t} type="button" className="btn btn-sm" onClick={() => set({ blocks: [...d.blocks, newBlock(x.t)] })}>
              + {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4 text-[13px]">
        <span className={cx('font-mono', over ? 'text-destructive' : 'text-muted-foreground')}>용량 {Math.round((bytes / PROFILE_DOC_BYTES) * 100)}%</span>
        <span className="ml-auto" />
        <button type="button" className="btn btn-sm" onClick={async () => flash((await copyText(JSON.stringify(d))) ? '코드를 복사했습니다' : '복사하지 못했습니다')}>
          코드 복사
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setCode(code === null ? '' : null)}>
          코드 불러오기
        </button>
        {!isEmptyDoc(d) && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (confirm('문서를 비울까요?')) onChange({ ...emptyDoc(), skin: d.skin, accent: d.accent, font: d.font })
            }}
          >
            비우기
          </button>
        )}
      </div>
      {msg && <p className="text-[13px] text-muted-foreground">{msg}</p>}
      {over && <p className="text-[13px] text-destructive">문서가 너무 깁니다. 칸이나 글을 줄여 주세요.</p>}
      {code !== null && (
        <div className="space-y-2">
          <textarea className="field min-h-24 font-mono text-[12.5px]" value={code} aria-label="문서 코드" onChange={(e) => setCode(e.target.value)} placeholder="복사해 둔 코드를 붙여 넣으세요" />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              const p = parseProfileDoc(code)
              if (!p) return flash('코드를 읽지 못했습니다')
              onChange(p)
              setCode(null)
              flash('불러왔습니다')
            }}
          >
            불러오기
          </button>
        </div>
      )}
    </div>
  )

  const preview = (
    <div className="min-w-0">
      <p className="form-label">미리보기</p>
      <ProfileDocView doc={d} />
    </div>
  )

  return stacked ? (
    <div className="space-y-8">
      {controls}
      {preview}
    </div>
  ) : (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
      {controls}
      <div className="xl:sticky xl:top-24">{preview}</div>
    </div>
  )
}
