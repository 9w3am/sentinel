import { useState, type FormEvent } from 'react'
import { ErrorBox, Loading, Pill, SectionHead, Segmented } from '../../components/ui'
import { INBOX_CATEGORIES, inboxCategoryLabel } from '../../config/world'
import { api, useAsync, usePageMeta } from '../../lib/backend'
import type { InboxCategory } from '../../lib/types'
import { errMsg, fmtDate } from '../../lib/util'

export default function Inbox() {
  usePageMeta('운영진 문의함')
  const mine = useAsync(() => api.listMyInbox(), [])
  const [category, setCategory] = useState<InboxCategory>('question')
  const [anonymous, setAnonymous] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setSent(false)
    try {
      await api.sendInbox({ category, title, body, anonymous })
      setTitle('')
      setBody('')
      setSent(true)
      mine.reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  const list = mine.data ?? []

  return (
    <div className="grid gap-12 lg:grid-cols-[420px_1fr] lg:items-start">
      <form onSubmit={submit} className="doc-frame lg:sticky lg:top-28">
        <div className="border-b-2 border-foreground px-5 pb-3 pt-5">
          <p className="text-[13px] text-muted-foreground">세계관 밖 · 운영진에게만</p>
          <h2 className="text-[26px] font-black tracking-[-0.03em]">운영진 문의함</h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">다른 오너에게는 보이지 않습니다. 운영진만 읽고, 답변은 보낸 사람에게만 보입니다.</p>
          <div>
            <span className="form-label">분류</span>
            <Segmented name="분류" value={category} onChange={setCategory} options={INBOX_CATEGORIES.map((c) => ({ value: c.value as InboxCategory, label: c.label }))} />
          </div>
          <div>
            <label className="form-label" htmlFor="ib-title">
              제목
            </label>
            <input id="ib-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <label className="form-label" htmlFor="ib-body">
              내용
            </label>
            <textarea id="ib-body" className="field min-h-40" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={8000} />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--seal)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <span>
              익명으로 보내기
              <span className="block text-[12.5px] text-muted-foreground">운영진 화면에 이름이 표시되지 않습니다.</span>
            </span>
          </label>
          {err ? <ErrorBox error={err} /> : null}
          {sent && <p className="border-l-4 border-ok bg-card px-3 py-2 text-[13.5px]">보냈습니다. 답변이 달리면 오른쪽 목록에 표시됩니다.</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? '보내는 중…' : '보내기'}
          </button>
        </div>
      </form>

      <section className="min-w-0">
        <SectionHead title="보낸 문의" action={<span className="font-mono text-[13px] text-muted-foreground">{list.length}건</span>} />
        {mine.loading && <Loading />}
        {mine.error ? <ErrorBox error={mine.error} /> : null}
        {mine.data && list.length === 0 && <p className="py-8 text-center text-[14px] text-muted-foreground">보낸 문의가 없습니다.</p>}
        <ul className="space-y-4">
          {list.map((i) => (
            <li key={i.id} className="doc-frame-soft p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>{inboxCategoryLabel(i.category)}</Pill>
                <strong className="min-w-0 flex-1 truncate text-[16px]">{i.title}</strong>
                {i.reply ? <Pill tone="ok">답변 완료</Pill> : <Pill tone="muted">답변 대기</Pill>}
              </div>
              <p className="mt-1 font-mono text-[12px] text-muted-foreground">
                {fmtDate(i.created_at, true)} · {i.anonymous ? '익명' : '이름 공개'}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-muted-foreground">{i.body}</p>
              {i.reply && (
                <div className="mt-4 border-l-4 border-seal bg-muted px-4 py-3">
                  <p className="text-[12.5px] text-seal">운영진 답변{i.replied_at && ` · ${fmtDate(i.replied_at, true)}`}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{i.reply}</p>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="text-[12px] text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    if (!confirm('이 문의를 지울까요? 운영진 쪽에서도 사라집니다.')) return
                    await api.deleteMyInbox(i.id).catch((e) => alert(errMsg(e)))
                    mine.reload()
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
