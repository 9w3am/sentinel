import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copyText, cx } from '../ui'
import { ProfileDocView, type EditHooks } from './ProfileView'
import { PROFILE_EXAMPLES } from './examples'
import { StickerArt } from './stickers'
import { DocThumb } from './Thumb'
import {
  ACCENTS,
  BLOCK_GROUPS,
  BLOCK_TYPES,
  FONTS,
  LIMITS,
  PAGE_TEMPLATES,
  PROFILE_DOC_BYTES,
  STICKERS,
  TEXTURES,
  THEMES,
  VARIANTS,
  docBytes,
  emptyDoc,
  fontCss,
  isEmptyDoc,
  labelOf,
  newBlock,
  newSticker,
  parseProfileDoc,
  starterDoc,
  themeDefaults,
  uid,
  type BStyle,
  type BlockType,
  type PBlock,
  type Page,
  type ProfileDoc,
  type Sticker,
  type StickerKey,
  type ThemeKey,
} from './model'

type Tab = 'doc' | 'page' | 'block' | 'sticker'
const TABS: [Tab, string][] = [
  ['doc', '문서'],
  ['page', '페이지'],
  ['block', '칸'],
  ['sticker', '스티커'],
]

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className="form-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

function Seg<T extends string>({ value, options, onChange }: { value: T | undefined; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={cx('border px-2.5 py-1 text-[13px]', value === v ? 'border-seal bg-seal font-bold text-ink' : 'border-rule hover:border-foreground')}>
          {l}
        </button>
      ))}
    </div>
  )
}

function Range({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="form-label flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">
          {Math.round(value)}
          {unit}
        </span>
      </span>
      <input type="range" className="w-full accent-[var(--seal)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

function Swatches({ value, onChange, allowTheme }: { value?: string; onChange: (v: string | undefined) => void; allowTheme?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowTheme && (
        <button type="button" aria-pressed={!value} onClick={() => onChange(undefined)} className={cx('h-7 border px-2 text-[12px]', !value ? 'border-seal text-seal' : 'border-rule')}>
          포인트
        </button>
      )}
      {ACCENTS.map((c) => (
        <button key={c} type="button" aria-label={`색 ${c}`} aria-pressed={value === c} onClick={() => onChange(c)} className={cx('h-7 w-7 border-2', value === c ? 'border-seal' : 'border-rule')} style={{ background: c }} />
      ))}
      <input type="color" aria-label="색 직접 고르기" value={value ?? '#f0c419'} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer border border-rule bg-transparent" />
    </div>
  )
}

function FontSelect({ value, onChange, allowInherit }: { value: string; onChange: (v: string) => void; allowInherit?: boolean }) {
  return (
    <div>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {allowInherit && <option value="">문서 글꼴 따라감</option>}
        {FONTS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
      {value && (
        <p className="mt-1 truncate text-[20px] leading-snug" style={{ fontFamily: fontCss(value), fontStyle: value === 'italic' ? 'italic' : undefined }}>
          파수국 요원 Profile 07
        </p>
      )}
    </div>
  )
}

const ROW_COLS: Partial<Record<BlockType, { ph: string; kind: 'text' | 'mark' | 'num'; w: string }[]>> = {
  info: [
    { ph: '항목', kind: 'text', w: '2fr' },
    { ph: '내용', kind: 'text', w: '3fr' },
  ],
  check: [
    { ph: '소재', kind: 'text', w: '3fr' },
    { ph: '표기', kind: 'mark', w: '1.5fr' },
  ],
  gauge: [
    { ph: '항목', kind: 'text', w: '3fr' },
    { ph: '0~100', kind: 'num', w: '1.2fr' },
  ],
  relation: [
    { ph: '이름', kind: 'text', w: '1.3fr' },
    { ph: '관계', kind: 'text', w: '1fr' },
    { ph: '한 줄', kind: 'text', w: '2fr' },
    { ph: '사진 주소', kind: 'text', w: '1.4fr' },
  ],
  timeline: [
    { ph: '시기', kind: 'text', w: '1.2fr' },
    { ph: '있었던 일', kind: 'text', w: '3fr' },
  ],
}

function RowsEditor({ t, rows, onRows }: { t: BlockType; rows: string[][]; onRows: (rows: string[][]) => void }) {
  const cols = ROW_COLS[t]!
  const tpl = cols.map((c) => `minmax(0,${c.w})`).join(' ') + ' auto'
  const set = (i: number, k: number, v: string) => onRows(rows.map((r, j) => (j === i ? cols.map((_, n) => (n === k ? v : (r[n] ?? ''))) : r)))
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: tpl }}>
          {cols.map((c, k) =>
            c.kind === 'mark' ? (
              <select key={k} className="field px-1" value={r[k] ?? '○'} aria-label={c.ph} onChange={(e) => set(i, k, e.target.value)}>
                <option value="○">○ 괜찮음</option>
                <option value="△">△ 조율</option>
                <option value="✕">✕ 안 됨</option>
              </select>
            ) : (
              <input key={k} className="field" inputMode={c.kind === 'num' ? 'numeric' : undefined} value={r[k] ?? ''} placeholder={c.ph} aria-label={c.ph} maxLength={c.kind === 'num' ? 3 : 600} onChange={(e) => set(i, k, e.target.value)} />
            ),
          )}
          <button type="button" className="px-1.5 text-muted-foreground hover:text-destructive" aria-label="줄 지우기" onClick={() => onRows(rows.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      {rows.length < LIMITS.rows && (
        <button type="button" className="text-[13px] text-seal hover:underline" onClick={() => onRows([...rows, cols.map((c) => (c.kind === 'mark' ? '○' : ''))])}>
          + 줄 추가
        </button>
      )}
    </div>
  )
}

/** 꾸미기 창 머리에 들어갈 것들 */
export interface StudioChrome {
  title: ReactNode
  status?: ReactNode
  back?: ReactNode
  actions?: ReactNode
}

export function ProfileDocEditor({ value, onChange, name = '', stacked = false, studio }: { value: ProfileDoc; onChange: (d: ProfileDoc) => void; name?: string; stacked?: boolean; studio?: StudioChrome }) {
  const d = value
  const latest = useRef(d)
  latest.current = d
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const [tab, setTab] = useState<Tab>('doc')
  const [pi, setPi] = useState(0)
  const [bid, setBid] = useState<string | null>(null)
  const [sid, setSid] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const pageIndex = Math.min(pi, d.pages.length - 1)
  const page = d.pages[pageIndex]
  const bytes = docBytes(d)
  const over = bytes > PROFILE_DOC_BYTES

  // 되돌리기 기록: 0.7초 안에 이어진 변경은 한 번으로 묶는다
  const hist = useRef<{ past: ProfileDoc[]; future: ProfileDoc[]; at: number }>({ past: [], future: [], at: 0 })
  const [zoom, setZoom] = useState(1)
  const [sheet, setSheet] = useState(false)
  const [gallery, setGallery] = useState(false)
  const [menuOpen, setMenuOpen] = useState<{ key: string; x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLElement>(null)
  const commit = (next: ProfileDoc) => {
    const h = hist.current
    const t = Date.now()
    if (t - h.at > 700) {
      h.past.push(latest.current)
      if (h.past.length > 100) h.past.shift()
    }
    h.at = t
    h.future = []
    latest.current = next
    onChange(next)
  }
  const undo = () => {
    const h = hist.current
    const prev = h.past.pop()
    if (!prev) return
    h.future.push(latest.current)
    h.at = 0
    latest.current = prev
    onChange(prev)
  }
  const redo = () => {
    const h = hist.current
    const next = h.future.pop()
    if (!next) return
    h.past.push(latest.current)
    h.at = 0
    latest.current = next
    onChange(next)
  }
  const keys = useRef({ undo, redo })
  keys.current = { undo, redo }
  const isStudio = !!studio
  useEffect(() => {
    if (!isStudio) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        keys.current.undo()
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        keys.current.redo()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('[data-menu]')) setMenuOpen(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isStudio])
  const set = (patch: Partial<ProfileDoc>) => commit({ ...latest.current, ...patch })
  const setPages = (fn: (pages: Page[]) => Page[]) => commit({ ...latest.current, pages: fn(latest.current.pages) })
  const setPage = (i: number, patch: Partial<Page>) => setPages((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setBlocks = (i: number, fn: (bs: PBlock[]) => PBlock[]) => setPages((ps) => ps.map((p, j) => (j === i ? { ...p, blocks: fn(p.blocks) } : p)))
  const setBlock = (i: number, id: string, patch: Partial<PBlock>) => setBlocks(i, (bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  const setStickers = (i: number, fn: (ss: Sticker[]) => Sticker[]) => setPages((ps) => ps.map((p, j) => (j === i ? { ...p, stickers: fn(p.stickers) } : p)))
  const setSticker = (i: number, id: string, patch: Partial<Sticker>) => setStickers(i, (ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2200)
  }
  const move = <T,>(arr: T[], i: number, dir: number) => {
    const j = i + dir
    if (j < 0 || j >= arr.length) return arr
    const next = [...arr]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  }

  const hooks: EditHooks = {
    page: pageIndex,
    block: bid,
    sticker: sid,
    onPage: (i) => setPi(i),
    onBlock: (i, id) => {
      setPi(i)
      setBid(id)
      setTab('block')
      if (studio && window.innerWidth < 768) setSheet(true)
    },
    onSticker: (i, id) => {
      setPi(i)
      setSid(id)
      setTab('sticker')
    },
    onMoveSticker: (i, id, x, y) => setSticker(i, id, { x, y }),
  }

  // 고른 글자를 표시로 감싼다
  const wrap = (b: PBlock, mark: string) => {
    const el = refs.current[b.id]
    const text = b.text ?? ''
    const s = el?.selectionStart ?? text.length
    const e = el?.selectionEnd ?? text.length
    const picked = text.slice(s, e) || '글자'
    setBlock(pageIndex, b.id, { text: text.slice(0, s) + mark + picked + mark + text.slice(e) })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(s + mark.length, s + mark.length + picked.length)
    })
  }

  // ── 문서 탭
  const docTab = (
    <div className="space-y-6">
      {isEmptyDoc(d) && (
        <div className="border border-seal/60 bg-seal/10 p-3 text-[13.5px]">
          <p>처음이라면 표지 · 기본 정보 · 러닝 주의 세 장짜리 틀로 시작해 보세요.</p>
          <button
            type="button"
            className="btn btn-sm btn-primary mt-2"
            onClick={() => {
              commit(starterDoc(name, latest.current))
              setPi(0)
            }}
          >
            기본 틀로 시작
          </button>
        </div>
      )}
      <Field label="테마" hint="테마를 바꾸면 포인트 색 · 글꼴 · 질감도 그 테마 기본값으로 바뀝니다. 내용은 그대로입니다.">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button key={t.key} type="button" aria-pressed={d.theme === t.key} onClick={() => set(themeDefaults(t.key))} className={cx('border p-1.5 text-left', d.theme === t.key ? 'border-seal' : 'border-rule hover:border-foreground')}>
              <span className="relative block h-12 overflow-hidden" style={{ background: t.bg }}>
                <span className="absolute left-1.5 top-1.5 h-1.5 w-7" style={{ background: t.accent }} />
                <span className="absolute bottom-0.5 left-1.5 text-[19px] leading-none" style={{ color: t.fg, fontFamily: fontCss(t.fontTitle), fontStyle: t.fontTitle === 'italic' ? 'italic' : undefined }}>
                  가 Aa
                </span>
              </span>
              <span className="mt-1 block text-[12.5px] font-bold leading-tight">{t.label}</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="포인트 색">
        <Swatches value={d.accent} onChange={(v) => set({ accent: v ?? THEMES[0].accent })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="제목 글꼴">
          <FontSelect value={d.fontTitle} onChange={(v) => set({ fontTitle: v as ProfileDoc['fontTitle'] })} />
        </Field>
        <Field label="본문 글꼴">
          <FontSelect value={d.fontBody} onChange={(v) => set({ fontBody: v as ProfileDoc['fontBody'] })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="질감">
          <select className="field" value={d.texture} onChange={(e) => set({ texture: e.target.value as ProfileDoc['texture'] })}>
            {TEXTURES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Range label="질감 진하기" value={d.textureOp} min={0} max={100} unit="%" onChange={(v) => set({ textureOp: v })} />
      </div>
      <Field label="페이지 비율">
        <Seg
          value={d.ratio}
          options={[
            ['doc', '문서 (세로 A4)'],
            ['square', '정사각'],
            ['free', '내용만큼'],
          ]}
          onChange={(v) => set({ ratio: v })}
        />
      </Field>
    </div>
  )

  // ── 페이지 탭
  const pageTab = page && (
    <div className="space-y-5">
      <div>
        <span className="form-label">페이지 {d.pages.length}장</span>
        <div className="flex flex-wrap gap-1">
          {d.pages.map((p, i) => (
            <button key={p.id} type="button" aria-pressed={i === pageIndex} onClick={() => setPi(i)} className={cx('border px-3 py-1 text-[13px]', i === pageIndex ? 'border-seal bg-seal font-bold text-ink' : 'border-rule hover:border-foreground')}>
              {i + 1}쪽
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" className="btn btn-sm" disabled={pageIndex === 0} onClick={() => (setPages((ps) => move(ps, pageIndex, -1)), setPi(pageIndex - 1))}>
            앞으로
          </button>
          <button type="button" className="btn btn-sm" disabled={pageIndex === d.pages.length - 1} onClick={() => (setPages((ps) => move(ps, pageIndex, 1)), setPi(pageIndex + 1))}>
            뒤로
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={d.pages.length >= LIMITS.pages}
            onClick={() => {
              const copy: Page = { ...page, id: uid(), blocks: page.blocks.map((b) => ({ ...b, id: uid() })), stickers: page.stickers.map((s) => ({ ...s, id: uid() })) }
              setPages((ps) => [...ps.slice(0, pageIndex + 1), copy, ...ps.slice(pageIndex + 1)])
              setPi(pageIndex + 1)
            }}
          >
            복제
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={d.pages.length <= 1}
            onClick={() => {
              if (!confirm(`${pageIndex + 1}쪽을 지울까요?`)) return
              setPages((ps) => ps.filter((_, j) => j !== pageIndex))
              setPi(Math.max(0, pageIndex - 1))
            }}
          >
            지우기
          </button>
        </div>
      </div>
      <Field label="새 페이지 추가">
        <div className="flex flex-wrap gap-1">
          {PAGE_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="btn btn-sm"
              disabled={d.pages.length >= LIMITS.pages}
              onClick={() => {
                setPages((ps) => [...ps, t.make(name)])
                setPi(latest.current.pages.length - 1)
              }}
            >
              + {t.label}
            </button>
          ))}
        </div>
      </Field>
      <div className="space-y-4 border-t border-rule pt-4">
        <p className="text-[13px] font-bold">{pageIndex + 1}쪽 꾸미기</p>
        <Field label="배경 이미지 주소" hint="https:// 로 시작하는 이미지 주소만 보입니다.">
          <input className="field" value={page.bg.url} placeholder="https://…" maxLength={1000} onChange={(e) => setPage(pageIndex, { bg: { ...page.bg, url: e.target.value.trim() } })} />
        </Field>
        <Field label="이미지 자리">
          <Seg
            value={page.bg.area}
            options={[
              ['full', '페이지 전체'],
              ['top', '위쪽 크게'],
              ['side', '왼쪽 세로'],
            ]}
            onChange={(v) => setPage(pageIndex, { bg: { ...page.bg, area: v } })}
          />
        </Field>
        <Field label="이미지 효과">
          <Seg
            value={page.bg.filter}
            options={[
              ['none', '원본'],
              ['mono', '흑백'],
              ['sepia', '빛바랜'],
              ['duo', '포인트 색'],
              ['soft', '흐리게'],
            ]}
            onChange={(v) => setPage(pageIndex, { bg: { ...page.bg, filter: v } })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Range label="이미지 가리기" value={page.bg.dim} min={0} max={90} unit="%" onChange={(v) => setPage(pageIndex, { bg: { ...page.bg, dim: v } })} />
          <Field label="이미지 기준">
            <Seg
              value={page.bg.pos}
              options={[
                ['top', '위'],
                ['center', '가운데'],
                ['bottom', '아래'],
              ]}
              onChange={(v) => setPage(pageIndex, { bg: { ...page.bg, pos: v } })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="여백">
            <Seg
              value={page.pad}
              options={[
                ['s', '좁게'],
                ['m', '보통'],
                ['l', '넓게'],
              ]}
              onChange={(v) => setPage(pageIndex, { pad: v })}
            />
          </Field>
          <Field label="이 페이지 질감">
            <select className="field" value={page.texture} onChange={(e) => setPage(pageIndex, { texture: e.target.value as Page['texture'] })}>
              <option value="theme">문서 설정 따라감</option>
              {TEXTURES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </div>
  )

  // ── 칸 편집
  const blockFields = (b: PBlock) => {
    const up = (patch: Partial<PBlock>) => setBlock(pageIndex, b.id, patch)
    const input = (key: 'text' | 'text2', label: string, ph = '', max = 600) => (
      <Field label={label}>
        <input className="field" value={b[key] ?? ''} placeholder={ph} maxLength={max} onChange={(e) => up({ [key]: e.target.value })} />
      </Field>
    )
    const rich = (label: string, ph: string, rows = 4) => (
      <Field label={label}>
        <div className="mb-1 flex flex-wrap gap-1">
          {(
            [
              ['**', '굵게', 'font-bold'],
              ['*', '기울임', 'italic'],
              ['==', '형광펜', ''],
              ['~~', '포인트 색', ''],
            ] as const
          ).map(([m, l, c]) => (
            <button key={m} type="button" className={cx('border border-rule px-2 py-0.5 text-[12.5px] hover:border-foreground', c)} onClick={() => wrap(b, m)}>
              {l}
            </button>
          ))}
        </div>
        <textarea
          ref={(el) => {
            refs.current[b.id] = el
          }}
          className="field"
          rows={rows}
          value={b.text ?? ''}
          placeholder={ph}
          maxLength={4000}
          onChange={(e) => up({ text: e.target.value })}
        />
      </Field>
    )
    let body: ReactNode = null
    switch (b.t) {
      case 'title':
        body = (
          <>
            {input('text', '제목', name || '캐릭터 이름', 60)}
            {input('text2', b.variant === 'script' ? '위에 겹칠 필기체 영문' : '부제', b.variant === 'script' ? 'Profile' : '코드네임 · 한 줄 소개', 120)}
          </>
        )
        break
      case 'banner':
        body = (
          <>
            {input('text', '문구', '캐치프레이즈', 200)}
            {input('text2', '위에 작게 들어갈 영문', 'catchphrase', 120)}
          </>
        )
        break
      case 'heading':
        body = input('text', '소제목', '기본 정보', 60)
        break
      case 'text':
        body = rich('글', '내용', 5)
        break
      case 'quote':
        body = rich('한마디', '대사나 한마디', 2)
        break
      case 'speech':
        body = (
          <>
            {input('text2', '말하는 사람', '이름', 40)}
            {rich('대사', '대사', 2)}
          </>
        )
        break
      case 'window':
        body = (
          <>
            {input('text2', '창 제목', 'STATUS', 40)}
            <Field label="줄" hint="줄 앞에 [알림] 처럼 대괄호를 붙이면 색이 들어갑니다.">
              <textarea className="field font-mono text-[13px]" rows={4} value={b.text ?? ''} placeholder={'[상태] 폭주 수치 41%\n[팀] 제3팀 · 전투'} maxLength={2000} onChange={(e) => up({ text: e.target.value })} />
            </Field>
          </>
        )
        break
      case 'tags':
        body = input('text', '키워드', '쉼표로 나눠 적기 · 무뚝뚝, 단 거 좋아함', 400)
        break
      case 'likes':
        body = (
          <>
            {input('text', '좋아하는 것', '쉼표로 나눠 적기', 400)}
            {input('text2', '싫어하는 것', '쉼표로 나눠 적기', 400)}
          </>
        )
        break
      case 'info':
      case 'check':
      case 'gauge':
      case 'relation':
      case 'timeline':
        body = <RowsEditor t={b.t} rows={b.rows ?? []} onRows={(rows) => up({ rows })} />
        break
      case 'player':
        body = (
          <>
            {input('text', '곡 제목', '곡 제목', 80)}
            {input('text2', '부른 사람', '가수', 80)}
            <Range label="재생 위치" value={b.num ?? 35} min={0} max={100} unit="%" onChange={(v) => up({ num: v })} />
          </>
        )
        break
      case 'image':
        body = (
          <>
            <Field label="이미지 주소">
              <input className="field" value={b.urls?.[0] ?? ''} placeholder="https://…" maxLength={1000} onChange={(e) => up({ urls: [e.target.value.trim()] })} />
            </Field>
            {input('text', '설명', '비워도 됩니다', 80)}
          </>
        )
        break
      case 'collage':
        body = (
          <Field label="이미지 주소 (최대 3장)">
            <div className="space-y-1">
              {[0, 1, 2].map((k) => (
                <input
                  key={k}
                  className="field"
                  value={b.urls?.[k] ?? ''}
                  placeholder={`${k + 1}번 이미지 https://…`}
                  maxLength={1000}
                  onChange={(e) => {
                    const urls = [...(b.urls ?? ['', '', ''])]
                    urls[k] = e.target.value.trim()
                    up({ urls })
                  }}
                />
              ))}
            </div>
          </Field>
        )
        break
      case 'spacer':
        body = <Range label="높이" value={b.num ?? 40} min={0} max={240} onChange={(v) => up({ num: v })} />
        break
      case 'divider':
        body = null
    }
    const variants = VARIANTS[b.t]
    const s = b.style ?? {}
    const upStyle = (patch: Partial<BStyle>) => up({ style: { ...s, ...patch } })
    return (
      <div className="space-y-3">
        {variants.length > 1 && (
          <Field label="모양">
            <Seg value={b.variant} options={variants} onChange={(v) => up({ variant: v })} />
          </Field>
        )}
        {body}
        <details className="border-t border-rule pt-2">
          <summary className="cursor-pointer text-[13px] font-bold">칸 꾸미기 · 상자 · 정렬 · 크기 · 색 · 글꼴</summary>
          <div className="mt-3 space-y-3">
            <Field label="상자">
              <Seg
                value={s.box ?? 'none'}
                options={[
                  ['none', '없음'],
                  ['card', '카드'],
                  ['line', '위아래 선'],
                  ['tape', '테이프 메모'],
                  ['glass', '반투명'],
                  ['ink', '반전'],
                ]}
                onChange={(v) => upStyle({ box: v })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="정렬">
                <Seg
                  value={s.align ?? 'left'}
                  options={[
                    ['left', '왼쪽'],
                    ['center', '가운데'],
                    ['right', '오른쪽'],
                  ]}
                  onChange={(v) => upStyle({ align: v })}
                />
              </Field>
              <Field label="너비">
                <Seg
                  value={s.width ?? 'full'}
                  options={[
                    ['full', '보통'],
                    ['wide', '넓게'],
                    ['narrow', '좁게'],
                  ]}
                  onChange={(v) => upStyle({ width: v })}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="크기">
                <Seg
                  value={s.size ?? 'm'}
                  options={[
                    ['s', '작게'],
                    ['m', '보통'],
                    ['l', '크게'],
                    ['xl', '아주 크게'],
                  ]}
                  onChange={(v) => upStyle({ size: v })}
                />
              </Field>
              <Field label="글자색">
                <Seg
                  value={s.tone ?? 'ink'}
                  options={[
                    ['ink', '기본'],
                    ['accent', '포인트'],
                    ['muted', '흐리게'],
                  ]}
                  onChange={(v) => upStyle({ tone: v })}
                />
              </Field>
            </div>
            <Field label="글꼴">
              <FontSelect value={s.font ?? ''} allowInherit onChange={(v) => upStyle({ font: v as BStyle['font'] })} />
            </Field>
            <Range label="기울기" value={s.tilt ?? 0} min={-8} max={8} step={0.5} unit="°" onChange={(v) => upStyle({ tilt: v })} />
          </div>
        </details>
      </div>
    )
  }

  const blockTab = page && (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        {pageIndex + 1}쪽 · 칸 {page.blocks.length}개. 미리보기에서 칸을 누르면 바로 여기서 고칠 수 있어요.
      </p>
      <ol className="space-y-1.5">
        {page.blocks.map((b, i) => {
          const open = bid === b.id
          return (
            <li key={b.id} className={cx('border bg-background', open ? 'border-seal' : 'border-rule')}>
              <div className="flex items-center gap-1 px-2 py-1 text-[13px]">
                <button type="button" className="min-w-0 flex-1 truncate py-1 text-left" aria-expanded={open} onClick={() => setBid(open ? null : b.id)}>
                  <b>{labelOf(b.t)}</b>
                  <span className="ml-1.5 text-muted-foreground">{VARIANTS[b.t].find((v) => v[0] === b.variant)?.[1]}</span>
                  <span className="ml-1.5 text-muted-foreground">{(b.text || b.rows?.[0]?.[0] || '').slice(0, 18)}</span>
                </button>
                <button type="button" className="px-1.5 hover:text-seal disabled:opacity-30" disabled={i === 0} aria-label="위로" onClick={() => setBlocks(pageIndex, (bs) => move(bs, i, -1))}>
                  ↑
                </button>
                <button type="button" className="px-1.5 hover:text-seal disabled:opacity-30" disabled={i === page.blocks.length - 1} aria-label="아래로" onClick={() => setBlocks(pageIndex, (bs) => move(bs, i, 1))}>
                  ↓
                </button>
                <button type="button" className="px-1.5 hover:text-seal" aria-label="복제" onClick={() => setBlocks(pageIndex, (bs) => [...bs.slice(0, i + 1), { ...b, id: uid() }, ...bs.slice(i + 1)])}>
                  ⧉
                </button>
                <button type="button" className="px-1.5 hover:text-destructive" aria-label="칸 지우기" onClick={() => setBlocks(pageIndex, (bs) => bs.filter((x) => x.id !== b.id))}>
                  ✕
                </button>
              </div>
              {open && <div className="border-t border-rule p-3">{blockFields(b)}</div>}
            </li>
          )
        })}
      </ol>
      <div className="space-y-2 border-t border-rule pt-3">
        <p className="text-[13px] font-bold">칸 추가</p>
        {BLOCK_GROUPS.map((g) => (
          <div key={g} className="flex flex-wrap items-center gap-1">
            <span className="w-10 text-[12px] text-muted-foreground">{g}</span>
            {BLOCK_TYPES.filter((x) => x.group === g).map((x) => (
              <button
                key={x.t}
                type="button"
                className="btn btn-sm"
                disabled={page.blocks.length >= LIMITS.blocks}
                onClick={() => {
                  const nb = newBlock(x.t)
                  setBlocks(pageIndex, (bs) => [...bs, nb])
                  setBid(nb.id)
                }}
              >
                + {x.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  // ── 스티커 탭
  const cur = page?.stickers.find((s) => s.id === sid)
  const curDef = cur ? STICKERS.find((x) => x.k === cur.k) : undefined
  const stickerTab = page && (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">누르면 {pageIndex + 1}쪽에 붙습니다. 미리보기에서 끌어서 옮기세요.</p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {STICKERS.map((x) => (
          <button
            key={x.k}
            type="button"
            className="flex flex-col items-center gap-1 border border-rule p-1.5 hover:border-foreground disabled:opacity-40"
            disabled={page.stickers.length >= LIMITS.stickers}
            onClick={() => {
              const ns = { ...newSticker(x.k), x: 30 + Math.random() * 40, y: 20 + Math.random() * 30 }
              setStickers(pageIndex, (ss) => [...ss, ns])
              setSid(ns.id)
            }}
          >
            <span className="grid h-9 w-full place-items-center">
              <span className="block w-9">
                <StickerArt k={x.k} color={d.accent} text={x.text} />
              </span>
            </span>
            <span className="text-[11px] leading-tight">{x.label}</span>
          </button>
        ))}
      </div>
      {page.stickers.length > 0 && (
        <div>
          <span className="form-label">붙인 스티커 {page.stickers.length}개</span>
          <div className="flex flex-wrap gap-1">
            {page.stickers.map((s, i) => (
              <button key={s.id} type="button" aria-pressed={sid === s.id} onClick={() => setSid(s.id)} className={cx('border px-2 py-0.5 text-[12.5px]', sid === s.id ? 'border-seal bg-seal font-bold text-ink' : 'border-rule')}>
                {i + 1}. {STICKERS.find((x) => x.k === s.k)?.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {cur && curDef && (
        <div className="space-y-3 border-t border-rule pt-3">
          <p className="text-[13px] font-bold">{curDef.label} 고치기</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Range label="크기" value={cur.s} min={2} max={90} onChange={(v) => setSticker(pageIndex, cur.id, { s: v })} />
            <Range label="회전" value={cur.r} min={-180} max={180} unit="°" onChange={(v) => setSticker(pageIndex, cur.id, { r: v })} />
            <Range label="가로 위치" value={cur.x} min={-10} max={110} unit="%" onChange={(v) => setSticker(pageIndex, cur.id, { x: v })} />
            <Range label="세로 위치" value={cur.y} min={-10} max={110} unit="%" onChange={(v) => setSticker(pageIndex, cur.id, { y: v })} />
            <Range label="진하기" value={cur.o} min={10} max={100} unit="%" onChange={(v) => setSticker(pageIndex, cur.id, { o: v })} />
          </div>
          {curDef.color && (
            <Field label="색">
              <Swatches value={cur.c} allowTheme onChange={(v) => setSticker(pageIndex, cur.id, { c: v })} />
            </Field>
          )}
          {curDef.text !== undefined && (
            <Field label="글자">
              {cur.k === 'note' ? (
                <textarea className="field" rows={3} value={cur.text ?? ''} maxLength={40} onChange={(e) => setSticker(pageIndex, cur.id, { text: e.target.value })} />
              ) : (
                <input className="field" value={cur.text ?? ''} maxLength={20} onChange={(e) => setSticker(pageIndex, cur.id, { text: e.target.value })} />
              )}
            </Field>
          )}
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn btn-sm" onClick={() => setStickers(pageIndex, (ss) => [...ss.filter((x) => x.id !== cur.id), cur])}>
              맨 앞으로
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setStickers(pageIndex, (ss) => [cur, ...ss.filter((x) => x.id !== cur.id)])}>
              맨 뒤로
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={page.stickers.length >= LIMITS.stickers}
              onClick={() => {
                const ns = { ...cur, id: uid(), x: cur.x + 4, y: cur.y + 3 }
                setStickers(pageIndex, (ss) => [...ss, ns])
                setSid(ns.id)
              }}
            >
              복제
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setStickers(pageIndex, (ss) => ss.filter((x) => x.id !== cur.id))
                setSid(null)
              }}
            >
              떼기
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const panel = (
    <div className="min-w-0">
      <div className="mb-4 grid grid-cols-4 border border-rule" role="tablist" aria-label="꾸미기 메뉴">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('py-2 text-[14px]', tab === k ? 'bg-seal font-bold text-ink' : 'hover:bg-muted')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'doc' && docTab}
      {tab === 'page' && pageTab}
      {tab === 'block' && blockTab}
      {tab === 'sticker' && stickerTab}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-rule pt-4 text-[13px]">
        <span className={cx('font-mono', over ? 'text-destructive' : 'text-muted-foreground')}>용량 {Math.round((bytes / PROFILE_DOC_BYTES) * 100)}%</span>
        <span className="ml-auto" />
        <button type="button" className="btn btn-sm" onClick={async () => flash((await copyText(JSON.stringify(latest.current))) ? '코드를 복사했습니다' : '복사하지 못했습니다')}>
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
              if (!confirm('문서를 전부 비울까요?')) return
              commit({ ...emptyDoc(), ...themeDefaults(latest.current.theme) })
              setPi(0)
              setBid(null)
              setSid(null)
            }}
          >
            비우기
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-[13px] text-muted-foreground">{msg}</p>}
      {over && <p className="mt-2 text-[13px] text-destructive">문서가 너무 깁니다. 페이지나 칸, 스티커를 줄여 주세요.</p>}
      {code !== null && (
        <div className="mt-3 space-y-2">
          <textarea className="field min-h-24 font-mono text-[12.5px]" value={code} aria-label="문서 코드" onChange={(e) => setCode(e.target.value)} placeholder="복사해 둔 코드를 붙여 넣으세요" />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              const p = parseProfileDoc(code)
              if (!p) return flash('코드를 읽지 못했습니다')
              commit(p)
              setCode(null)
              setPi(0)
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
      <p className="form-label">미리보기 · 칸이나 스티커를 눌러 고르고, 스티커는 끌어서 옮깁니다</p>
      <ProfileDocView doc={d} edit={hooks} />
    </div>
  )

  // ── 따로 여는 꾸미기 창 (문서 편집기 모양: 메뉴 · 되돌리기 · 확대 · 페이지 목록 · 편집 패널)
  if (studio) {
    const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5]
    const zi = Math.max(0, ZOOMS.findIndex((z) => z >= zoom - 0.001))
    const blocksFull = !page || page.blocks.length >= LIMITS.blocks
    // 메뉴는 화면 밖으로 나가지 않게 버튼 위치를 재서 띄운다
    const menu = (label: string, body: ReactNode, wide = false) => {
      const w = wide ? 300 : 230
      const open = menuOpen?.key === label
      return (
        <div data-menu className="shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            className={cx('px-2.5 py-2 hover:bg-muted', open && 'bg-muted font-bold text-seal')}
            onClick={(e) => {
              if (open) return setMenuOpen(null)
              const r = e.currentTarget.getBoundingClientRect()
              setMenuOpen({ key: label, x: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), y: r.bottom + 2 })
            }}
          >
            {label}
          </button>
          {open && menuOpen && (
            <div
              role="menu"
              className="fixed z-[75] max-h-[70dvh] overflow-y-auto border border-rule bg-card p-1 shadow-2xl"
              style={{ left: menuOpen.x, top: menuOpen.y, width: w }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) setMenuOpen(null)
              }}
            >
              {body}
            </div>
          )}
        </div>
      )
    }
    const item = (label: ReactNode, onClick: () => void, disabled = false, key?: string) => (
      <button key={key} type="button" disabled={disabled} onClick={onClick} className="block w-full px-3 py-1.5 text-left text-[13.5px] hover:bg-muted disabled:opacity-40">
        {label}
      </button>
    )
    const goPage = (i: number) => {
      setPi(i)
      canvasRef.current?.querySelector(`[data-page="${i + 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const addBlock = (t: BlockType) => {
      if (blocksFull) return
      const nb = newBlock(t)
      setBlocks(pageIndex, (bs) => [...bs, nb])
      setBid(nb.id)
      setTab('block')
    }
    const addSticker = (k: StickerKey) => {
      if (!page || page.stickers.length >= LIMITS.stickers) return
      const ns = { ...newSticker(k), x: 30 + Math.random() * 40, y: 20 + Math.random() * 30 }
      setStickers(pageIndex, (ss) => [...ss, ns])
      setSid(ns.id)
      setTab('sticker')
    }
    const addPage = (make: (n: string) => Page) => {
      if (latest.current.pages.length >= LIMITS.pages) return
      setPages((ps) => [...ps, make(name)])
      const i = latest.current.pages.length - 1
      setPi(i)
      window.setTimeout(() => goPage(i), 80)
    }

    return (
      <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-background text-foreground">
        <header className="flex items-center gap-2 border-b border-rule bg-card px-2 py-1.5 sm:gap-3 sm:px-4">
          {studio.back}
          <span className="hidden h-8 w-8 shrink-0 place-items-center bg-seal text-ink sm:grid" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path d="M3 1.5h7l3 3v10H3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight">{studio.title}</p>
            <p className={cx('truncate text-[12px] leading-tight', over ? 'text-destructive' : 'text-muted-foreground')}>{over ? '문서가 너무 깁니다. 칸이나 페이지를 줄여 주세요.' : studio.status}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" className="btn btn-sm px-2.5 text-[16px]" onClick={undo} disabled={!hist.current.past.length} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기">
              ↶
            </button>
            <button type="button" className="btn btn-sm px-2.5 text-[16px]" onClick={redo} disabled={!hist.current.future.length} title="다시 실행 (Ctrl+Y)" aria-label="다시 실행">
              ↷
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{studio.actions}</div>
        </header>

        <div className="flex flex-wrap items-center gap-x-0.5 border-b border-rule bg-card px-1.5 text-[13.5px] sm:px-3" aria-label="꾸미기 메뉴">
          {menu(
            '파일',
            <>
              {item('예시 문서에서 고르기…', () => setGallery(true))}
              {item('기본 틀로 새로 시작', () => {
                if (!isEmptyDoc(latest.current) && !confirm('지금 문서를 기본 틀로 바꿀까요? 되돌리기로 돌아올 수 있습니다.')) return
                commit(starterDoc(name, latest.current))
                setPi(0)
              })}
              <hr className="my-1 border-rule" />
              {item('코드 복사', async () => flash((await copyText(JSON.stringify(latest.current))) ? '코드를 복사했습니다' : '복사하지 못했습니다'))}
              {item('코드 불러오기…', () => {
                setCode('')
                setSheet(true)
              })}
              <hr className="my-1 border-rule" />
              {item(
                '전부 비우기',
                () => {
                  if (!confirm('문서를 전부 비울까요? 되돌리기로 돌아올 수 있습니다.')) return
                  commit({ ...emptyDoc(), ...themeDefaults(latest.current.theme) })
                  setPi(0)
                  setBid(null)
                  setSid(null)
                },
                isEmptyDoc(d),
              )}
            </>,
          )}
          {menu(
            '삽입',
            <>
              {BLOCK_GROUPS.map((g) => (
                <div key={g}>
                  <p className="px-3 pb-0.5 pt-2 text-[11px] font-bold text-muted-foreground">{g}</p>
                  {BLOCK_TYPES.filter((x) => x.group === g).map((x) => item(x.label, () => addBlock(x.t), blocksFull, x.t))}
                </div>
              ))}
            </>,
          )}
          {menu(
            '페이지',
            <>
              {PAGE_TEMPLATES.map((t) => item(`새 페이지 · ${t.label}`, () => addPage(t.make), d.pages.length >= LIMITS.pages, t.key))}
              <hr className="my-1 border-rule" />
              {item(
                `${pageIndex + 1}쪽 복제`,
                () => {
                  if (!page) return
                  const copy: Page = { ...page, id: uid(), blocks: page.blocks.map((b) => ({ ...b, id: uid() })), stickers: page.stickers.map((s) => ({ ...s, id: uid() })) }
                  setPages((ps) => [...ps.slice(0, pageIndex + 1), copy, ...ps.slice(pageIndex + 1)])
                  setPi(pageIndex + 1)
                },
                d.pages.length >= LIMITS.pages,
              )}
              {item(`${pageIndex + 1}쪽 앞으로`, () => (setPages((ps) => move(ps, pageIndex, -1)), setPi(pageIndex - 1)), pageIndex === 0)}
              {item(`${pageIndex + 1}쪽 뒤로`, () => (setPages((ps) => move(ps, pageIndex, 1)), setPi(pageIndex + 1)), pageIndex === d.pages.length - 1)}
              {item(
                `${pageIndex + 1}쪽 지우기`,
                () => {
                  if (!confirm(`${pageIndex + 1}쪽을 지울까요?`)) return
                  setPages((ps) => ps.filter((_, j) => j !== pageIndex))
                  setPi(Math.max(0, pageIndex - 1))
                },
                d.pages.length <= 1,
              )}
              <hr className="my-1 border-rule" />
              {item('배경 이미지 · 여백 · 질감…', () => {
                setTab('page')
                setSheet(true)
              })}
            </>,
          )}
          {menu(
            '스티커',
            <div className="grid grid-cols-4 gap-1 p-1">
              {STICKERS.map((x) => (
                <button key={x.k} type="button" className="flex flex-col items-center gap-0.5 border border-rule p-1 hover:border-seal disabled:opacity-40" disabled={!page || page.stickers.length >= LIMITS.stickers} onClick={() => addSticker(x.k)}>
                  <span className="block w-8">
                    <StickerArt k={x.k} color={d.accent} text={x.text} />
                  </span>
                  <span className="text-[10.5px] leading-tight">{x.label}</span>
                </button>
              ))}
            </div>,
            true,
          )}
          {menu(
            '서식',
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-muted-foreground">테마</p>
              <div className="grid grid-cols-2 gap-1 px-1">
                {THEMES.map((t) => (
                  <button key={t.key} type="button" onClick={() => set(themeDefaults(t.key as ThemeKey))} className={cx('flex items-center gap-2 border px-2 py-1 text-left text-[12.5px]', d.theme === t.key ? 'border-seal' : 'border-rule hover:border-foreground')}>
                    <span className="h-4 w-4 shrink-0 border border-rule" style={{ background: `linear-gradient(135deg, ${t.bg} 55%, ${t.accent} 55%)` }} />
                    {t.label}
                  </button>
                ))}
              </div>
              <hr className="my-2 border-rule" />
              {item('글꼴 · 질감 · 페이지 비율…', () => {
                setTab('doc')
                setSheet(true)
              })}
            </>,
            true,
          )}
          <span className="mx-1.5 hidden h-5 w-px bg-rule sm:block" aria-hidden="true" />
          <div className="hidden items-center gap-1 py-1 sm:flex" role="group" aria-label="포인트 색">
            {ACCENTS.map((c) => (
              <button key={c} type="button" onClick={() => set({ accent: c })} aria-label={`포인트 색 ${c}`} aria-pressed={d.accent === c} className={cx('h-5 w-5 border', d.accent === c ? 'border-seal ring-2 ring-seal/60' : 'border-rule')} style={{ background: c }} />
            ))}
          </div>
          <span className="ml-auto" />
          <div className="flex items-center gap-0.5 py-1" role="group" aria-label="확대">
            <button type="button" className="px-2 py-1 hover:bg-muted disabled:opacity-30" disabled={zi <= 0} onClick={() => setZoom(ZOOMS[Math.max(0, zi - 1)])} aria-label="축소">
              −
            </button>
            <button type="button" className="w-14 py-1 text-center font-mono text-[12.5px] hover:bg-muted" onClick={() => setZoom(1)} title="100%로">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="px-2 py-1 hover:bg-muted disabled:opacity-30" disabled={zi >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zi + 1)])} aria-label="확대">
              +
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[150px] shrink-0 overflow-y-auto border-r border-rule bg-card/50 p-3 lg:block" aria-label="페이지 목록">
            <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
              페이지 {d.pages.length}/{LIMITS.pages}
            </p>
            {d.pages.map((p, i) => (
              <button key={p.id} type="button" onClick={() => goPage(i)} className="group mb-3 block w-full text-left" aria-current={i === pageIndex ? 'page' : undefined}>
                <span className={cx('block max-h-[178px] overflow-hidden border-2', i === pageIndex ? 'border-seal' : 'border-transparent group-hover:border-rule')}>
                  <DocThumb doc={{ ...d, pages: [p] }} width={118} />
                </span>
                <span className={cx('mt-1 block text-center font-mono text-[11px]', i === pageIndex ? 'text-seal' : 'text-muted-foreground')}>{i + 1}</span>
              </button>
            ))}
            {d.pages.length < LIMITS.pages && (
              <button type="button" className="block w-full border border-dashed border-rule py-6 text-center text-[12px] text-muted-foreground hover:border-seal hover:text-seal" onClick={() => addPage(PAGE_TEMPLATES[0].make)}>
                + 빈 페이지
              </button>
            )}
          </aside>

          <main ref={canvasRef} className={cx('min-w-0 flex-1 overflow-y-auto bg-[#252521] px-3 py-5 sm:px-8 sm:py-8', sheet ? 'hidden md:block' : 'block')}>
            <div className="mx-auto" style={{ width: `min(100%, ${Math.round(760 * zoom)}px)` }}>
              <ProfileDocView doc={d} edit={hooks} />
            </div>
            <p className="mx-auto mt-6 max-w-md text-center text-[12px] text-[#8d8a80]">칸을 누르면 편집 패널에서 고칠 수 있고, 스티커는 끌어서 옮깁니다. Ctrl+Z 되돌리기 · Ctrl+Y 다시 실행</p>
          </main>

          <aside className={cx('min-h-0 w-full shrink-0 overflow-y-auto border-l border-rule bg-card p-4 md:block md:w-[380px] xl:w-[420px]', sheet ? 'block' : 'hidden')} aria-label="편집 패널">
            {panel}
          </aside>
        </div>

        <div className="grid grid-cols-2 border-t border-rule bg-card md:hidden">
          <button type="button" className={cx('py-3 text-[14px]', !sheet && 'bg-seal font-bold text-ink')} onClick={() => setSheet(false)}>
            미리보기 · {pageIndex + 1}/{d.pages.length}쪽
          </button>
          <button type="button" className={cx('py-3 text-[14px]', sheet && 'bg-seal font-bold text-ink')} onClick={() => setSheet(true)}>
            편집 패널
          </button>
        </div>

        {msg && (
          <p className="pointer-events-none fixed bottom-16 left-1/2 z-[80] -translate-x-1/2 border border-seal bg-card px-4 py-2 text-[13px] shadow-xl md:bottom-6" role="status">
            {msg}
          </p>
        )}

        {gallery && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="예시 문서" onClick={(e) => e.target === e.currentTarget && setGallery(false)}>
            <div className="max-h-[90dvh] w-full max-w-5xl overflow-y-auto border border-rule bg-card p-4 sm:p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[20px] font-black">예시 문서에서 시작</p>
                <button type="button" className="btn btn-sm" onClick={() => setGallery(false)}>
                  닫기
                </button>
              </div>
              <p className="mb-5 text-[13.5px] text-muted-foreground">고르면 지금 문서가 예시로 바뀝니다. 이름 칸에는 캐릭터 이름이 들어가요. 마음에 안 들면 되돌리기로 돌아올 수 있습니다.</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {PROFILE_EXAMPLES.map((ex) => {
                  const sample = ex.make(name)
                  return (
                    <button
                      key={ex.key}
                      type="button"
                      className="group text-left"
                      onClick={() => {
                        commit(ex.make(name))
                        setPi(0)
                        setBid(null)
                        setSid(null)
                        setGallery(false)
                      }}
                    >
                      <span className="flex justify-center overflow-hidden border border-rule bg-muted group-hover:border-seal">
                        <DocThumb doc={{ ...sample, pages: [sample.pages[0]] }} width={180} maxHeight={240} />
                      </span>
                      <b className="mt-1.5 block text-[14px] group-hover:text-seal">{ex.label}</b>
                      <span className="block text-[12px] leading-snug text-muted-foreground">
                        {ex.desc} · {sample.pages.length}쪽
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return stacked ? (
    <div className="space-y-8">
      {panel}
      {preview}
    </div>
  ) : (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:items-start">
      {panel}
      <div className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">{preview}</div>
    </div>
  )
}
