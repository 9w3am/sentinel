// ─────────────────────────────────────────────
// 세계관 설정. 협회명·소속·등급 명칭 등은 여기만 고치면 사이트 전체에 반영된다.
// 실제 국가명·지명은 쓰지 않는다.
// ─────────────────────────────────────────────

export const WORLD = {
  orgName: '센티넬 협회',
  orgNameEn: 'SENTINEL ASSOCIATION',
  orgShort: 'SA',
  docPrefix: '협회',
  founded: 2009,
}

export type Kind = 'sentinel' | 'guide' | 'normal' | 'undetermined'

export const KINDS: { value: Kind; label: string; en: string }[] = [
  { value: 'sentinel', label: '센티넬', en: 'SENTINEL' },
  { value: 'guide', label: '가이드', en: 'GUIDE' },
  { value: 'normal', label: '비각성자', en: 'CIVILIAN' },
  { value: 'undetermined', label: '판정 대기', en: 'PENDING' },
]

export const kindLabel = (k: string) => KINDS.find((x) => x.value === k)?.label ?? k
export const kindEn = (k: string) => KINDS.find((x) => x.value === k)?.en ?? k

export const GRADES: { value: string; label: string; short: string; sentinel: string; guide: string }[] = [
  { value: 'SS', label: '특등급', short: '전략 자산', sentinel: '단독으로 대형 게이트를 닫는다. 전담 가이드 상시 동행.', guide: '여러 센티넬을 한 번에 안정시킨다.' },
  { value: 'S', label: '특급', short: '전담 가이드 필수', sentinel: '폭주 시 광역 피해. 전담 가이드 배정 의무.', guide: 'S급 이상 센티넬을 맡을 수 있다.' },
  { value: 'A', label: '1급', short: '최전선', sentinel: '게이트 최전선 투입.', guide: '현장 동행 가이딩.' },
  { value: 'B', label: '2급', short: '주력', sentinel: '일반 게이트 대응.', guide: '상주 가이딩.' },
  { value: 'C', label: '3급', short: '보조', sentinel: '소형 게이트 · 보조 임무.', guide: '응급 안정화.' },
  { value: 'D', label: '4급', short: '적응 지원', sentinel: '감각 일부만 발현.', guide: '안정 효과 미약.' },
  { value: 'E', label: '미분류', short: '판정 대기', sentinel: '막 각성. 판정 대기.', guide: '발현 확인 중.' },
]

export const GRADE_VALUES = GRADES.map((g) => g.value)
export const gradeLabel = (g: string) => GRADES.find((x) => x.value === g)?.label ?? g

export const BRANCHES = ['본부 · 대응국', '본부 · 가이딩센터', '본부 · 판정국', '본부 · 감찰부', '본부 · 연구소', '교육원', '제1지부', '제2지부', '제3지부', '제4지부', '민간 등록', '기타']

export const RELATION_KINDS = ['각인', '전담 페어', '임시 가이딩', '동기', '사제', '상하관계', '가족', '친우', '연인', '라이벌', '적대', '기타']

// 관계도·배지 색 (토큰 이름)
export const RELATION_TONE: Record<string, 'seal' | 'primary' | 'warn' | 'ok' | 'muted' | 'danger'> = {
  각인: 'seal',
  '전담 페어': 'seal',
  '임시 가이딩': 'warn',
  연인: 'seal',
  적대: 'danger',
  라이벌: 'danger',
  동기: 'primary',
  사제: 'primary',
  상하관계: 'primary',
  가족: 'ok',
  친우: 'ok',
  기타: 'muted',
}

export const GUIDING_TYPES = ['접촉형', '방사형', '혼합형', '해당 없음']

export const POST_CATEGORIES = [
  { value: 'general', label: '민원실', desc: '일반 문의 · 자유 기안' },
  { value: 'report', label: '임무 보고서', desc: '게이트 대응 경과 보고' },
  { value: 'request', label: '요청서', desc: '협조 · 결속 · 동행 요청' },
] as const

export const categoryLabel = (c: string) => POST_CATEGORIES.find((x) => x.value === c)?.label ?? c

export const ALERT_LEVELS = [
  { level: 1, name: '관심', en: 'LEVEL 1', desc: '특이 반응 없음. 평시 근무.' },
  { level: 2, name: '주의', en: 'LEVEL 2', desc: 'B급 이상 요원은 대기 상태를 유지하십시오.' },
  { level: 3, name: '경계', en: 'LEVEL 3', desc: '다수 게이트 징후. 전 지부 비상 연락망 가동.' },
  { level: 4, name: '심각', en: 'LEVEL 4', desc: '던전 브레이크 우려. 가용 요원 전원 소집.' },
  { level: 5, name: '비상', en: 'LEVEL 5', desc: '비상사태. 모든 요원은 상황실 지휘를 따릅니다.' },
]

export const INCIDENT_STATUS = [
  { value: 'open', label: '발생' },
  { value: 'responding', label: '대응 중' },
  { value: 'closed', label: '종결' },
] as const

export const incidentStatusLabel = (s: string) => INCIDENT_STATUS.find((x) => x.value === s)?.label ?? s

// 등록증 상세 항목. 폼과 상세 페이지가 이 목록을 그대로 따른다.
export const DETAIL_FIELDS: { key: string; label: string; type: 'text' | 'textarea'; placeholder?: string; section: 'basic' | 'doc' }[] = [
  { key: 'age', label: '연령', type: 'text', section: 'basic' },
  { key: 'gender', label: '성별', type: 'text', section: 'basic' },
  { key: 'height', label: '신장 / 체중', type: 'text', section: 'basic' },
  { key: 'awakened', label: '각성 시기', type: 'text', section: 'basic' },
  { key: 'guiding_type', label: '가이딩 유형', type: 'text', section: 'basic' },
  { key: 'spirit', label: '정신체', type: 'text', section: 'basic' },
  { key: 'quote', label: '한마디', type: 'text', section: 'doc' },
  { key: 'appearance', label: '외형', type: 'textarea', section: 'doc' },
  { key: 'personality', label: '성격', type: 'textarea', section: 'doc' },
  { key: 'ability', label: '능력 · 감각', type: 'textarea', section: 'doc' },
  { key: 'background', label: '이력', type: 'textarea', section: 'doc' },
  { key: 'etc', label: '비고', type: 'textarea', section: 'doc' },
]

// DB에 규정 문서가 없을 때 보여 줄 기본 규정. (관리부 콘솔에서 고치면 DB 값이 우선)
export const DEFAULT_RULES = {
  title: `${WORLD.orgName} 운영 규정`,
  body: `제1조 (목적)
이 규정은 ${WORLD.orgName} 누리집 이용과 요원 활동에 필요한 사항을 정한다.

제2조 (편입)
편입 인가 번호는 관리부가 한 사람에게 하나씩 발급한다. 번호는 다른 사람에게 넘길 수 없다.

제3조 (등록증)
요원은 등록증을 신청하고 관리부 심사를 거쳐 요원 명부에 오른다.

제4조 (게시판)
협회 게시판의 기안은 등록증 명의 또는 개인 명의로 작성한다. 다른 요원을 비방하거나 분쟁을 부추기는 기안은 삭제한다.

제5조 (결속)
결속은 상대 관리인이 수락해야 성립한다. 거절된 신청을 반복하지 않는다.

제6조 (게이트)
관리부가 공지한 게이트에는 종결 전까지 참여 신청을 할 수 있다.

제7조 (자격 정지)
규정을 거듭 어기면 관리부가 자격을 정지할 수 있다.

부칙
이 규정은 누리집 개설일부터 시행한다.`,
}
