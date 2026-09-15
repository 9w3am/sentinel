// 프로필 문서 작은 미리보기. 글자 크기에 최솟값이 있어서, 넓게 그린 뒤 줄여서 보여 준다.
import { ProfileDocView } from './ProfileView'
import type { ProfileDoc } from './model'

const BASE = 640

export function DocThumb({ doc, width, maxHeight }: { doc: ProfileDoc; width: number; maxHeight?: number }) {
  const scale = width / BASE
  return (
    <span className="pointer-events-none relative block shrink-0 overflow-hidden" style={{ width, height: maxHeight ?? Math.round(width * 1.414) }} aria-hidden="true">
      <span className="absolute left-0 top-0 block origin-top-left" style={{ width: BASE, transform: `scale(${scale})` }}>
        <ProfileDocView doc={doc} />
      </span>
    </span>
  )
}
