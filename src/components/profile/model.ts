// ─────────────────────────────────────────────
// 프로필 문서 v2: 표지·속지 여러 장 + 테마 + 칸 + 스티커.
// 등록증은 details.profile_doc, 신청서는 answers.doc 에 JSON 문자열로 넣는다.
// v1(스킨 4종 한 장짜리) 문서는 parseProfileDoc 에서 v2 로 바꿔 읽는다.
// ─────────────────────────────────────────────

export type ThemeKey = 'record' | 'status' | 'alert' | 'classified' | 'scrap' | 'ink' | 'petal' | 'sky' | 'night' | 'film' | 'news' | 'poster'
export type FontKey = 'sans' | 'serif' | 'soft' | 'display' | 'dohyeon' | 'round' | 'pen' | 'brush' | 'mono' | 'digital' | 'script' | 'italic'
export type TextureKey = 'none' | 'paper' | 'noise' | 'grid' | 'dots' | 'lines' | 'halftone' | 'stars' | 'scan' | 'hazard'
export type StickerKey = 'tape' | 'stripe' | 'clip' | 'pin' | 'sparkle' | 'star' | 'heart' | 'ribbon' | 'flower' | 'stamp' | 'label' | 'note' | 'barcode' | 'hazard' | 'circle' | 'arrow' | 'crack' | 'sentinel' | 'guide' | 'bandage' | 'stain'
export type BlockType = 'title' | 'banner' | 'heading' | 'text' | 'quote' | 'speech' | 'window' | 'info' | 'tags' | 'check' | 'gauge' | 'likes' | 'relation' | 'timeline' | 'player' | 'image' | 'collage' | 'divider' | 'spacer'
export type BoxKey = 'none' | 'card' | 'line' | 'tape' | 'glass' | 'ink'
export type Align = 'left' | 'center' | 'right'
export type SizeKey = 's' | 'm' | 'l' | 'xl'
export type ToneKey = 'ink' | 'accent' | 'muted'
export type WidthKey = 'full' | 'wide' | 'narrow'
export type BgArea = 'full' | 'top' | 'side'
export type BgFilter = 'none' | 'mono' | 'sepia' | 'duo' | 'soft'
export type Ratio = 'doc' | 'square' | 'free'

export interface BStyle {
  box?: BoxKey
  align?: Align
  size?: SizeKey
  tone?: ToneKey
  font?: FontKey | ''
  tilt?: number
  width?: WidthKey
}
export interface PBlock {
  id: string
  t: BlockType
  variant?: string
  text?: string
  text2?: string
  rows?: string[][]
  urls?: string[]
  num?: number
  style?: BStyle
}
export interface Sticker {
  id: string
  k: StickerKey
  x: number
  y: number
  s: number
  r: number
  o: number
  c?: string
  text?: string
}
export interface PageBg {
  url: string
  area: BgArea
  filter: BgFilter
  dim: number
  pos: 'top' | 'center' | 'bottom'
}
export interface Page {
  id: string
  bg: PageBg
  texture: TextureKey | 'theme'
  pad: 's' | 'm' | 'l'
  blocks: PBlock[]
  stickers: Sticker[]
}
export interface ProfileDoc {
  v: 2
  theme: ThemeKey
  accent: string
  fontTitle: FontKey
  fontBody: FontKey
  texture: TextureKey
  textureOp: number
  ratio: Ratio
  pages: Page[]
}

/** 신청서 전체가 30KB 안에 들어가도록 문서 크기를 묶는다 */
export const PROFILE_DOC_BYTES = 22000
export const LIMITS = { pages: 8, blocks: 60, stickers: 40, rows: 40 }

export interface ThemeDef {
  key: ThemeKey
  label: string
  desc: string
  bg: string
  fg: string
  accent: string
  fontTitle: FontKey
  fontBody: FontKey
  texture: TextureKey
  textureOp: number
}
export const THEMES: ThemeDef[] = [
  { key: 'record', label: '기록부', desc: '검정 · 서류 칸', bg: '#171714', fg: '#e8e5dc', accent: '#f0c419', fontTitle: 'display', fontBody: 'sans', texture: 'noise', textureOp: 35 },
  { key: 'status', label: '상태창', desc: '현판 시스템 창', bg: '#0b1220', fg: '#dfe9ff', accent: '#5ab8ff', fontTitle: 'digital', fontBody: 'sans', texture: 'scan', textureOp: 60 },
  { key: 'alert', label: '경보', desc: '경고 띠 · 강한 노랑', bg: '#111110', fg: '#f3f0e6', accent: '#f0c419', fontTitle: 'display', fontBody: 'sans', texture: 'hazard', textureOp: 100 },
  { key: 'classified', label: '기밀 파일', desc: '서류철 · 도장', bg: '#e8dcc0', fg: '#2b2418', accent: '#b3321d', fontTitle: 'mono', fontBody: 'mono', texture: 'paper', textureOp: 55 },
  { key: 'scrap', label: '스크랩', desc: '종이 · 테이프', bg: '#f3efe6', fg: '#2a2722', accent: '#e07fa6', fontTitle: 'pen', fontBody: 'sans', texture: 'dots', textureOp: 60 },
  { key: 'ink', label: '먹 번짐', desc: '흑백 · 거친 붓', bg: '#f1efea', fg: '#161514', accent: '#161514', fontTitle: 'brush', fontBody: 'soft', texture: 'paper', textureOp: 60 },
  { key: 'petal', label: '꽃잎', desc: '연분홍 · 흐린 빛', bg: '#fbf1f3', fg: '#4a2f37', accent: '#e58aa5', fontTitle: 'script', fontBody: 'soft', texture: 'none', textureOp: 40 },
  { key: 'sky', label: '하늘', desc: '하늘색 · 구름', bg: '#e8f2fc', fg: '#1f3350', accent: '#4f7fe0', fontTitle: 'italic', fontBody: 'sans', texture: 'none', textureOp: 40 },
  { key: 'night', label: '밤하늘', desc: '남색 · 별 · 달', bg: '#10172b', fg: '#e6e9f2', accent: '#9b8cf0', fontTitle: 'serif', fontBody: 'sans', texture: 'stars', textureOp: 70 },
  { key: 'film', label: '필름', desc: '필름 테두리 · 갈색', bg: '#1b1613', fg: '#efe6d8', accent: '#e8892a', fontTitle: 'italic', fontBody: 'serif', texture: 'noise', textureOp: 45 },
  { key: 'news', label: '신문', desc: '신문지 · 망점', bg: '#ecebe4', fg: '#1b1b1a', accent: '#1b1b1a', fontTitle: 'serif', fontBody: 'serif', texture: 'halftone', textureOp: 45 },
  { key: 'poster', label: '포스터', desc: '큰 제목 · 강한 대비', bg: '#0b0b0b', fg: '#f5f5f0', accent: '#d8432c', fontTitle: 'display', fontBody: 'sans', texture: 'none', textureOp: 40 },
]

export const FONTS: { key: FontKey; label: string; css: string }[] = [
  { key: 'sans', label: '고딕', css: '"Noto Sans KR", sans-serif' },
  { key: 'serif', label: '명조', css: '"Noto Serif KR", serif' },
  { key: 'soft', label: '부드러운 명조', css: '"Gowun Batang", "Noto Serif KR", serif' },
  { key: 'display', label: '굵은 제목', css: '"Black Han Sans", "Noto Sans KR", sans-serif' },
  { key: 'dohyeon', label: '각진 제목', css: '"Do Hyeon", "Noto Sans KR", sans-serif' },
  { key: 'round', label: '둥근', css: '"Jua", "Noto Sans KR", sans-serif' },
  { key: 'pen', label: '손글씨', css: '"Nanum Pen Script", "Noto Sans KR", cursive' },
  { key: 'brush', label: '붓', css: '"East Sea Dokdo", "Noto Serif KR", cursive' },
  { key: 'mono', label: '타자기', css: '"IBM Plex Mono", "Noto Sans KR", monospace' },
  { key: 'digital', label: '디지털', css: '"Orbit", "IBM Plex Mono", "Noto Sans KR", sans-serif' },
  { key: 'script', label: '영문 필기', css: '"Pinyon Script", "Nanum Pen Script", cursive' },
  { key: 'italic', label: '영문 기울임', css: '"Cormorant Garamond", "Noto Serif KR", serif' },
]
export const PROFILE_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=East+Sea+Dokdo&family=Gowun+Batang:wght@400;700&family=Jua&family=Nanum+Pen+Script&family=Orbit&family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@1,500;1,700&display=swap'

export const TEXTURES: { key: TextureKey; label: string }[] = [
  { key: 'none', label: '없음' },
  { key: 'paper', label: '종이 결' },
  { key: 'noise', label: '거친 입자' },
  { key: 'grid', label: '모눈' },
  { key: 'dots', label: '점 무늬' },
  { key: 'lines', label: '줄 공책' },
  { key: 'halftone', label: '망점' },
  { key: 'stars', label: '별' },
  { key: 'scan', label: '화면 주사선' },
  { key: 'hazard', label: '경고 띠' },
]

export const STICKERS: { k: StickerKey; label: string; size: number; text?: string; color: boolean }[] = [
  { k: 'tape', label: '마스킹테이프', size: 24, color: true },
  { k: 'stripe', label: '줄무늬 테이프', size: 24, color: true },
  { k: 'clip', label: '클립', size: 7, color: true },
  { k: 'pin', label: '압정', size: 6, color: true },
  { k: 'sparkle', label: '반짝', size: 7, color: true },
  { k: 'star', label: '별', size: 7, color: true },
  { k: 'heart', label: '하트', size: 7, color: true },
  { k: 'ribbon', label: '리본', size: 12, color: true },
  { k: 'flower', label: '꽃', size: 9, color: true },
  { k: 'stamp', label: '도장', size: 18, text: '확인', color: true },
  { k: 'label', label: '라벨', size: 24, text: 'FILE No.07', color: true },
  { k: 'note', label: '메모지', size: 18, text: '메모', color: true },
  { k: 'barcode', label: '바코드', size: 18, color: false },
  { k: 'hazard', label: '경고 띠', size: 50, color: false },
  { k: 'circle', label: '동그라미 낙서', size: 18, color: true },
  { k: 'arrow', label: '화살표 낙서', size: 14, color: true },
  { k: 'crack', label: '균열', size: 8, color: true },
  { k: 'sentinel', label: '센티넬 마크', size: 7, color: true },
  { k: 'guide', label: '가이드 마크', size: 7, color: true },
  { k: 'bandage', label: '반창고', size: 14, color: false },
  { k: 'stain', label: '커피 자국', size: 18, color: false },
]

export const BLOCK_GROUPS = ['제목', '글', '정보', '이미지', '기타'] as const
export const BLOCK_TYPES: { t: BlockType; label: string; group: (typeof BLOCK_GROUPS)[number] }[] = [
  { t: 'title', label: '큰 제목', group: '제목' },
  { t: 'banner', label: '문구 띠', group: '제목' },
  { t: 'heading', label: '소제목', group: '제목' },
  { t: 'text', label: '글', group: '글' },
  { t: 'quote', label: '한마디', group: '글' },
  { t: 'speech', label: '대사', group: '글' },
  { t: 'window', label: '상태창', group: '글' },
  { t: 'info', label: '정보표', group: '정보' },
  { t: 'tags', label: '키워드', group: '정보' },
  { t: 'gauge', label: '수치', group: '정보' },
  { t: 'likes', label: '호불호', group: '정보' },
  { t: 'relation', label: '관계', group: '정보' },
  { t: 'timeline', label: '연표', group: '정보' },
  { t: 'check', label: '주의표', group: '정보' },
  { t: 'player', label: '음악', group: '정보' },
  { t: 'image', label: '이미지', group: '이미지' },
  { t: 'collage', label: '콜라주', group: '이미지' },
  { t: 'divider', label: '구분선', group: '기타' },
  { t: 'spacer', label: '여백', group: '기타' },
]

export const VARIANTS: Record<BlockType, [string, string][]> = {
  title: [['stack', '기본'], ['script', '필기체 겹침'], ['vertical', '세로쓰기'], ['outline', '외곽선'], ['spaced', '자간 넓게'], ['block', '색 블록']],
  banner: [['strip', '띠'], ['skew', '기울인 띠'], ['ribbon', '리본'], ['double', '겹선']],
  heading: [['bar', '막대'], ['number', '번호'], ['center', '가운데'], ['tab', '탭']],
  text: [['plain', '기본']],
  quote: [['box', '상자'], ['big', '큰 따옴표'], ['plain', '담백']],
  speech: [['bubble', '말풍선'], ['caption', '자막'], ['chat', '메신저']],
  window: [['system', '시스템 창'], ['alert', '경고 창']],
  info: [['table', '표'], ['grid', '칸'], ['inline', '한 줄']],
  tags: [['chip', '칩'], ['hash', '해시태그'], ['plain', '가운뎃점']],
  check: [['list', '목록'], ['grid', '두 줄']],
  gauge: [['bar', '막대'], ['segment', '칸'], ['number', '숫자']],
  likes: [['two', '두 칸']],
  relation: [['card', '카드'], ['list', '목록']],
  timeline: [['line', '세로선'], ['table', '표']],
  player: [['bar', '재생 바'], ['vinyl', '레코드'], ['mini', '한 줄']],
  image: [['plain', '그대로'], ['polaroid', '폴라로이드'], ['circle', '동그랗게'], ['arch', '아치'], ['frame', '액자']],
  collage: [['stack', '겹치기'], ['row', '나란히'], ['film', '필름']],
  divider: [['line', '선'], ['dots', '점'], ['wave', '물결'], ['star', '별'], ['tape', '테이프']],
  spacer: [['plain', '기본']],
}

export const ACCENTS = ['#f0c419', '#e8892a', '#d8432c', '#e58aa5', '#9b8cf0', '#5ab8ff', '#6cc3a6', '#c9c4b8', '#161514', '#ffffff']

export const uid = () => Math.random().toString(36).slice(2, 10)
export const isUrl = (s?: string) => !!s && /^https?:\/\/\S+$/i.test(s.trim())
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
export const labelOf = (t: BlockType) => BLOCK_TYPES.find((x) => x.t === t)?.label ?? t
export const fontCss = (k?: string) => FONTS.find((f) => f.key === k)?.css
/** 포인트 색 위에 올릴 글자색 */
export function readableOn(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  if (!Number.isFinite(n)) return '#111110'
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111110' : '#ffffff'
}
export const isDark = (hex: string) => readableOn(hex) === '#ffffff'

export function newBlock(t: BlockType): PBlock {
  const b: PBlock = { id: uid(), t, variant: VARIANTS[t][0][0] }
  switch (t) {
    case 'info':
      b.rows = [['', '']]
      break
    case 'check':
      b.rows = [['', '○']]
      break
    case 'gauge':
      b.rows = [['폭주 수치', '40']]
      break
    case 'relation':
      b.rows = [['', '', '', '']]
      break
    case 'timeline':
      b.rows = [['', '']]
      break
    case 'collage':
      b.urls = ['', '', '']
      break
    case 'image':
      b.urls = ['']
      b.text = ''
      break
    case 'player':
      b.text = ''
      b.text2 = ''
      b.num = 35
      break
    case 'spacer':
      b.num = 40
      break
    case 'divider':
      break
    default:
      b.text = ''
      b.text2 = ''
  }
  if (t === 'title' || t === 'banner' || t === 'divider') b.style = { align: 'center' }
  return b
}

export function newSticker(k: StickerKey): Sticker {
  const def = STICKERS.find((s) => s.k === k)!
  return { id: uid(), k, x: 50, y: 30, s: def.size, r: 0, o: 100, text: def.text }
}

export const emptyPage = (): Page => ({ id: uid(), bg: { url: '', area: 'full', filter: 'none', dim: 0, pos: 'center' }, texture: 'theme', pad: 'm', blocks: [], stickers: [] })

export function themeDefaults(key: ThemeKey): Pick<ProfileDoc, 'theme' | 'accent' | 'fontTitle' | 'fontBody' | 'texture' | 'textureOp'> {
  const t = THEMES.find((x) => x.key === key) ?? THEMES[0]
  return { theme: t.key, accent: t.accent, fontTitle: t.fontTitle, fontBody: t.fontBody, texture: t.texture, textureOp: t.textureOp }
}

export const emptyDoc = (): ProfileDoc => ({ v: 2, ...themeDefaults('record'), ratio: 'doc', pages: [emptyPage()] })

const mk = (t: BlockType, patch: Partial<PBlock> = {}): PBlock => ({ ...newBlock(t), ...patch })
const st = (k: StickerKey, patch: Partial<Sticker> = {}): Sticker => ({ ...newSticker(k), ...patch })

export const PAGE_TEMPLATES: { key: string; label: string; make: (name: string) => Page }[] = [
  { key: 'blank', label: '빈 페이지', make: () => emptyPage() },
  {
    key: 'cover',
    label: '표지',
    make: (name) => ({
      ...emptyPage(),
      pad: 'l',
      blocks: [mk('spacer', { num: 120 }), mk('title', { variant: 'script', text: name || '이름', text2: 'Profile' }), mk('banner', { text: '한 줄 캐치프레이즈', text2: 'catchphrase' }), mk('spacer', { num: 60 }), mk('quote', { variant: 'plain', text: '', style: { align: 'center' } })],
      stickers: [st('tape', { x: 14, y: 5, r: -28 }), st('tape', { x: 88, y: 96, r: -20 }), st('sparkle', { x: 84, y: 18, s: 6 }), st('sparkle', { x: 16, y: 72, s: 4, r: 20 })],
    }),
  },
  {
    key: 'info',
    label: '기본 정보',
    make: (name) => ({
      ...emptyPage(),
      blocks: [
        mk('heading', { text: '기본 정보' }),
        mk('info', { rows: [['이름', name], ['나이', ''], ['키', ''], ['구분 · 등급', ''], ['팀', '']] }),
        mk('heading', { text: '성격' }),
        mk('tags'),
        mk('text'),
        mk('heading', { text: '능력' }),
        mk('text'),
        mk('gauge', { rows: [['폭주 수치', '40'], ['매칭률', '70']] }),
      ],
      stickers: [],
    }),
  },
  {
    key: 'relation',
    label: '관계 · 연표',
    make: () => ({
      ...emptyPage(),
      blocks: [mk('heading', { text: '관계' }), mk('relation'), mk('heading', { text: '지나온 일' }), mk('timeline', { rows: [['', ''], ['', '']] }), mk('heading', { text: '좋아하는 것 · 싫어하는 것' }), mk('likes')],
      stickers: [],
    }),
  },
  {
    key: 'gallery',
    label: '이미지 · 음악',
    make: () => ({ ...emptyPage(), blocks: [mk('collage'), mk('player'), mk('speech')], stickers: [st('clip', { x: 12, y: 8, r: -12 })] }),
  },
  {
    key: 'caution',
    label: '러닝 주의',
    make: () => ({
      ...emptyPage(),
      blocks: [mk('heading', { text: '러닝 주의' }), mk('check', { rows: [['유혈 묘사', '△'], ['감정선', '○'], ['사망 소재', '✕']] }), mk('window', { text2: 'OWNER NOTE', text: '[알림] 편하게 말 걸어 주세요' })],
      stickers: [],
    }),
  },
]

export function starterDoc(name: string, base?: ProfileDoc): ProfileDoc {
  const d = base ?? emptyDoc()
  const by = (k: string) => PAGE_TEMPLATES.find((p) => p.key === k)!.make(name)
  return { ...d, pages: [by('cover'), by('info'), by('caution')] }
}

export function blockHasContent(b: PBlock) {
  if (b.t === 'divider' || b.t === 'spacer') return true
  if (b.t === 'player') return !!(b.text?.trim() || b.text2?.trim())
  if (b.t === 'gauge') return !!b.rows?.some(([k]) => k?.trim())
  return !!(b.text?.trim() || b.text2?.trim() || b.urls?.some((u) => isUrl(u)) || b.rows?.some((r) => r.some((c, i) => (b.t === 'check' && i === 1 ? false : c?.trim()))))
}
export const isEmptyDoc = (d: ProfileDoc) => d.pages.every((p) => !isUrl(p.bg.url) && p.stickers.length === 0 && !p.blocks.some((b) => b.t !== 'spacer' && b.t !== 'divider' && blockHasContent(b)))
export const docBytes = (d: ProfileDoc) => new TextEncoder().encode(JSON.stringify(d)).length

// ── 읽기 · 검사
/* eslint-disable @typescript-eslint/no-explicit-any */
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')
const numOf = (v: unknown, min: number, max: number, d: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? clamp(n, min, max) : d
}
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)
const urlOf = (v: unknown) => {
  const s = str(v, 1000).trim()
  return isUrl(s) ? s : ''
}
const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined)

const THEME_KEYS = THEMES.map((t) => t.key)
const FONT_KEYS = FONTS.map((f) => f.key)
const TEXTURE_KEYS = TEXTURES.map((t) => t.key)
const STICKER_KEYS = STICKERS.map((s) => s.k)
const BLOCK_KEYS = BLOCK_TYPES.map((b) => b.t)

function cleanBlock(b: any): PBlock | null {
  if (!b || !BLOCK_KEYS.includes(b.t)) return null
  const t = b.t as BlockType
  const s = b.style ?? {}
  return {
    id: str(b.id, 20) || uid(),
    t,
    variant: oneOf(b.variant, VARIANTS[t].map((v) => v[0]), VARIANTS[t][0][0]),
    text: str(b.text),
    text2: str(b.text2, 600),
    rows: Array.isArray(b.rows) ? b.rows.slice(0, LIMITS.rows).map((r: unknown) => (Array.isArray(r) ? r : []).slice(0, 4).map((c) => str(c, 600))) : undefined,
    urls: Array.isArray(b.urls) ? b.urls.slice(0, 3).map(urlOf) : undefined,
    num: b.num === undefined ? undefined : numOf(b.num, 0, 400, 0),
    style: {
      box: oneOf(s.box, ['none', 'card', 'line', 'tape', 'glass', 'ink'] as const, 'none'),
      align: oneOf(s.align, ['left', 'center', 'right'] as const, 'left'),
      size: oneOf(s.size, ['s', 'm', 'l', 'xl'] as const, 'm'),
      tone: oneOf(s.tone, ['ink', 'accent', 'muted'] as const, 'ink'),
      font: s.font ? oneOf(s.font, FONT_KEYS, 'sans') : '',
      tilt: numOf(s.tilt, -12, 12, 0),
      width: oneOf(s.width, ['full', 'wide', 'narrow'] as const, 'full'),
    },
  }
}

function cleanSticker(s: any): Sticker | null {
  if (!s || !STICKER_KEYS.includes(s.k)) return null
  return {
    id: str(s.id, 20) || uid(),
    k: s.k,
    x: numOf(s.x, -20, 120, 50),
    y: numOf(s.y, -20, 120, 30),
    s: numOf(s.s, 2, 100, 10),
    r: numOf(s.r, -180, 180, 0),
    o: numOf(s.o, 10, 100, 100),
    c: hex(s.c),
    text: s.text === undefined ? undefined : str(s.text, 40),
  }
}

function cleanPage(p: any): Page {
  const bg = p?.bg ?? {}
  return {
    id: str(p?.id, 20) || uid(),
    bg: {
      url: urlOf(bg.url),
      area: oneOf(bg.area, ['full', 'top', 'side'] as const, 'full'),
      filter: oneOf(bg.filter, ['none', 'mono', 'sepia', 'duo', 'soft'] as const, 'none'),
      dim: numOf(bg.dim, 0, 90, 0),
      pos: oneOf(bg.pos, ['top', 'center', 'bottom'] as const, 'center'),
    },
    texture: p?.texture === 'theme' ? 'theme' : oneOf(p?.texture, TEXTURE_KEYS, 'none'),
    pad: oneOf(p?.pad, ['s', 'm', 'l'] as const, 'm'),
    blocks: (Array.isArray(p?.blocks) ? p.blocks : []).slice(0, LIMITS.blocks).map(cleanBlock).filter(Boolean) as PBlock[],
    stickers: (Array.isArray(p?.stickers) ? p.stickers : []).slice(0, LIMITS.stickers).map(cleanSticker).filter(Boolean) as Sticker[],
  }
}

/** 예전 한 장짜리 문서를 새 형식으로 */
function fromV1(o: any): ProfileDoc {
  const theme = oneOf(o.skin, ['record', 'scrap', 'night', 'poster'] as const, 'record')
  const page = emptyPage()
  const image = urlOf(o.image)
  if (image) page.bg = { ...page.bg, url: image, area: theme === 'poster' ? 'top' : 'side' }
  page.blocks.push(mk('title', { variant: 'stack', text: str(o.title, 60), text2: str(o.subtitle, 120), style: { align: 'left' } }))
  for (const b of Array.isArray(o.blocks) ? o.blocks : []) {
    const align = oneOf(b?.align, ['left', 'center', 'right'] as const, 'left')
    if (b?.t === 'image') page.blocks.push(mk('image', { urls: [urlOf(b.url)], text: str(b.text, 80) }))
    else if (['heading', 'text', 'quote', 'tags', 'check', 'info', 'divider'].includes(b?.t)) {
      const nb = cleanBlock({ ...b, variant: undefined, style: { align } })
      if (nb) page.blocks.push(nb)
    }
  }
  return { v: 2, ...themeDefaults(theme), accent: hex(o.accent) ?? themeDefaults(theme).accent, ratio: 'free', pages: [page] }
}

export function parseProfileDoc(raw: unknown): ProfileDoc | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  let o: any
  try {
    o = JSON.parse(raw)
  } catch {
    return null
  }
  if (!o || typeof o !== 'object') return null
  if (o.v === 1 && Array.isArray(o.blocks)) return fromV1(o)
  if (o.v !== 2 || !Array.isArray(o.pages)) return null
  const theme = oneOf(o.theme, THEME_KEYS, 'record')
  const pages = o.pages.slice(0, LIMITS.pages).map(cleanPage)
  return {
    v: 2,
    theme,
    accent: hex(o.accent) ?? themeDefaults(theme).accent,
    fontTitle: oneOf(o.fontTitle, FONT_KEYS, themeDefaults(theme).fontTitle),
    fontBody: oneOf(o.fontBody, FONT_KEYS, themeDefaults(theme).fontBody),
    texture: oneOf(o.texture, TEXTURE_KEYS, 'none'),
    textureOp: numOf(o.textureOp, 0, 100, 40),
    ratio: oneOf(o.ratio, ['doc', 'square', 'free'] as const, 'doc'),
    pages: pages.length ? pages : [emptyPage()],
  }
}
