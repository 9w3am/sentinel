import { useId } from 'react'
import { readableOn, type StickerKey } from './model'

const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 1, 3, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 3]
const TAPE = '2,3 98,0 100,6 97,12 100,19 96,26 3,25 0,20 3,13 0,7'

/** 스티커 그림. 색은 넘겨받은 color(없으면 포인트 색)를 쓴다 */
export function StickerArt({ k, color, text }: { k: StickerKey; color: string; text?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  switch (k) {
    case 'tape':
      return (
        <svg viewBox="0 0 100 26" aria-hidden="true">
          <polygon points={TAPE} fill={color} opacity="0.6" />
          <g stroke="#fff" strokeWidth="0.8" opacity="0.22">
            <line x1="14" y1="3" x2="16" y2="24" />
            <line x1="46" y1="2" x2="48" y2="25" />
            <line x1="78" y1="1" x2="80" y2="25" />
          </g>
        </svg>
      )
    case 'stripe':
      return (
        <svg viewBox="0 0 100 26" aria-hidden="true">
          <defs>
            <pattern id={`p${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="3.5" height="7" fill={color} />
            </pattern>
          </defs>
          <polygon points={TAPE} fill="#fff" opacity="0.72" />
          <polygon points={TAPE} fill={`url(#p${id})`} opacity="0.7" />
        </svg>
      )
    case 'clip':
      return (
        <svg viewBox="0 0 30 80" aria-hidden="true">
          <path d="M9 66 V16 a7 7 0 0 1 14 0 V60 a11 11 0 0 1 -22 0 V12" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      )
    case 'pin':
      return (
        <svg viewBox="0 0 40 52" aria-hidden="true">
          <line x1="20" y1="28" x2="20" y2="50" stroke="#8a8a86" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="20" cy="17" r="13" fill={color} />
          <circle cx="15" cy="12" r="4" fill="#fff" opacity="0.45" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" fill={color} />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="50,2 61,37 98,37 68,59 79,95 50,73 21,95 32,59 2,37 39,37" fill={color} />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 100 94" aria-hidden="true">
          <path d="M50 90 C20 68 4 50 4 30 C4 14 16 4 30 4 C40 4 47 10 50 18 C53 10 60 4 70 4 C84 4 96 14 96 30 C96 50 80 68 50 90Z" fill={color} />
        </svg>
      )
    case 'ribbon':
      return (
        <svg viewBox="0 0 120 92" aria-hidden="true">
          <path d="M60 38 C40 8 8 8 12 30 C15 50 42 48 60 42Z" fill={color} />
          <path d="M60 38 C80 8 112 8 108 30 C105 50 78 48 60 42Z" fill={color} />
          <path d="M56 44 L36 86 L48 80 L54 90 L62 46Z" fill={color} />
          <path d="M64 44 L84 86 L72 80 L66 90 L58 46Z" fill={color} />
          <circle cx="60" cy="40" r="8" fill={color} />
          <path d="M60 38 C44 18 20 16 20 30" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
        </svg>
      )
    case 'flower':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="50" cy="27" rx="15" ry="24" fill={color} opacity="0.92" transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="12" fill="#fff" opacity="0.85" />
          <circle cx="50" cy="50" r="6" fill={color} />
        </svg>
      )
    case 'stamp': {
      const t = text || '확인'
      const size = Math.min(26, 190 / Math.max(2, t.length * 1.6))
      return (
        <svg viewBox="0 0 140 64" aria-hidden="true">
          <g transform="rotate(-6 70 32)" opacity="0.85">
            <rect x="4" y="6" width="132" height="52" rx="6" fill="none" stroke={color} strokeWidth="4" />
            <rect x="11" y="13" width="118" height="38" rx="3" fill="none" stroke={color} strokeWidth="1.6" />
            <text x="70" y="32" dominantBaseline="central" textAnchor="middle" fontFamily='"Black Han Sans","Noto Sans KR",sans-serif' fontSize={size} fill={color} letterSpacing="3">
              {t}
            </text>
          </g>
        </svg>
      )
    }
    case 'label': {
      const t = text || 'FILE No.07'
      return (
        <svg viewBox="0 0 180 40" aria-hidden="true">
          <rect width="180" height="40" fill={color} />
          <rect width="10" height="40" fill="#000" opacity="0.22" />
          <text x="22" y="20" dominantBaseline="central" fontFamily='"IBM Plex Mono","Noto Sans KR",monospace' fontSize={Math.min(16, 230 / Math.max(8, t.length))} fill={readableOn(color)} letterSpacing="2">
            {t}
          </text>
        </svg>
      )
    }
    case 'note': {
      const ls = (text || '메모').split('\n').slice(0, 4)
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M4 4 H96 V78 L78 96 H4Z" fill={color} />
          <path d="M78 96 V78 H96Z" fill="#000" opacity="0.18" />
          <text fontFamily='"Nanum Pen Script","Noto Sans KR",cursive' fontSize="15" fill={readableOn(color)}>
            {ls.map((l, i) => (
              <tspan key={i} x="12" y={26 + i * 17}>
                {l}
              </tspan>
            ))}
          </text>
        </svg>
      )
    }
    case 'barcode': {
      let x = 8
      return (
        <svg viewBox="0 0 120 52" aria-hidden="true">
          <rect width="120" height="52" fill="#fff" />
          {BARS.map((w, i) => {
            const r = i % 2 === 0 ? <rect key={i} x={x} y="6" width={w * 1.2} height="32" fill="#111" /> : null
            x += w * 1.2 + 0.9
            return r
          })}
          <text x="60" y="47" textAnchor="middle" fontFamily='"IBM Plex Mono",monospace' fontSize="7" fill="#111" letterSpacing="2">
            0701 2026 EDEN
          </text>
        </svg>
      )
    }
    case 'hazard':
      return (
        <svg viewBox="0 0 200 20" aria-hidden="true">
          <rect width="200" height="20" fill="#f0c419" />
          {Array.from({ length: 12 }, (_, i) => (
            <polygon key={i} points={`${i * 20 - 10},20 ${i * 20},0 ${i * 20 + 10},0 ${i * 20},20`} fill="#111" />
          ))}
        </svg>
      )
    case 'circle':
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <path d="M20 44 C18 18 60 6 92 16 C118 24 112 60 76 70 C40 80 8 64 14 38 C18 22 44 12 70 12" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      )
    case 'arrow':
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <path d="M8 46 C30 10 70 8 104 26" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M90 13 L106 27 L88 37" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'crack':
      return (
        <svg viewBox="0 0 60 120" aria-hidden="true">
          <polyline points="30,0 24,26 36,44 22,70 34,92 28,120" fill="none" stroke={color} strokeWidth="10" opacity="0.22" strokeLinejoin="bevel" />
          <polyline points="30,0 24,26 36,44 22,70 34,92 28,120" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="bevel" />
          <polyline points="36,44 48,52 52,62" fill="none" stroke={color} strokeWidth="1.6" />
        </svg>
      )
    case 'sentinel':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <g fill={color}>
            <polygon points="24,2 28,14 24,11 20,14" />
            <polygon points="24,46 20,34 24,37 28,34" />
            <polygon points="2,24 14,20 11,24 14,28" />
            <polygon points="46,24 34,28 37,24 34,20" />
            <polygon points="24,17 31,24 24,31 17,24" />
            <polygon points="33,15 41,7 36,17" />
            <polygon points="15,33 7,41 12,31" />
          </g>
        </svg>
      )
    case 'guide':
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="16" fill="none" stroke={color} strokeWidth="3.2" />
          <g fill={color}>
            <polygon points="20,4 28,4 24,14" />
            <polygon points="20,44 28,44 24,34" />
            <polygon points="4,20 4,28 14,24" />
            <polygon points="44,20 44,28 34,24" />
            <polygon points="24,19 29,24 24,29 19,24" />
          </g>
        </svg>
      )
    case 'bandage':
      return (
        <svg viewBox="0 0 120 44" aria-hidden="true">
          <g transform="rotate(-8 60 22)">
            <rect x="4" y="8" width="112" height="28" rx="14" fill="#e6c49d" />
            <rect x="42" y="8" width="36" height="28" fill="#f3dcc0" />
            {[14, 24, 90, 100].map((cx) => [16, 28].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="#c69c70" />))}
          </g>
        </svg>
      )
    case 'stain':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#7a5230" strokeWidth="5" opacity="0.28" />
          <circle cx="52" cy="48" r="35" fill="none" stroke="#7a5230" strokeWidth="1.6" opacity="0.22" />
          <path d="M84 30 C92 36 94 44 90 52" stroke="#7a5230" strokeWidth="4" opacity="0.2" fill="none" />
        </svg>
      )
  }
}
