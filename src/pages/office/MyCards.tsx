import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ErrorBox, Flash, GradeBadge, Icon, KindBadge, Loading, Pill, SectionHead, StatusPill } from '../../components/ui'
import { api, useAsync, usePageMeta } from '../../lib/backend'
import { errMsg, fmtDate, registryNo } from '../../lib/util'

const shortDate = (iso: string) => fmtDate(iso).replace(/\. /g, '.').replace(/\.$/, '')

export default function MyCards() {
  usePageMeta('내 등록증')
  const { state } = useLocation() as { state?: { flash?: string } }
  const { data, loading, error, reload } = useAsync(() => api.listMyCharacters(), [])

  const remove = async (id: string, name: string) => {
    if (!confirm(`'${name}' 등록증을 삭제할까요? 결속 기록도 함께 지워집니다.`)) return
    try {
      await api.deleteCharacter(id)
      reload()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      {state?.flash && (
        <div className="mb-6">
          <Flash>{state.flash}</Flash>
        </div>
      )}
      <SectionHead
        title="내 등록증"
        action={
          <Link to="/office/cards/new" className="btn btn-primary btn-sm">
            등록증 신청
          </Link>
        }
      />
      <p className="-mt-1 mb-6 text-[14px] text-muted-foreground">한 계정에서 여러 명을 등록할 수 있습니다. 이름 · 등급 등을 고치면 다시 심사를 받습니다.</p>
      {loading && <Loading />}
      {error ? <ErrorBox error={error} /> : null}
      {data?.length === 0 && (
        <div className="border border-dashed border-rule px-6 py-14 text-center">
          <p className="text-[20px] font-bold">등록한 각성자가 없습니다</p>
          <Link to="/office/cards/new" className="btn btn-primary mt-5">
            등록증 신청 <Icon.arrow />
          </Link>
        </div>
      )}
      {!!data?.length && (
        <div className="overflow-x-auto">
          <table className="table-doc min-w-[820px]">
            <thead>
              <tr>
                <th className="w-40">등록번호</th>
                <th>이름</th>
                <th className="w-24">구분</th>
                <th className="w-16">등급</th>
                <th className="w-48">상태</th>
                <th className="w-24">갱신일</th>
                <th className="w-40 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td className="font-mono text-[12px] text-muted-foreground">{registryNo(c.id, c.kind, c.grade)}</td>
                    <td>
                      <b className="font-bold">{c.name}</b>
                      {c.codename && <span className="ml-2 text-[13px] text-muted-foreground">{c.codename}</span>}
                    </td>
                    <td>
                      <KindBadge kind={c.kind} />
                    </td>
                    <td>
                      <GradeBadge grade={c.grade} size="sm" />
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        <StatusPill status={c.status} />
                        {!c.is_public && <Pill>비공개</Pill>}
                        {c.locked && (
                          <Pill tone="danger">
                            <Icon.lock /> 조치
                          </Pill>
                        )}
                      </span>
                    </td>
                    <td className="font-mono text-[13px] text-muted-foreground">{shortDate(c.updated_at)}</td>
                    <td className="text-right text-[13px]">
                      <span className="inline-flex gap-3">
                        <Link to={`/registry/${c.id}`} className="hover:text-seal">
                          보기
                        </Link>
                        <Link to={`/office/cards/${c.id}/edit`} className="hover:text-seal">
                          수정
                        </Link>
                        <button type="button" onClick={() => remove(c.id, c.name)} className="text-destructive hover:underline">
                          삭제
                        </button>
                      </span>
                    </td>
                  </tr>
                  {c.status === 'rejected' && c.review_note && (
                    <tr>
                      <td />
                      <td colSpan={6} className="-mt-2 text-[13px] text-destructive">
                        반려 사유: {c.review_note}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
