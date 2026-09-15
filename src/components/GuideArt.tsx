// 커뮤 안내 머리 그림 — 산으로 둘러싼 분지, 방벽, 도시, 하늘에 난 균열 하나
const rand = (() => {
  let s = 20260915
  return () => (s = (s * 48271) % 2147483647) / 2147483647
})()

const BASE = 270
const BUILDINGS = Array.from({ length: 70 }, (_, i) => {
  const center = 1 - Math.min(1, Math.abs(i - 35) / 35) // 가운데 구역일수록 높다
  return {
    x: 120 + i * 17.4 + rand() * 5,
    w: 9 + rand() * 15,
    h: 18 + rand() * 50 + center * center * (70 + rand() * 90),
  }
})
const WINDOWS = BUILDINGS.flatMap((b) => {
  const out: { x: number; y: number }[] = []
  for (let y = BASE - b.h + 6; y < BASE - 10; y += 9) if (rand() < 0.12) out.push({ x: b.x + 2 + rand() * (b.w - 5), y })
  return out
})
const TOWERS = Array.from({ length: 10 }, (_, i) => 72 + i * 144)
const CRACK = '1058,18 1052,44 1064,62 1050,90 1062,112 1054,138 1060,156'

export function EdenSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 286" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="eden-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
          <stop offset="1" stopColor="#0f0f0d" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="eden-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f0c419" stopOpacity="0.14" />
          <stop offset="1" stopColor="#f0c419" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="eden-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0c419" stopOpacity="0.2" />
          <stop offset="1" stopColor="#f0c419" stopOpacity="0" />
        </radialGradient>
        <filter id="eden-blur" x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* 하늘의 균열 */}
      <ellipse cx="1058" cy="88" rx="96" ry="84" fill="url(#eden-glow)" />
      <polyline points={CRACK} fill="none" stroke="#f0c419" strokeWidth="5" opacity="0.35" filter="url(#eden-blur)" />
      <polyline points={CRACK} fill="none" stroke="#f7dc6f" strokeWidth="1.4" strokeLinejoin="bevel" />
      <polyline points="1060,68 1078,76 1084,90" fill="none" stroke="#f0c419" strokeWidth="0.9" opacity="0.6" />

      {/* 분지를 두른 산 */}
      <path d="M0 196 L90 172 L210 190 L330 150 L450 182 L560 160 L690 186 L820 146 L950 180 L1090 158 L1210 186 L1330 162 L1440 180 V320 H0Z" fill="#17160f" />
      <path d="M0 232 L140 206 L300 226 L470 200 L640 224 L800 204 L980 228 L1150 206 L1310 226 L1440 212 V320 H0Z" fill="#131210" />

      {/* 감시탑 탐조등 */}
      {[216, 648, 1224].map((x, k) => (
        <polygon key={x} points={`${x},238 ${x - 70 + k * 40},30 ${x - 34 + k * 40},30`} fill="url(#eden-beam)" />
      ))}

      {/* 도시 */}
      <g fill="#0b0b09">
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={BASE - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g fill="#f0c419">
        {WINDOWS.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width="2" height="2" opacity={0.3 + (i % 4) * 0.12} />
        ))}
      </g>

      {/* 방벽 */}
      <rect x="0" y="262" width="1440" height="24" fill="#0f0f0d" />
      <g fill="#0f0f0d">
        {TOWERS.map((x) => (
          <rect key={x} x={x - 7} y="238" width="14" height="26" />
        ))}
      </g>
      <g fill="#f0c419">
        {TOWERS.map((x) => (
          <rect key={x} x={x - 1} y="243" width="2" height="2" />
        ))}
      </g>
      <line x1="0" y1="262.5" x2="1440" y2="262.5" stroke="#f0c419" strokeOpacity="0.4" />
      <rect x="0" y="262" width="1440" height="24" fill="url(#eden-fade)" />
    </svg>
  )
}
