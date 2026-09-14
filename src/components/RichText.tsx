import { Fragment } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"']+)/g
const IMG_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i

/**
 * 본문 표시용.
 * - 한 줄에 이미지 주소만 있으면 그림으로 보여 준다.
 * - 그 밖의 http(s) 주소는 새 창 링크가 된다.
 * 줄바꿈은 부모의 white-space(pre-line / pre-wrap)로 유지한다.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n')
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (/^https?:\/\/\S+$/.test(trimmed) && IMG_RE.test(trimmed)) {
          return <img key={i} src={trimmed} alt="" loading="lazy" referrerPolicy="no-referrer" className="my-4 block h-auto max-h-[420px] w-auto max-w-full border border-rule object-contain" />
        }
        const parts = line.split(URL_RE)
        return (
          <Fragment key={i}>
            {parts.map((p, j) =>
              /^https?:\/\//.test(p) ? (
                <a key={j} href={p} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-seal underline underline-offset-4">
                  {p}
                </a>
              ) : (
                <Fragment key={j}>{p}</Fragment>
              ),
            )}
            {i < lines.length - 1 && '\n'}
          </Fragment>
        )
      })}
    </div>
  )
}
