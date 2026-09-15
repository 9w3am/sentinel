// 프로필 문서 예시 모음. 운영진이 꾸민 문서를 보고 그대로 가져가 쓸 수 있다.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadDraft, saveDraft } from '../components/profile/draft'
import { PROFILE_EXAMPLES } from '../components/profile/examples'
import { isEmptyDoc } from '../components/profile/model'
import { ProfileDocView } from '../components/profile/ProfileView'
import { DocThumb } from '../components/profile/Thumb'
import { PageTitle, Pill, WRAP, copyText, cx } from '../components/ui'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'

export default function ProfileExamples() {
  usePageMeta('프로필 문서 예시', '요원 프로필 문서 꾸미기 예시.')
  const navigate = useNavigate()
  const { session } = useAuth()
  const mine = useAsync(() => (session?.role ? api.listMyCharacters() : Promise.resolve([])), [session?.role])
  const [sel, setSel] = useState(PROFILE_EXAMPLES[0].key)
  const [target, setTarget] = useState('')
  const [msg, setMsg] = useState('')
  const ex = PROFILE_EXAMPLES.find((x) => x.key === sel) ?? PROFILE_EXAMPLES[0]
  const covers = useMemo(
    () =>
      PROFILE_EXAMPLES.map((x) => {
        const d = x.make('')
        return { key: x.key, doc: { ...d, pages: [d.pages[0]] } }
      }),
    [],
  )
  const doc = useMemo(() => ex.make(''), [ex])
  const cards = mine.data ?? []
  const card = cards.find((c) => c.id === target) ?? cards[0]

  const toApply = () => {
    const prev = loadDraft('apply')
    if (prev && !isEmptyDoc(prev.doc) && !confirm('신청서에 꾸미던 문서가 있습니다. 이 예시로 바꿀까요?')) return
    saveDraft('apply', ex.make(''))
    navigate('/studio/apply')
  }
  const toCard = () => {
    if (!card) return
    if (!confirm(`'${card.name}' 프로필 문서를 이 예시로 시작할까요? 저장하기 전까지는 등록증에 반영되지 않습니다.`)) return
    saveDraft(`card:${card.id}`, ex.make(card.name))
    navigate(`/studio/card/${card.id}`)
  }

  return (
    <>
      <PageTitle title="프로필 문서 예시" crumbs={[{ label: '커뮤 안내', to: '/guide' }, { label: '프로필 문서 예시' }]} desc="운영진이 꾸며 본 문서입니다. 골라서 가져간 뒤 내용만 바꿔 써도 됩니다." />
      <div className={cx(WRAP, 'py-10')}>
        <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2" role="listbox" aria-label="예시 목록">
          {PROFILE_EXAMPLES.map((x) => {
            const cover = covers.find((c) => c.key === x.key)!
            return (
              <button key={x.key} type="button" role="option" aria-selected={x.key === sel} onClick={() => setSel(x.key)} className="group w-[150px] shrink-0 text-left">
                <span className={cx('block h-[212px] overflow-hidden border-2', x.key === sel ? 'border-seal' : 'border-rule group-hover:border-foreground')}>
                  <DocThumb doc={cover.doc} width={146} maxHeight={208} />
                </span>
                <b className={cx('mt-2 block text-[14px]', x.key === sel && 'text-seal')}>{x.label}</b>
                <span className="block text-[12px] leading-snug text-muted-foreground">{x.desc}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="mx-auto w-full max-w-[760px]">
            <ProfileDocView doc={doc} />
          </div>
          <aside className="space-y-5 border border-rule bg-card p-5 lg:sticky lg:top-24">
            <div>
              <p className="text-[22px] font-black tracking-[-0.02em]">{ex.label}</p>
              <p className="mt-1 text-[14px] text-muted-foreground">{ex.desc}</p>
              <p className="mt-3 flex flex-wrap gap-1">
                {ex.tags.map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground">{doc.pages.length}쪽</p>
            </div>
            <div className="space-y-2 border-t border-rule pt-4">
              <button type="button" className="btn btn-primary w-full" onClick={toApply}>
                편입 신청서용으로 꾸미기
              </button>
              {cards.length > 0 && (
                <div className="space-y-2 border-t border-dashed border-rule pt-3">
                  <select className="field" value={card?.id ?? ''} onChange={(e) => setTarget(e.target.value)} aria-label="가져갈 등록증">
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn w-full" onClick={toCard}>
                    내 등록증 문서로 꾸미기
                  </button>
                </div>
              )}
              <button
                type="button"
                className="btn btn-sm w-full"
                onClick={async () => {
                  setMsg((await copyText(JSON.stringify(doc))) ? '코드를 복사했습니다. 꾸미기 창의 파일 → 코드 불러오기에 붙여 넣으세요.' : '복사하지 못했습니다.')
                }}
              >
                코드 복사
              </button>
              {msg && <p className="text-[12.5px] text-muted-foreground">{msg}</p>}
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
