import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { parseProfileDoc } from '../components/ProfileDoc'
import { TeamLabel } from '../components/TeamMark'
import { saveElementAsPng } from '../lib/exportImage'
import { Avatar, Emblem, Empty, ErrorBox, FieldRow, GradeBadge, Icon, KindBadge, Loading, Pill, SectionHead, StatusPill, WRAP, cx } from '../components/ui'
import { DETAIL_FIELDS, RELATION_TONE, WORLD, gradeLabel, kindLabel } from '../config/world'
import { api, useAsync, useAuth, usePageMeta } from '../lib/backend'
import type { Relation } from '../lib/types'
import { fmtDate, matchingRate, registryNo } from '../lib/util'

export default function RegistryDetail() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const ch = useAsync(() => api.getCharacter(id), [id, session?.userId])
  const rels = useAsync(() => api.listRelationsOf(id), [id, session?.userId])
  const c = ch.data
  const canManage = !!c && !!session && (c.owner_id === session.userId || session.role === 'admin')
  const secret = useAsync(() => (canManage ? api.getSecret(id) : Promise.resolve(null)), [id, canManage])
  const recordRef = useRef<HTMLElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<unknown>(null)
  usePageMeta(c ? `${c.name} 등록 기록` : '등록 기록', c ? `${kindLabel(c.kind)} ${c.grade}급 · ${c.affiliation ?? ''}` : undefined)

  if (ch.loading && !c) return <Loading />
  if (ch.error)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <ErrorBox error={ch.error} />
      </div>
    )
  if (!c)
    return (
      <div className={cx(WRAP, 'py-16')}>
        <Empty title="볼 수 없는 기록입니다">
          없거나, 비공개이거나, 심사 중인 등록증입니다.
          <div className="mt-5">
            <Link to="/registry" className="btn">
              명부로 돌아가기
            </Link>
          </div>
        </Empty>
      </div>
    )

  const d = c.details ?? {}
  const basic = DETAIL_FIELDS.filter((f) => f.section === 'basic')
  const docs = DETAIL_FIELDS.filter((f) => f.section === 'doc' && d[f.key])
  const regNo = registryNo(c.id, c.kind, c.grade)
  const approved = c.status === 'approved'

  return (
    <section className={cx(WRAP, 'pt-8')}>
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          홈
        </Link>
        <span>›</span>
        <Link to="/registry" className="hover:text-foreground">
          요원 명부
        </Link>
        <span>›</span>
        <span className="font-mono text-foreground">{regNo}</span>
      </nav>

      {canManage && (
        <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center gap-3 border border-dashed border-rule px-4 py-3 text-[14px]">
          <span className="text-muted-foreground">관리인에게만 보임</span>
          <StatusPill status={c.status} />
          {!c.is_public && <Pill>명부 비공개</Pill>}
          {c.locked && (
            <Pill tone="danger">
              <Icon.lock /> 관리부 비공개 조치
            </Pill>
          )}
          {c.review_note && <span className="text-muted-foreground">심사 의견: {c.review_note}</span>}
          <button type="button" onClick={() => navigate(`/office/cards/${c.id}/edit`)} className="btn btn-sm ml-auto">
            등록증 수정
          </button>
        </div>
      )}

      <article ref={recordRef} className="relative mx-auto mt-6 max-w-4xl border border-rule bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b border-rule px-6 py-4 sm:px-10">
          <Emblem size={24} />
          <span className="font-black tracking-[-0.02em]">{WORLD.orgName}</span>
          <span className="ml-auto font-mono text-[13px] text-muted-foreground">등록번호 {regNo}</span>
        </header>
        <p className="whitespace-nowrap pt-9 text-center text-[24px] font-black tracking-[0.2em] [text-indent:0.2em] sm:text-[38px] sm:tracking-[0.45em] sm:[text-indent:0.45em]">각성자 등록 기록</p>

        <div className="grid gap-6 px-6 pb-8 pt-8 sm:px-10 md:grid-cols-[1fr_150px]">
          <div className="border-t-2 border-foreground">
            <div className="grid sm:grid-cols-2">
              <div className="sm:border-r sm:border-rule">
                <FieldRow label="성명">
                  <b className="font-bold">{c.name}</b>
                </FieldRow>
                <FieldRow label="코드네임">{c.codename}</FieldRow>
                <FieldRow label="구분">
                  <KindBadge kind={c.kind} />
                </FieldRow>
                <FieldRow label="등급">
                  <span className="inline-flex items-center gap-2">
                    <GradeBadge grade={c.grade} size="sm" />
                    {gradeLabel(c.grade)}
                  </span>
                </FieldRow>
                <FieldRow label="소속">{c.affiliation}</FieldRow>
                <FieldRow label="팀">{c.team_id ? <TeamLabel teamId={c.team_id} role={c.team_role} /> : null}</FieldRow>
                <FieldRow label="기수">{c.cohort_no ? `제${c.cohort_no}기` : null}</FieldRow>
                {session?.role && <FieldRow label="관리인">{c.owner_name}</FieldRow>}
                <FillerRows count={basic.length - (session?.role ? 8 : 7)} />
              </div>
              <div className="border-t border-rule sm:border-t-0">
                {basic.map((f) => (
                  <FieldRow key={f.key} label={f.label}>
                    {d[f.key]}
                  </FieldRow>
                ))}
                <FillerRows count={(session?.role ? 8 : 7) - basic.length} />
              </div>
            </div>
          </div>
          <div className="order-first flex flex-col items-center md:order-none md:block">
            <Avatar src={c.avatar_url} name={c.name} kind={c.kind} className="w-[150px]" />
            <svg viewBox="0 0 150 26" className="mt-2 h-6 w-[150px] text-foreground" aria-hidden="true" preserveAspectRatio="none">
              {Array.from(regNo + c.id)
                .slice(0, 34)
                .map((ch, i) => (
                  <rect key={i} x={i * 4.4} y="0" width={(ch.charCodeAt(0) % 3) + 1} height="26" fill="currentColor" />
                ))}
            </svg>
          </div>
        </div>

        {docs.length > 0 && (
          <div className="border-t border-rule px-6 py-8 sm:px-10">
            <p className="mb-4 text-[15px] font-bold">기록 사항</p>
            <div className="space-y-5">
              {docs.map((f, i) => (
                <div key={f.key} className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                  <span className="text-[14px] text-muted-foreground">
                    {i + 1}. {f.label}
                  </span>
                  <p className="whitespace-pre-line text-[15.5px] leading-[1.85]">{d[f.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="border-t border-rule px-6 pb-12 pt-8 text-center sm:px-10">
          <p className="text-[15px]">{approved ? '위 사람이 협회 요원으로 등록되었음을 증명합니다.' : '심사가 끝나지 않은 기록입니다.'}</p>
          <div className="relative mx-auto mt-5 inline-block">
            <p className="font-mono text-[13px] text-muted-foreground">{fmtDate(approved ? c.updated_at : c.created_at)}</p>
            <p className="mt-1 text-[22px] font-black tracking-[0.15em]">{WORLD.orgName}장</p>
            {approved ? (
              <span className="stamp stamp-in absolute -right-[88px] -top-1 text-[17px] text-seal">
                등 록<small>판정국</small>
              </span>
            ) : (
              <span className="stamp absolute -right-[88px] -top-1 text-[17px] text-muted-foreground">
                {c.status === 'rejected' ? '반 려' : '심 사'}
                <small>판정국</small>
              </span>
            )}
          </div>
        </footer>
      </article>

      <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-end gap-3">
        {parseProfileDoc(d.profile_doc) ? (
          <Link to={`/registry/${c.id}/profile`} className="btn btn-sm btn-primary mr-auto">
            프로필 문서 열기
          </Link>
        ) : (
          canManage && (
            <Link to={`/office/cards/${c.id}/edit`} className="btn btn-sm mr-auto">
              프로필 문서 꾸미기
            </Link>
          )
        )}
        {saveErr ? <span className="text-[13px] text-destructive">이미지를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.</span> : null}
        <button
          type="button"
          className="btn btn-sm"
          disabled={saving}
          onClick={async () => {
            if (!recordRef.current) return
            setSaving(true)
            setSaveErr(null)
            try {
              await saveElementAsPng(recordRef.current, `${WORLD.orgName}_등록기록_${c.name}`)
            } catch (e) {
              setSaveErr(e)
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? '만드는 중…' : '이미지로 저장'}
        </button>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-12 lg:grid-cols-2">
        <div>
          <SectionHead
            title="결속 관계"
            action={
              <Link to="/registry/map" className="text-[13px] text-muted-foreground hover:text-seal">
                관계도 →
              </Link>
            }
          />
          {rels.loading && <Loading />}
          {rels.data?.length === 0 && <p className="py-8 text-center text-[14px] text-muted-foreground">성립된 결속이 없습니다.</p>}
          <ul>
            {(rels.data ?? []).map((r) => (
              <BondRow key={r.id} r={r} selfId={c.id} selfKind={c.kind} />
            ))}
          </ul>
        </div>

        {canManage && (
          <div>
            <SectionHead title="비공개 설정" />
            <p className="text-[13px] text-muted-foreground">본인과 관리부만 볼 수 있습니다.</p>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.85]">{secret.data || <span className="text-muted-foreground">적힌 내용이 없습니다.</span>}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function BondRow({ r, selfId, selfKind }: { r: Relation; selfId: string; selfKind: string }) {
  const other = r.from_character_id === selfId ? r.to : r.from
  const otherId = r.from_character_id === selfId ? r.to_character_id : r.from_character_id
  const pair = other && ((selfKind === 'sentinel' && other.kind === 'guide') || (selfKind === 'guide' && other.kind === 'sentinel'))
  const rate = pair ? matchingRate(selfId, otherId) : null
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-rule py-3">
      <Pill tone={RELATION_TONE[r.kind] ?? 'muted'} solid>
        {r.kind}
      </Pill>
      <span className="min-w-0 truncate">
        {other ? (
          <Link to={`/registry/${other.id}`} className="font-bold hover:text-seal">
            {other.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">비공개 요원</span>
        )}
        {other && <span className="ml-2 text-[13px] text-muted-foreground">{kindLabel(other.kind)} · {other.grade}급</span>}
      </span>
      <span className="font-mono text-[13px] text-muted-foreground">{rate != null ? `매칭 ${rate.toFixed(1)}%` : ''}</span>
    </li>
  )
}

/** 두 열의 칸 수를 맞추는 빈 줄 (넓은 화면에서만) */
function FillerRows({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="hidden h-[46px] grid-cols-[7.5rem_1fr] border-b border-rule last:border-b-0 sm:grid" aria-hidden="true">
          <div className="bg-muted" />
        </div>
      ))}
    </>
  )
}
