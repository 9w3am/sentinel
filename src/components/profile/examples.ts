// 운영진이 꾸민 예시 문서. 꾸미기 창의 '예시 문서에서 고르기'와 /profile-examples 에서 쓴다.
// 인물 · 곡 · 사건은 전부 이 커뮤 안에서 지어낸 것이다.
import { emptyPage, newBlock, newSticker, themeDefaults, type BlockType, type PBlock, type Page, type ProfileDoc, type Sticker, type StickerKey, type ThemeKey } from './model'

const b = (t: BlockType, patch: Partial<PBlock> = {}): PBlock => {
  const base = newBlock(t)
  return { ...base, ...patch, style: { ...base.style, ...patch.style } }
}
const s = (k: StickerKey, patch: Partial<Sticker> = {}): Sticker => ({ ...newSticker(k), ...patch })
const pg = (blocks: PBlock[], stickers: Sticker[] = [], patch: Partial<Page> = {}): Page => ({ ...emptyPage(), ...patch, blocks, stickers })
const docOf = (theme: ThemeKey, pages: Page[], patch: Partial<ProfileDoc> = {}): ProfileDoc => ({ v: 2, ...themeDefaults(theme), ratio: 'doc', ...patch, pages })

export interface ProfileExample {
  key: string
  label: string
  desc: string
  tags: string[]
  make: (name: string) => ProfileDoc
}

export const PROFILE_EXAMPLES: ProfileExample[] = [
  {
    key: 'record',
    label: '현장 기록부',
    desc: '검정 서류 · 전투 센티넬',
    tags: ['기록부 테마', '상태창', '수치', '주의표', '연표'],
    make: (name) =>
      docOf('record', [
        pg(
          [
            b('spacer', { num: 70 }),
            b('title', { variant: 'stack', text: name || '한도윤', text2: 'S급 센티넬 · 제1팀 전투', style: { align: 'left', size: 'xl' } }),
            b('banner', { variant: 'strip', text: '뒤는 네가 봐. 앞은 내가 뚫는다.', text2: 'FIELD UNIT 01', style: { align: 'left' } }),
            b('spacer', { num: 50 }),
            b('window', { variant: 'system', text2: 'STATUS', text: '[구분] 센티넬 · S급\n[소속] 제1팀 · 전투\n[상태] 근무 중\n[경고] 폭주 수치 72%', style: { width: 'narrow' } }),
          ],
          [s('stamp', { x: 80, y: 15, r: -12, s: 20, text: '등록' }), s('barcode', { x: 22, y: 93, s: 22 }), s('tape', { x: 50, y: 1, r: 2, s: 26 }), s('crack', { x: 88, y: 60, s: 10 })],
          { pad: 'l' },
        ),
        pg(
          [
            b('heading', { variant: 'bar', text: '기본 정보' }),
            b('info', { variant: 'grid', rows: [['나이', '27'], ['키', '186cm'], ['각성', '17살 · 구역 12 붕괴 때'], ['정신체', '검은 들개'], ['좋아하는 것', '탄산수 · 조용한 새벽'], ['싫어하는 것', '사이렌 · 단 음식']] }),
            b('heading', { variant: 'number', text: '성격' }),
            b('tags', { variant: 'chip', text: '말수 적음, 먼저 나섬, 약속은 지킴, 잠을 못 잠' }),
            b('text', { text: '낯선 사람에게는 대답만 겨우 하는 편. 대신 팀원이 다치면 누구보다 먼저 뛰어든다.\n==고맙다는 말을 못 한다.== 대신 다음 날 커피를 사 온다.' }),
            b('heading', { variant: 'number', text: '능력' }),
            b('text', { text: '**충격파** · 주먹을 내지를 때 공기를 한 번 접었다 펴는 감각. 쓰고 나면 귀가 한동안 먹먹하다.' }),
            b('gauge', { variant: 'bar', rows: [['폭주 수치', '72'], ['가이드 매칭률', '64'], ['팀워크', '35']] }),
          ],
          [s('clip', { x: 7, y: 2, r: -10 }), s('sentinel', { x: 93, y: 5, s: 6 })],
        ),
        pg(
          [
            b('heading', { variant: 'bar', text: '러닝 주의' }),
            b('check', { variant: 'grid', rows: [['유혈 · 부상', '○'], ['폭주 · 발작', '○'], ['사망 소재', '✕'], ['감정선', '△'], ['과거사 언급', '△'], ['가이딩 접촉', '○']] }),
            b('heading', { variant: 'tab', text: '지나온 일' }),
            b('timeline', { variant: 'line', rows: [['17살', '구역 12 붕괴. 그날 각성'], ['19살', '교육원 수료'], ['24살', '제1팀 배치'], ['26살', '게이트 단독 돌파 · 징계 1회']] }),
            b('quote', { variant: 'box', text: '괜찮냐고 묻지 마. 괜찮을 때까지 서 있을 거니까.' }),
          ],
          [s('hazard', { x: 50, y: 99, s: 64 }), s('stain', { x: 86, y: 34, s: 16, o: 55 })],
        ),
      ]),
  },
  {
    key: 'status',
    label: '시스템 창',
    desc: '파란 상태창 · 가이드',
    tags: ['상태창 테마', '관계 카드', '메신저 대사', '음악'],
    make: (name) =>
      docOf('status', [
        pg(
          [
            b('spacer', { num: 90 }),
            b('title', { variant: 'spaced', text: name || '서은재', text2: 'GUIDE · A RANK', style: { align: 'center', size: 'l' } }),
            b('spacer', { num: 24 }),
            b('window', { variant: 'system', text2: 'SYSTEM', text: `[알림] 새 요원이 등록되었습니다\n[이름] ${name || '서은재'}\n[구분] 가이드 · A급\n[여력] 가이딩 여력 88%\n[주의] 접촉 가이딩 뒤 두통` }),
            b('gauge', { variant: 'segment', rows: [['가이딩 여력', '88'], ['정신 방벽', '61']] }),
          ],
          [s('guide', { x: 86, y: 11, s: 8 }), s('sparkle', { x: 12, y: 22, s: 6 }), s('sparkle', { x: 20, y: 84, s: 4, r: 20 }), s('label', { x: 22, y: 7, r: -4, s: 22, text: 'ID-0419' })],
          { pad: 'l' },
        ),
        pg(
          [
            b('heading', { variant: 'center', text: '관계' }),
            b('relation', { variant: 'card', rows: [['한도윤', '담당 센티넬', '말은 안 듣는데 손은 먼저 내민다', ''], ['유하람', '동기', '매점 우유를 같이 턴다', ''], ['윤 팀장', '감찰부 상관', '무섭다. 그런데 사탕을 준다', '']] }),
            b('heading', { variant: 'center', text: '좋아하는 것 · 싫어하는 것' }),
            b('likes', { text: '비 오는 소리, 딸기 우유, 정리된 서류', text2: '큰 소리, 약속 취소, 병원 냄새' }),
            b('speech', { variant: 'chat', text2: name || '서은재', text: '손 줘요. 오늘은 제가 먼저 할게요.' }),
            b('player', { variant: 'mini', text: '새벽 세 시의 통제선', text2: '파수국 방송실', num: 42 }),
          ],
          [s('star', { x: 92, y: 4, s: 5 })],
        ),
        pg(
          [
            b('heading', { variant: 'center', text: '러닝 주의' }),
            b('check', { variant: 'list', rows: [['가이딩 접촉 묘사', '○'], ['부상', '○'], ['정신 붕괴', '△'], ['사망 소재', '✕']] }),
            b('window', { variant: 'alert', text2: 'OWNER NOTE', text: '[답장] 느려도 꼭 합니다\n[환영] 가이딩 · 일상 · 사건 조사' }),
          ],
          [],
        ),
      ]),
  },
  {
    key: 'scrap',
    label: '스크랩북',
    desc: '종이 · 테이프 · 일상',
    tags: ['스크랩 테마', '필기체 제목', '메모지', '하루 연표'],
    make: (name) =>
      docOf('scrap', [
        pg(
          [
            b('spacer', { num: 60 }),
            b('title', { variant: 'script', text: name || '유하람', text2: 'Profile', style: { align: 'center' } }),
            b('banner', { variant: 'ribbon', text: '오늘도 무사히 퇴근하기', text2: 'daily log' }),
            b('spacer', { num: 30 }),
            b('quote', { variant: 'big', text: '매점 딸기 우유는 제가 다 샀어요. 죄송합니다.', style: { align: 'center' } }),
            b('tags', { variant: 'hash', text: '지원팀, 일상, 먹보, 수다쟁이', style: { align: 'center' } }),
          ],
          [
            s('tape', { x: 16, y: 4, r: -24 }),
            s('stripe', { x: 86, y: 97, r: -16 }),
            s('heart', { x: 88, y: 20, s: 7 }),
            s('flower', { x: 11, y: 70, s: 10 }),
            s('note', { x: 80, y: 66, r: 6, s: 20, text: '할 일\n보고서\n우유' }),
          ],
          { pad: 'l' },
        ),
        pg(
          [
            b('heading', { variant: 'tab', text: '기본 정보' }),
            b('info', { variant: 'inline', rows: [['나이', '23'], ['키', '162cm'], ['구분', '비각성자 · 지원'], ['팀', '제2팀 지원']] }),
            b('heading', { variant: 'tab', text: '하루' }),
            b('timeline', { variant: 'table', rows: [['08:40', '지각 직전 출근'], ['12:00', '매점 줄 서기'], ['15:30', '남의 보고서 대신 쓰기'], ['22:00', '팀실에서 야식']] }),
            b('text', { text: '잘 웃고 잘 운다. 무서운 건 **게이트**보다 **서류 반려**.' }),
            b('divider', { variant: 'wave' }),
            b('speech', { variant: 'bubble', text2: name || '유하람', text: '다들 밥은 먹고 싸우는 거죠?' }),
          ],
          [s('clip', { x: 90, y: 2, r: 14 }), s('star', { x: 8, y: 52, s: 5, r: -10 })],
        ),
      ]),
  },
  {
    key: 'classified',
    label: '기밀 파일',
    desc: '서류철 · 도장 · 감찰부',
    tags: ['기밀 파일 테마', '표', '가림 글씨', '도장'],
    make: (name) =>
      docOf('classified', [
        pg(
          [
            b('spacer', { num: 40 }),
            b('title', { variant: 'stack', text: name || '윤세하', text2: '감찰부 · 등급 비공개', style: { align: 'left' } }),
            b('banner', { variant: 'double', text: '열람 권한 3급 이상', text2: 'CONFIDENTIAL', style: { align: 'left' } }),
            b('info', { variant: 'table', rows: [['파일 번호', 'WB-07-112'], ['분류', '감찰부 요원'], ['등급', '■■'], ['상태', '근무 중'], ['비고', '일부 가림 처리됨']] }),
            b('text', { text: '~~주의~~ 대상은 **폭주 사고 조사**를 맡는다. 이전 소속 기록 없음.\n추가 열람은 국장 승인이 필요하다.' }),
          ],
          [s('stamp', { x: 78, y: 17, r: -14, s: 24, text: '기밀' }), s('label', { x: 26, y: 4, r: -3, s: 26, text: 'FILE No.112' }), s('stain', { x: 18, y: 88, s: 24, o: 50 }), s('pin', { x: 50, y: 1 })],
        ),
        pg(
          [
            b('heading', { variant: 'number', text: '조사 기록' }),
            b('timeline', { variant: 'line', rows: [['2023', '제3구역 폭주 사고 조사 · 종결'], ['2024', '내부 기록 삭제 건 · ■■■■'], ['2025', '제1팀 감찰 · 진행 중']] }),
            b('quote', { variant: 'plain', text: '거짓말은 기록에 남아요. 저는 기록을 읽는 사람이고요.' }),
            b('heading', { variant: 'number', text: '러닝 주의' }),
            b('check', { variant: 'grid', rows: [['심문 · 압박', '○'], ['배신 소재', '△'], ['유혈', '△'], ['사망 소재', '✕']] }),
          ],
          [s('circle', { x: 70, y: 22, s: 20, r: 8 }), s('arrow', { x: 40, y: 30, s: 12, r: 30 })],
        ),
      ]),
  },
  {
    key: 'night',
    label: '야간 근무',
    desc: '밤하늘 · 별 · 조용한 문서',
    tags: ['밤하늘 테마', '레코드', '별 구분선', '수치 숫자'],
    make: (name) =>
      docOf('night', [
        pg(
          [
            b('spacer', { num: 110 }),
            b('title', { variant: 'stack', text: name || '백유진', text2: 'Night Shift', style: { align: 'center', size: 'l' } }),
            b('divider', { variant: 'star' }),
            b('quote', { variant: 'plain', text: '별이 안 보이는 날엔 통제선 불빛을 세요.', style: { align: 'center' } }),
            b('spacer', { num: 40 }),
            b('player', { variant: 'vinyl', text: '야간 근무', text2: '파수국 방송실', num: 60 }),
          ],
          [s('sparkle', { x: 14, y: 12, s: 6 }), s('sparkle', { x: 84, y: 26, s: 4 }), s('star', { x: 72, y: 8, s: 4 }), s('sparkle', { x: 24, y: 64, s: 3 }), s('star', { x: 90, y: 80, s: 5 })],
          { pad: 'l' },
        ),
        pg(
          [
            b('heading', { variant: 'center', text: '함께 서는 사람' }),
            b('relation', { variant: 'list', rows: [['강태온', '각인 페어', '말보다 손이 먼저 닿는 사이', ''], ['서은재', '같은 교육원', '편지를 아직 못 돌려받았다', '']] }),
            b('gauge', { variant: 'number', rows: [['매칭률', '91'], ['함께한 임무', '14']] }),
            b('text', { text: '야간 근무를 자원한다. 낮에는 사람이 너무 많아서.\n*조용한 곳에서 오래 버티는 가이드.*', style: { align: 'center' } }),
            b('divider', { variant: 'dots' }),
            b('tags', { variant: 'plain', text: '야간조, 느린 말투, 손이 차가움', style: { align: 'center' } }),
          ],
          [s('guide', { x: 50, y: 4, s: 6 })],
        ),
      ]),
  },
  {
    key: 'poster',
    label: '경보 포스터',
    desc: '강한 대비 · 경고 띠',
    tags: ['포스터 테마', '색 블록 제목', '경고 창', '낙서 스티커'],
    make: (name) =>
      docOf('poster', [
        pg(
          [
            b('spacer', { num: 50 }),
            b('title', { variant: 'block', text: name || '강태온', text2: 'S급 센티넬 · 단독 투입 금지', style: { align: 'left', size: 'xl' } }),
            b('banner', { variant: 'skew', text: '반경 300m 감각 과부하 주의', text2: 'WARNING' }),
            b('spacer', { num: 30 }),
            b('window', { variant: 'alert', text2: 'ALERT', text: '[경보] 폭주 전조 감지\n[조치] 가이드 동행 필수\n[연락] 제1팀 팀장' }),
            b('gauge', { variant: 'segment', rows: [['폭주 수치', '91']] }),
          ],
          [s('hazard', { x: 50, y: 1, s: 70 }), s('hazard', { x: 50, y: 99, s: 70 }), s('crack', { x: 82, y: 38, s: 14 }), s('arrow', { x: 18, y: 62, s: 14, r: 20 }), s('circle', { x: 74, y: 76, s: 22 })],
        ),
        pg(
          [
            b('heading', { variant: 'bar', text: '프로필' }),
            b('info', { variant: 'table', rows: [['나이', '29'], ['소속', '제1팀 · 전투'], ['능력', '열 · 불꽃'], ['각인', '백유진']] }),
            b('speech', { variant: 'caption', text2: name || '강태온', text: '불 끄는 법은 모른다. 붙이는 법만 알지.' }),
            b('check', { variant: 'list', rows: [['화상 · 부상', '○'], ['폭주', '○'], ['사망 소재', '✕']] }),
          ],
          [s('bandage', { x: 86, y: 8, r: 30, s: 14 })],
        ),
      ]),
  },
]
