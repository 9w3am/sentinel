import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CharacterCard } from '../../components/CharacterCard'
import { ProfileDocEditor, PROFILE_DOC_BYTES, docBytes, emptyDoc, isEmptyDoc, parseProfileDoc, type ProfileDoc } from '../../components/ProfileDoc'
import { ErrorBox, Loading, Segmented } from '../../components/ui'
import { BRANCHES, DETAIL_FIELDS, GRADES, GUIDING_TYPES, KINDS, type Kind } from '../../config/world'
import { api, useAuth, usePageMeta } from '../../lib/backend'
import type { CharacterInput } from '../../lib/types'
import { resizeImage } from '../../lib/util'

const empty: CharacterInput = { name: '', codename: '', kind: 'sentinel', grade: 'C', affiliation: '', details: {}, is_public: true, avatar_url: null }

export default function CardForm() {
  const { id } = useParams()
  const editing = !!id
  usePageMeta(editing ? '등록증 수정' : '등록증 신청')
  const { session } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<CharacterInput>(empty)
  const [doc, setDoc] = useState<ProfileDoc>(emptyDoc)
  const [docOpen, setDocOpen] = useState(false)
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([api.getCharacter(id), api.getSecret(id)])
      .then(([c, s]) => {
        if (!alive) return
        if (!c || (c.owner_id !== session?.userId && session?.role !== 'admin')) {
          setErr(new Error('수정 권한이 없는 등록증입니다.'))
        } else {
          const { profile_doc, ...details } = c.details ?? {}
          setForm({ id: c.id, name: c.name, codename: c.codename ?? '', kind: c.kind, grade: c.grade, affiliation: c.affiliation ?? '', details, is_public: c.is_public, avatar_url: c.avatar_url })
          const pd = parseProfileDoc(profile_doc)
          if (pd) setDoc(pd)
          setSecret(s ?? '')
          setStatus(c.status)
        }
      })
      .catch(setErr)
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, session?.userId, session?.role])

  const set = <K extends keyof CharacterInput>(k: K, v: CharacterInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setD = (k: string, v: string) => setForm((f) => ({ ...f, details: { ...f.details, [k]: v } }))

  const onFile = async (file?: File) => {
    if (!file) return
    setErr(null)
    setUploading(true)
    try {
      const blob = await resizeImage(file, api.mode === 'local' ? 420 : 720)
      set('avatar_url', await api.uploadAvatar(blob))
    } catch (e) {
      setErr(e)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    const withDoc = !isEmptyDoc(doc)
    if (withDoc && docBytes(doc) > PROFILE_DOC_BYTES) return setErr(new Error('프로필 문서가 너무 깁니다. 칸이나 글을 줄여 주세요.'))
    setBusy(true)
    try {
      const details: Record<string, string> = Object.fromEntries(Object.entries(form.details).filter(([k, v]) => k !== 'profile_doc' && v && v.trim()))
      if (withDoc) details.profile_doc = JSON.stringify(doc)
      const savedId = await api.saveCharacter({ ...form, details })
      if (secret.trim() || editing) await api.saveSecret(savedId, secret)
      navigate('/office/cards', {
        state: { flash: editing ? '수정했습니다. 내용이 바뀌었으면 다시 심사를 받습니다.' : '신청했습니다. 관리부 심사를 기다려 주세요.' },
      })
    } catch (e) {
      setErr(e)
      setBusy(false)
    }
  }

  if (loading) return <Loading />

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="min-w-0">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-3">
          <div>
            <p className="text-[13px] text-muted-foreground">등록증</p>
            <h2 className="title-serif mt-1 text-[30px] font-bold">{editing ? '등록증 수정' : '등록증 신청'}</h2>
          </div>
          <Link to="/office/cards" className="label-mono hover:text-seal">
            ← 내 등록증
          </Link>
        </div>

        <div className="space-y-10">
          <Chapter no="01" title="기본 정보">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="성명 (본명)" required>
                <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={30} />
              </Field>
              <Field label="코드네임">
                <input className="field" value={form.codename ?? ''} onChange={(e) => set('codename', e.target.value)} maxLength={30} placeholder="없으면 비워 두세요" />
              </Field>
            </div>
            <Field label="각성 구분" required>
              <Segmented name="각성 구분" value={form.kind} onChange={(v) => set('kind', v as Kind)} options={KINDS.map((k) => ({ value: k.value, label: k.label }))} />
            </Field>
            <Field label="판정 등급" required>
              <Segmented name="등급" value={form.grade} onChange={(v) => set('grade', v)} options={GRADES.map((g) => ({ value: g.value, label: <span className="font-mono font-semibold">{g.value}</span> }))} />
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {GRADES.find((g) => g.value === form.grade)?.label} — {form.kind === 'guide' ? GRADES.find((g) => g.value === form.grade)?.guide : GRADES.find((g) => g.value === form.grade)?.sentinel}
              </p>
            </Field>
            <Field label="소속">
              <select className="field" value={form.affiliation ?? ''} onChange={(e) => set('affiliation', e.target.value)}>
                <option value="">선택 안 함</option>
                {BRANCHES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </Chapter>

          <Chapter no="02" title="신체 · 발현">
            <div className="grid gap-4 sm:grid-cols-2">
              {DETAIL_FIELDS.filter((f) => f.section === 'basic').map((f) =>
                f.key === 'guiding_type' ? (
                  <Field key={f.key} label={f.label}>
                    <select className="field" value={form.details.guiding_type ?? ''} onChange={(e) => setD('guiding_type', e.target.value)}>
                      <option value="">미기재</option>
                      {GUIDING_TYPES.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field key={f.key} label={f.label}>
                    <input className="field" value={form.details[f.key] ?? ''} onChange={(e) => setD(f.key, e.target.value)} placeholder={f.placeholder} maxLength={60} />
                  </Field>
                ),
              )}
            </div>
          </Chapter>

          <Chapter no="03" title="기록">
            {DETAIL_FIELDS.filter((f) => f.section === 'doc').map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === 'text' ? (
                  <input className="field" value={form.details[f.key] ?? ''} onChange={(e) => setD(f.key, e.target.value)} placeholder={f.placeholder} maxLength={80} />
                ) : (
                  <textarea className="field" value={form.details[f.key] ?? ''} onChange={(e) => setD(f.key, e.target.value)} placeholder={f.placeholder} maxLength={4000} />
                )}
              </Field>
            ))}
          </Chapter>

          <Chapter no="04" title="사진">
            <div className="flex flex-wrap items-start gap-5">
              <div className="w-28">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="증명사진 미리보기" className="aspect-[3/4] w-full border border-foreground object-cover" />
                ) : (
                  <div className="grid aspect-[3/4] w-full place-items-center border border-dashed border-rule bg-muted text-center font-mono text-[10px] text-muted-foreground">
                    3 × 4
                    <br />
                    미제출
                  </div>
                )}
              </div>
              <div className="space-y-2 text-[14px]">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? '처리 중…' : form.avatar_url ? '사진 교체' : '사진 첨부'}
                  </button>
                  {form.avatar_url && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => set('avatar_url', null)}>
                      삭제
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground">3:4 비율로 자동으로 잘립니다.</p>
              </div>
            </div>
          </Chapter>

          <Chapter no="05" title="프로필 문서">
            <p className="-mt-2 text-[13.5px] text-muted-foreground">명부의 등록 기록에서 '프로필 문서'로 열리는 꾸밈 문서입니다. 선택입니다. 신청서에서 복사해 둔 코드가 있으면 '코드 불러오기'에 붙여 넣으세요.</p>
            {docOpen || !isEmptyDoc(doc) ? (
              <ProfileDocEditor value={doc} onChange={setDoc} name={form.name} stacked />
            ) : (
              <button type="button" className="btn" onClick={() => setDocOpen(true)}>
                프로필 문서 꾸미기
              </button>
            )}
          </Chapter>

          <Chapter no="06" title="비공개 설정">
            <p className="-mt-2 mb-3 text-[13.5px] text-muted-foreground">본인과 관리부만 볼 수 있고, 명부에는 나오지 않습니다.</p>
            <textarea className="field min-h-32 border-dashed" value={secret} onChange={(e) => setSecret(e.target.value)} maxLength={6000} placeholder="비공개 설정, 숨겨진 이력 등" />
          </Chapter>

          <div className="doc-frame-soft space-y-4 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={form.is_public} onChange={(e) => set('is_public', e.target.checked)} />
              <span>
                <span className="font-medium">요원 명부에 공개</span>
                <span className="block text-[13px] text-muted-foreground">끄면 심사가 끝나도 본인과 관리부만 볼 수 있습니다.</span>
              </span>
            </label>
            {editing && status === 'approved' && <p className="border-l-2 border-warn pl-3 text-[13px] text-muted-foreground">공개 여부 말고 다른 내용을 고치면(프로필 문서 포함) 다시 심사 중 상태가 됩니다.</p>}
            {err ? <ErrorBox error={err} /> : null}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary px-6 py-2.5" disabled={busy || uploading}>
                {busy ? '보내는 중…' : editing ? '수정 저장' : '신청하기'}
              </button>
              <Link to="/office/cards" className="btn px-6 py-2.5">
                취소
              </Link>
            </div>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28">
        <p className="mb-2 text-[13px] text-muted-foreground">미리보기</p>
        <CharacterCard c={{ ...form, id: form.id ?? '' }} />
        <p className="mt-3 text-[12.5px] text-muted-foreground">명부에 보일 모습입니다.</p>
      </aside>
    </form>
  )
}

function Chapter({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex w-full items-baseline gap-3 border-b border-rule pb-2">
        <span className="font-mono text-[12px] text-seal">{no}</span>
        <span className="title-serif text-[21px] font-bold">{title}</span>
      </legend>
      {children}
    </fieldset>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <span className="form-label">
        {label}
        {required && <span className="ml-1 text-seal">*</span>}
      </span>
      {children}
    </div>
  )
}
