// 신청서 · 등록증 화면에 들어가는 프로필 문서 자리. 꾸미기는 따로 여는 창에서 한다.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../ui'
import { openStudio, saveDraft } from './draft'
import { PROFILE_DOC_BYTES, docBytes, emptyDoc, isEmptyDoc, type ProfileDoc } from './model'
import { ProfileDocView } from './ProfileView'
import { DocThumb } from './Thumb'

export function DocSlot({ doc, draftKey, name, onChange }: { doc: ProfileDoc; draftKey: string; name: string; onChange: (d: ProfileDoc) => void }) {
  const [full, setFull] = useState(false)
  const empty = isEmptyDoc(doc)
  const pct = Math.round((docBytes(doc) / PROFILE_DOC_BYTES) * 100)
  const open = () => {
    saveDraft(draftKey, doc, name)
    openStudio(draftKey)
  }

  return (
    <div className="border border-rule bg-background/40">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <button type="button" onClick={open} aria-label="꾸미기 창 열기" className={cx('relative block h-[187px] w-[132px] shrink-0 overflow-hidden border', empty ? 'border-dashed border-rule hover:border-seal' : 'border-rule hover:border-seal')}>
          {empty ? (
            <span className="grid h-full place-items-center px-3 text-center text-[12.5px] text-muted-foreground">
              빈 문서
              <br />
              눌러서 꾸미기
            </span>
          ) : (
            <DocThumb doc={{ ...doc, pages: [doc.pages[0]] }} width={130} maxHeight={185} />
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[15px] font-bold">{empty ? '아직 꾸민 문서가 없습니다' : `${doc.pages.length}쪽짜리 문서`}</p>
          <p className="text-[13px] text-muted-foreground">
            {empty ? '꾸미기 창이 새 창으로 열립니다. 메뉴 · 되돌리기 · 확대 · 페이지 목록이 있는 문서 편집기입니다.' : `용량 ${pct}% · 꾸미기 창에서 고치면 이 화면에 바로 반영됩니다.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={open}>
              꾸미기 창 열기
            </button>
            <Link to="/profile-examples" target="_blank" className="btn btn-sm">
              예시 보기
            </Link>
            {!empty && (
              <button type="button" className="btn btn-sm" onClick={() => setFull(!full)}>
                {full ? '미리보기 접기' : '전체 미리보기'}
              </button>
            )}
            {!empty && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  if (!confirm('문서를 비울까요?')) return
                  const e = emptyDoc()
                  onChange(e)
                  saveDraft(draftKey, e, name)
                }}
              >
                비우기
              </button>
            )}
          </div>
          {pct > 100 && <p className="text-[13px] text-destructive">문서가 너무 깁니다. 꾸미기 창에서 칸이나 페이지를 줄여 주세요.</p>}
        </div>
      </div>
      {full && !empty && (
        <div className="border-t border-rule p-4">
          <div className="mx-auto max-w-[640px]">
            <ProfileDocView doc={doc} />
          </div>
        </div>
      )}
    </div>
  )
}
