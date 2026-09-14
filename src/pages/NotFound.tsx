import { Link } from 'react-router-dom'
import { WRAP, cx } from '../components/ui'
import { usePageMeta } from '../lib/backend'

export default function NotFound() {
  usePageMeta('페이지 없음')
  return (
    <section className={cx(WRAP, 'py-24')}>
      <p className="font-mono text-[14px] text-seal">404</p>
      <h1 className="mt-2 text-[40px] font-black leading-tight tracking-[-0.04em] sm:text-[56px]">찾는 페이지가 없습니다</h1>
      <p className="mt-3 text-[16px] text-muted-foreground">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <Link to="/" className="btn btn-primary mt-8">
        첫 화면으로
      </Link>
    </section>
  )
}
