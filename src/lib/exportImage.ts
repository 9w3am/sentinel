import { toPng } from 'html-to-image'

// ─────────────────────────────────────────────
// PNG 저장.
// html-to-image 가 스스로 웹폰트를 넣게 두면 Google Fonts 의 한글 글꼴 조각
// (수백 개, 수 MB)을 전부 내려받아 사실상 멈춘다. 그래서 요소 안에 실제로 쓰인
// 글자가 들어 있는 @font-face 조각만 골라 직접 data URL 로 넣는다.
// ─────────────────────────────────────────────

interface Face {
  css: string
  url: string
  ranges: [number, number][]
}

let facesPromise: Promise<Face[]> | null = null
const fontDataCache = new Map<string, Promise<string>>()

function parseRanges(value: string): [number, number][] {
  return value.split(',').map((part) => {
    const p = part.trim().replace(/^U\+/i, '')
    if (p.includes('-')) {
      const [a, b] = p.split('-')
      return [parseInt(a, 16), parseInt(b, 16)] as [number, number]
    }
    if (p.includes('?')) return [parseInt(p.replace(/\?/g, '0'), 16), parseInt(p.replace(/\?/g, 'F'), 16)] as [number, number]
    const n = parseInt(p, 16)
    return [n, n] as [number, number]
  })
}

async function loadFaces(): Promise<Face[]> {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]')]
  const faces: Face[] = []
  for (const link of links) {
    const css = await fetch(link.href).then((r) => r.text())
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const url = block.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, '')
      if (!url) continue
      const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]
      faces.push({ css: block, url, ranges: range ? parseRanges(range) : [[0, 0x10ffff]] })
    }
  }
  return faces
}

function toDataUrl(url: string) {
  let p = fontDataCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`font ${r.status}`)
        return r.blob()
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const fr = new FileReader()
            fr.onload = () => resolve(String(fr.result))
            fr.onerror = reject
            fr.readAsDataURL(blob)
          }),
      )
    fontDataCache.set(url, p)
  }
  return p
}

async function buildFontCss(node: HTMLElement): Promise<string> {
  facesPromise ??= loadFaces()
  const faces = await facesPromise
  const used = new Set<number>()
  for (const ch of node.innerText) used.add(ch.codePointAt(0)!)
  const needed = faces.filter((f) => f.ranges.some(([a, b]) => [...used].some((c) => c >= a && c <= b)))
  const parts = await Promise.all(needed.map(async (f) => f.css.replace(f.url, await toDataUrl(f.url))))
  return parts.join('\n')
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

/** 화면의 한 요소를 PNG 로 저장한다. data-export-hide 가 붙은 요소는 빠진다. */
export async function saveElementAsPng(node: HTMLElement, fileName: string) {
  await document.fonts?.ready
  let fontEmbedCSS: string | undefined
  try {
    fontEmbedCSS = await withTimeout(buildFontCss(node), 15000)
  } catch {
    fontEmbedCSS = undefined // 글꼴을 못 받으면 기본 글꼴로라도 저장한다
  }
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#0f0f0d',
    cacheBust: true,
    filter: (el) => !(el instanceof HTMLElement && el.dataset.exportHide !== undefined),
    ...(fontEmbedCSS !== undefined ? { fontEmbedCSS } : { skipFonts: true }),
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${fileName.replace(/[\\/:*?"<>|]+/g, '_')}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  return dataUrl
}
