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

// ── 팀
export const TEAM_ROLES = [
  { value: '팀장', desc: '팀을 이끈다' },
  { value: '선봉', desc: '앞에서 싸우는 센티넬' },
  { value: '앵커', desc: '팀을 붙잡아 두는 가이드' },
  { value: '관측', desc: '탐지 · 정찰' },
  { value: '지원', desc: '오퍼레이터 · 의무 · 기술' },
] as const

export const TEAM_COLORS = ['#f0c419', '#8fb4dc', '#e8892a', '#d8432c', '#7fae7a', '#b9a7e0', '#a5a296']

// ── 기수
export const COHORT_STATUS = [
  { value: 'ready', label: '준비 중' },
  { value: 'recruiting', label: '모집 중' },
  { value: 'running', label: '활동 중' },
  { value: 'closed', label: '마감' },
] as const
export const cohortStatusLabel = (s: string) => COHORT_STATUS.find((x) => x.value === s)?.label ?? s

// ── 선택형 결속 조율: 대화 없이 체크로 합의한다
export const RELATION_OPTIONS = [
  { value: 'mission', label: '함께 임무 로그' },
  { value: 'daily', label: '일상 로그' },
  { value: 'past', label: '과거 인연 추가' },
  { value: 'conflict', label: '갈등 · 다툼' },
  { value: 'crisis', label: '부상 · 위기 묘사' },
  { value: 'guiding', label: '가이딩 접촉 묘사' },
  { value: 'feelings', label: '감정선 발전' },
  { value: 'cameo', label: '내 로그에 상대 등장' },
] as const
export const relationOptionLabel = (v: string) => RELATION_OPTIONS.find((x) => x.value === v)?.label ?? v

export const RELATION_TEMPS = [
  { value: 'light', label: '가볍게' },
  { value: 'normal', label: '보통' },
  { value: 'deep', label: '깊게' },
] as const
export const relationTempLabel = (v?: string) => RELATION_TEMPS.find((x) => x.value === v)?.label ?? null

// ── 조사: 주사위 없이 대상 × 방법으로 단서를 찾는다
export const APPROACHES = [
  { value: 'sense', label: '감각 탐지', kind: 'sentinel', desc: '센티넬만. 소리 · 냄새 · 흔적을 쫓는다.' },
  { value: 'psyche', label: '정신 감응', kind: 'guide', desc: '가이드만. 남아 있는 감정과 기억을 읽는다.' },
  { value: 'records', label: '기록 열람', kind: null, desc: '관측 기록 · 출입 기록 · 보고서를 뒤진다.' },
  { value: 'interview', label: '탐문', kind: null, desc: '목격자와 관계자에게 묻는다.' },
  { value: 'search', label: '현장 수색', kind: null, desc: '현장을 직접 뒤진다.' },
] as const
export const approachLabel = (v: string) => APPROACHES.find((x) => x.value === v)?.label ?? v

// ── 운영진 문의함
export const INBOX_CATEGORIES = [
  { value: 'question', label: '문의' },
  { value: 'suggestion', label: '건의' },
  { value: 'report', label: '신고' },
  { value: 'break', label: '휴식 · 하차' },
  { value: 'etc', label: '기타' },
] as const
export const inboxCategoryLabel = (v: string) => INBOX_CATEGORIES.find((x) => x.value === v)?.label ?? v

// ── 대나무숲 (캐입 익명 게시판)
export const REVEAL_OPTIONS = [
  { value: 'none', label: '완전 익명' },
  { value: 'dept', label: '소속 부서 표시' },
  { value: 'team', label: '소속 팀 표시' },
] as const

// ── 편입 신청서 선택 항목
export const APPLY_WANTS = ['게이트 임무', '사건 조사', '팀 일상', '라이벌 · 경쟁', '성장', '관계']
export const APPLY_FREQ = ['거의 매일', '주 3~4일', '주 1~2일', '불규칙']
export const APPLY_LABELS: [string, string][] = [
  ['name', '캐릭터 이름'],
  ['kind', '구분'],
  ['grade', '희망 등급'],
  ['age', '나이'],
  ['one_line', '한 줄 소개'],
  ['keywords', '성격 키워드'],
  ['ability', '능력 · 감각'],
  ['background', '이력'],
  ['role', '희망 팀 역할'],
  ['wants', '해 보고 싶은 것'],
  ['freq', '활동 빈도'],
  ['message', '운영진에게 한마디'],
]
