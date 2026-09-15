// 프로필 문서 꾸미기 창 (전체 화면). 신청서 · 등록증 신청 화면에서 새 창으로 열린다.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { clearDraft, loadDraft, loadDraftName, saveDraft } from '../components/profile/draft'
import { PROFILE_DOC_BYTES, docBytes, emptyDoc, isEmptyDoc, parseProfileDoc, type ProfileDoc } from '../components/profile/model'
import { ProfileDocEditor } from '../components/profile/ProfileEditor'
import { ErrorBox, Loading } from '../components/ui'
import { api, useAuth, usePageMeta } from '../lib/backend'
import type { Character } from '../lib/types'
import { errMsg } from '../lib/util'

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[100dvh] place-items-center bg-background p-6 text-center">{children}</div>
}

export default function Studio({ mode }: { mode: 'apply' | 'card' }) {
  const { id = 'new' } = useParams()
  const key = mode === 'apply' ? 'apply' : `card:${id}`
  const existing = mode === 'card' && id !== 'new'
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [doc, setDoc] = useState<ProfileDoc | null>(null)
  const [char, setChar] = useState<Character | null>(null)
  const [loadErr, setLoadErr] = useState<unknown>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [dbSaving, setDbSaving] = useState(false)
  const [dbMsg, setDbMsg] = useState('')
  const dirty = useRef(false)
  usePageMeta('프로필 문서 꾸미기')

  useEffect(() => {
    const draft = loadDraft(key)
    if (!existing) {
      setDoc(draft?.doc ?? emptyDoc())
      return
    }
    if (authLoading) return
    let alive = true
    api
      .getCharacter(id)
      .then((c) => {
        if (!alive) return
        setChar(c)
        const fromDb = parseProfileDoc(c?.details?.profile_doc)
        setDoc(draft && (!c || draft.at > c.updated_at) ? draft.doc : (fromDb ?? draft?.doc ?? emptyDoc()))
      })
      .catch((e) => alive && setLoadErr(e))
    return () => {
      alive = false
    }
  }, [key, existing, id, authLoading])

  // 고칠 때마다 이 브라우저에 저장 → 신청서 · 등록증 창이 바로 받아 간다
  useEffect(() => {
    if (!doc || !dirty.current) return
    const t = window.setTimeout(() => {
      saveDraft(key, doc)
      setSavedAt(new Date())
    }, 400)
    return () => window.clearTimeout(t)
  }, [doc, key])

  const name = char?.name ?? loadDraftName(key)
  const canManage = !!char && !!session && (char.owner_id === session.userId || session.role === 'admin')

  const exit = () => {
    if (window.opener && !window.opener.closed) window.close()
    else navigate(mode === 'apply' ? '/apply' : existing ? `/registry/${id}` : '/office/cards/new')
  }

  const saveToCard = async () => {
    if (!char || !doc) return
    if (docBytes(doc) > PROFILE_DOC_BYTES) return alert('문서가 너무 깁니다. 칸이나 페이지를 줄여 주세요.')
    setDbSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile_doc: _old, ...rest } = char.details ?? {}
      const details = isEmptyDoc(doc) ? rest : { ...rest, profile_doc: JSON.stringify(doc) }
      await api.saveCharacter({ id: char.id, name: char.name, codename: char.codename, kind: char.kind, grade: char.grade, affiliation: char.affiliation, details, is_public: char.is_public, avatar_url: char.avatar_url })
      setChar(await api.getCharacter(char.id))
      clearDraft(key)
      dirty.current = false
      setDbMsg(`등록증에 저장했습니다 · ${hhmm(new Date())}`)
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setDbSaving(false)
    }
  }

  if (existing && authLoading) return <Loading label="확인 중" />
  if (existing && !session)
    return (
      <Center>
        <div>
          <p className="text-[20px] font-bold">로그인이 필요합니다</p>
          <Link to={`/auth?next=${encodeURIComponent(`/studio/card/${id}`)}`} className="btn btn-primary mt-4">
            로그인
          </Link>
        </div>
      </Center>
    )
  if (loadErr)
    return (
      <Center>
        <ErrorBox error={loadErr} />
      </Center>
    )
  if (!doc) return <Loading label="문서 여는 중" />
  if (existing && (!char || !canManage))
    return (
      <Center>
        <div>
          <p className="text-[20px] font-bold">꾸밀 수 없는 문서입니다</p>
          <p className="mt-2 text-[14px] text-muted-foreground">본인 등록증만 꾸밀 수 있습니다.</p>
          <Link to="/office/cards" className="btn mt-4">
            내 등록증
          </Link>
        </div>
      </Center>
    )

  const saved = savedAt ? `자동 저장 ${hhmm(savedAt)}` : '고치면 자동 저장됩니다'
  const status =
    mode === 'apply'
      ? `${saved} · 편입 신청서 창에 바로 반영됩니다`
      : !existing
        ? `${saved} · 등록증 신청 창에 바로 반영됩니다`
        : dbMsg && !dirty.current
          ? dbMsg
          : `${saved} (이 브라우저) · '등록증에 저장'을 눌러야 명부에 반영됩니다`

  return (
    <ProfileDocEditor
      value={doc}
      onChange={(d) => {
        dirty.current = true
        setDoc(d)
      }}
      name={name}
      studio={{
        title: (
          <>
            {name || '이름 없음'} <span className="font-normal text-muted-foreground">· 프로필 문서{mode === 'apply' ? ' (편입 신청서)' : ''}</span>
          </>
        ),
        status,
        back: (
          <button type="button" onClick={exit} className="grid h-9 w-9 shrink-0 place-items-center text-[20px] hover:text-seal" aria-label="꾸미기 창 닫기">
            ←
          </button>
        ),
        actions: (
          <>
            <Link to="/profile-examples" target="_blank" className="btn btn-sm hidden lg:inline-flex">
              예시 보기
            </Link>
            {existing && (
              <Link to={`/registry/${id}/profile`} target="_blank" className="btn btn-sm hidden lg:inline-flex">
                공개 화면
              </Link>
            )}
            {existing ? (
              <button type="button" className="btn btn-sm btn-primary" disabled={dbSaving} onClick={saveToCard}>
                {dbSaving ? '저장 중…' : '등록증에 저장'}
              </button>
            ) : (
              <button type="button" className="btn btn-sm btn-primary" onClick={exit}>
                완료
              </button>
            )}
          </>
        ),
      }}
    />
  )
}
