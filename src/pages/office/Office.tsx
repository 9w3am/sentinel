import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, GradeBadge, KindBadge, Pill, SectionHead, StatCard, StatusPill } from '../../components/ui'
import { categoryLabel } from '../../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../../lib/backend'
import { fmtDate, relTime } from '../../lib/util'

const shortDate = (iso: string) => fmtDate(iso).replace(/\. /g, '.').replace(/\.$/, '')

export default function Office() {
  usePageMeta('집무실')
  const { session, refresh } = useAuth()
  const mine = useAsync(() => api.listMyCharacters(), [])
  const rels = useAsync(() => api.listMyRelations(), [])
  const notices = useAsync(() => api.listNotices(), [])
  const posts = useAsync(() => api.listPosts(), [])
  const allChars = useAsync(() => (session?.role === 'admin' ? api.listAllCharacters() : Promise.resolve([])), [session?.role])

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session?.displayName ?? '')
  const [err, setErr] = useState<unknown>(null)

  const myChars = mine.data ?? []
  const myIds = new Set(myChars.map((c) => c.id))
  const incoming = (rels.data ?? []).filter((r) => r.status === 'requested' && myIds.has(r.to_character_id) && r.created_by !== session?.userId)
  const pendingReview = (allChars.data ?? []).filter((c) => c.status === 'pending')

  const saveName = async () => {
    setErr(null)
    try {
      await api.updateDisplayName(name)
      await refresh()
      setEditing(false)
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div className="space-y-14">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
        <Link to="/office/cards" className="hover:text-seal">
          <StatCard label="내 등록증" value={myChars.length} unit="건" sub={`심사 중 ${myChars.filter((c) => c.status === 'pending').length}건`} />
        </Link>
        <Link to="/office/bonds" className={incoming.length ? 'text-seal' : 'hover:text-seal'}>
          <StatCard label="받은 결속 신청" value={incoming.length} unit="건" sub={incoming.length ? '처리를 기다리는 신청이 있습니다' : '대기 중인 신청 없음'} />
        </Link>
        {session?.role === 'admin' ? (
          <Link to="/office/admin" className={pendingReview.length ? 'text-seal' : 'hover:text-seal'}>
            <StatCard label="등록 심사 대기" value={pendingReview.length} unit="건" sub="관리부 콘솔에서 처리" />
          </Link>
        ) : (
          <div className="border-t-2 border-foreground pt-3">
            <p className="text-[13px] text-muted-foreground">매칭률 조회</p>
            <Link to="/office/matching" className="mt-2 inline-block text-[22px] font-black hover:text-seal">
              조회하기 →
            </Link>
          </div>
        )}
        <div className="border-t-2 border-foreground pt-3">
          <p className="text-[13px] text-muted-foreground">호칭</p>
          {editing ? (
            <div className="mt-2 flex gap-2">
              <input className="field py-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} aria-label="호칭" />
              <button type="button" className="btn btn-primary btn-sm" onClick={saveName}>
                저장
              </button>
            </div>
          ) : (
            <p className="mt-1 flex items-baseline gap-3">
              <span className="text-[26px] font-black tracking-[-0.03em]">{session?.displayName}</span>
              <button type="button" className="text-[13px] text-muted-foreground hover:text-seal" onClick={() => setEditing(true)}>
                변경
              </button>
            </p>
          )}
          <p className="mt-1 truncate font-mono text-[12px] text-muted-foreground">{session?.email}</p>
          {err ? <ErrorBox error={err} /> : null}
        </div>
      </div>

      <section>
        <SectionHead
          title="내 등록증"
          action={
            <Link to="/office/cards/new" className="btn btn-primary btn-sm">
              등록증 신청
            </Link>
          }
        />
        {mine.data && myChars.length === 0 ? (
          <p className="py-8 text-[15px] text-muted-foreground">
            아직 등록증이 없습니다.{' '}
            <Link to="/office/cards/new" className="text-seal underline underline-offset-4">
              등록증 신청하기
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-doc min-w-[620px]">
              <thead>
                <tr>
                  <th>이름</th>
                  <th className="w-28">구분</th>
                  <th className="w-20">등급</th>
                  <th className="w-28">상태</th>
                  <th className="w-28 text-right">갱신일</th>
                </tr>
              </thead>
              <tbody>
                {myChars.map((c) => (
                  <tr key={c.id} className="group">
                    <td>
                      <Link to={`/registry/${c.id}`} className="font-bold group-hover:text-seal">
                        {c.name}
                      </Link>
                    </td>
                    <td>
                      <KindBadge kind={c.kind} />
                    </td>
                    <td>
                      <GradeBadge grade={c.grade} size="sm" />
                    </td>
                    <td>
                      <StatusPill status={c.status} />
                    </td>
                    <td className="text-right font-mono text-[13px] text-muted-foreground">{shortDate(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <SectionHead
            title="게시판 최신 글"
            action={
              <Link to="/office/board" className="text-[13px] text-muted-foreground hover:text-seal">
                게시판 →
              </Link>
            }
          />
          <ul>
            {(posts.data ?? []).slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link to={`/office/board/${p.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-rule py-3">
                  <Pill>{categoryLabel(p.category)}</Pill>
                  <span className="truncate group-hover:text-seal">
                    {p.title}
                    {!!p.comment_count && <span className="ml-1.5 font-mono text-[12px] text-seal">[{p.comment_count}]</span>}
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">{relTime(p.created_at)}</span>
                </Link>
              </li>
            ))}
            {posts.data?.length === 0 && <li className="py-8 text-[14px] text-muted-foreground">올라온 기안이 없습니다.</li>}
          </ul>
        </section>
        <section>
          <SectionHead
            title="알림마당"
            action={
              <Link to="/notices" className="text-[13px] text-muted-foreground hover:text-seal">
                전체 →
              </Link>
            }
          />
          <ul>
            {(notices.data ?? []).slice(0, 6).map((n) => (
              <li key={n.id}>
                <Link to={`/notices/${n.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-rule py-3">
                  {n.level === 'normal' ? <Pill>공지</Pill> : <Pill tone={n.level === 'critical' ? 'danger' : 'seal'} solid>{n.level === 'critical' ? '긴급' : '경보'}</Pill>}
                  <span className="truncate group-hover:text-seal">{n.title}</span>
                  <span className="font-mono text-[12px] text-muted-foreground">{shortDate(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
