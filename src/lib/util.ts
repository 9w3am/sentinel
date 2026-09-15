import { WORLD } from '../config/world'

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export function fmtDate(iso: string, withTime = false) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  const base = `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())}.`
  return withTime ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base
}

export function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return fmtDate(iso)
}

export function docNumber(no: number, iso: string) {
  return `${WORLD.docPrefix} 제${new Date(iso).getFullYear()}-${String(no).padStart(3, '0')}호`
}

function fnv(str: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 두 등록증 사이의 매칭률. 같은 쌍이면 언제나 같은 값. */
export function matchingRate(a: string, b: string) {
  const key = [a, b].sort().join(':')
  const h = fnv(key)
  // 분포를 가운데로 모으기 위해 두 값 평균
  const x = ((h & 0xffff) / 0xffff + ((h >>> 16) & 0xffff) / 0xffff) / 2
  return Math.round((31 + x * 68.99) * 100) / 100
}

export function matchingVerdict(rate: number) {
  if (rate >= 90) return { label: '각인 적합', tone: 'seal' as const }
  if (rate >= 75) return { label: '전담 페어 권고', tone: 'primary' as const }
  if (rate >= 55) return { label: '임시 가이딩 가능', tone: 'ok' as const }
  if (rate >= 40) return { label: '응급 시 한정', tone: 'warn' as const }
  return { label: '가이딩 비권고', tone: 'muted' as const }
}

/** 등록 번호 (표시용) */
export function registryNo(id: string, kind: string, grade: string) {
  const k = kind === 'sentinel' ? 'S' : kind === 'guide' ? 'G' : kind === 'normal' ? 'N' : 'U'
  const n = String(fnv(id) % 1000000).padStart(6, '0')
  return `${WORLD.orgShort}-${k}${grade}-${n}`
}

export function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `SNTL-${s.slice(0, 4)}-${s.slice(4)}`
}

/** 이미지를 정사각형에 가깝게 잘라 JPEG 로 축소 */
export async function resizeImage(file: File, max = 600): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    // 증명사진 비율 3:4 로 중앙 크롭
    const targetRatio = 3 / 4
    let sw = img.width
    let sh = img.height
    if (sw / sh > targetRatio) sw = sh * targetRatio
    else sh = sw / targetRatio
    const sx = (img.width - sw) / 2
    const sy = (img.height - sh) / 2
    const scale = Math.min(1, max / sh)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)
    canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.86))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function errMsg(e: unknown) {
  const raw = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (/INVALID_INVITE|Database error saving new user/i.test(raw)) return '편입 인가 번호가 유효하지 않습니다. 관리부에 문의할 것.'
  if (/Invalid login credentials/i.test(raw)) return '식별 정보가 일치하지 않습니다.'
  if (/already registered|already been registered/i.test(raw)) return '이미 등록된 이메일입니다.'
  if (/Password should be at least/i.test(raw)) return '비밀번호는 6자 이상이어야 합니다.'
  if (/Email not confirmed/i.test(raw)) return '이메일 확인이 완료되지 않은 계정입니다. 관리부에 문의할 것.'
  if (/CANNOT_DEMOTE_SELF/.test(raw)) return '본인의 관리 권한은 해제할 수 없습니다.'
  if (/FORBIDDEN|row-level security|permission denied/i.test(raw)) return '권한이 없습니다.'
  if (/incident_entries/i.test(raw) && /duplicate|unique/i.test(raw)) return '이미 참여 신청한 등록증입니다.'
  if (/duplicate key.*relations|relations_from_character_id/i.test(raw)) return '이미 신청되었거나 성립된 결속입니다.'
  if (/NOT_RECRUITING/.test(raw)) return '지금은 편입 신청을 받는 기간이 아닙니다.'
  if (/INVALID_FORM/.test(raw)) return '입력한 내용을 다시 확인해 주세요. 너무 길거나 빈 칸이 있습니다.'
  if (/APPROACH_KIND/.test(raw)) return '이 조사 방법은 해당 구분의 요원만 쓸 수 있습니다. 감각 탐지는 센티넬, 정신 감응은 가이드만 가능합니다.'
  if (/ALREADY_INVESTIGATED/.test(raw)) return '이 등록증으로 같은 대상을 같은 방법으로 이미 조사했습니다. 방법을 바꿔 보세요.'
  if (/CASE_CLOSED/.test(raw)) return '종결된 사건입니다.'
  if (/PLAY_NOT_READY/.test(raw)) return '이 기능은 아직 준비 중입니다. 관리부가 데이터베이스 설정(005)을 마치면 쓸 수 있습니다.'
  if (/THREAD_CLOSED/.test(raw)) return '닫힌 교신입니다. 더 이어 쓸 수 없습니다.'
  if (/THREAD_MEMBERS_ONLY|thread_posts.*row-level/i.test(raw)) return '참여자로 지정된 캐릭터만 이어 쓸 수 있는 교신입니다.'
  if (/EVENT_CLOSED/.test(raw)) return '참가 접수가 끝난 훈련입니다.'
  if (/MISSION_CLOSED/.test(raw)) return '마감된 의뢰입니다.'
  if (/ALREADY_RUN/.test(raw)) return '이 캐릭터는 이미 이 의뢰를 수행했습니다.'
  if (/NOT_FOUND/.test(raw)) return '찾을 수 없습니다. 삭제되었거나 주소가 바뀌었습니다.'
  if (/case_answers/i.test(raw) && /row-level|policy/i.test(raw)) return '승인된 내 등록증으로만, 사건이 열려 있을 때만 답을 낼 수 있습니다.'
  return raw
}
