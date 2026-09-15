import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProfileDocView, parseProfileDoc } from '../components/ProfileDoc'
import { Empty, ErrorBox, Loading, WRAP, cx } from '../components/ui'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import { saveElementAsPng } from '../lib/exportImage'

export default function Profile() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const ch = useAsync(() => api.getCharacter(id), [id, session?.userId])
  const ref = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const c = ch.data
  const doc = c ? parseProfileDoc(c.details?.profile_doc) : null
  usePageMeta(c ? `${c.name} 프로필 문서` : '프로필 문서')

  if (ch.loading && !c) return <Loading />
  if (ch.error)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <ErrorBox error={ch.error} />
      </div>
    )

  const canManage = !!c && !!session && (c.owner_id === session.userId || session.role === 'admin')

  if (!c || !doc)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <Empty title={c ? '아직 꾸민 프로필 문서가 없습니다' : '볼 수 없는 기록입니다'}>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {c ? (
              <Link to={`/registry/${c.id}`} className="btn">
                등록 기록으로
              </Link>
            ) : (
              <Link to="/registry" className="btn">
                명부로
              </Link>
            )}
            {c && canManage && (
              <Link to={`/office/cards/${c.id}/edit`} className="btn btn-primary">
                프로필 꾸미기
              </Link>
            )}
          </div>
        </Empty>
      </div>
    )

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground" aria-label="현재 위치">
        <Link to="/registry" className="hover:text-foreground">
          요원 명부
        </Link>
        <span aria-hidden="true">›</span>
        <Link to={`/registry/${c.id}`} className="hover:text-foreground">
          {c.name}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-foreground">프로필 문서</span>
      </nav>

      <div className="mx-auto mt-6 max-w-[820px]">
        <div ref={ref}>
          <ProfileDocView doc={doc} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link to={`/registry/${c.id}`} className="btn btn-sm">
            ← 등록 기록
          </Link>
          <span className="ml-auto" />
          {saveErr && <span className="text-[13px] text-destructive">이미지를 만들지 못했습니다.</span>}
          {canManage && (
            <Link to={`/office/cards/${c.id}/edit`} className="btn btn-sm">
              꾸미기
            </Link>
          )}
          <button
            type="button"
            className="btn btn-sm"
            disabled={saving}
            onClick={async () => {
              if (!ref.current) return
              setSaving(true)
              setSaveErr(false)
              try {
                await saveElementAsPng(ref.current, `프로필_${c.name}`)
              } catch {
                setSaveErr(true)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? '만드는 중…' : '이미지로 저장'}
          </button>
        </div>
      </div>
    </section>
  )
}
