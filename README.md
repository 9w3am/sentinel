# 센티넬 협회 누리집

센티넬버스 세계관의 협회 공식 누리집처럼 보이는 초대제 자캐 커뮤 사이트입니다.

| 겉 (누구나) | 안 (편입 인가 번호로 가입한 계정) |
|---|---|
| 협회 소개 · 게이트 현황 · 등급 안내 · 알림마당 | 집무실 · 내 등록증(자캐) · 협회 게시판(기안문) |
| 요원 명부 · 결속 관계도 | 결속 신고(자관) · 매칭률 조회 |
| 로그인 · 편입 신청 | 관리부 콘솔(운영자) |

## 1. Supabase 준비 (한 번만)

1. Supabase 대시보드 → **SQL Editor** → `supabase/schema.sql` 전체 붙여 넣기 → **Run**
2. **Authentication → Sign In / Providers → Email → Confirm email 끄기 → Save**
   초대 번호가 문지기 역할을 하므로 메일 인증이 필요 없습니다. 켜 두면 가입 직후 로그인이 안 됩니다.

## 2. 첫 운영자 계정

1. SQL Editor에서 실행: `select code from public.invites where grant_admin and used_by is null;`
2. 나온 번호로 사이트 → **편입 신청** → 가입
3. 집무실에 **관리부 콘솔** 탭이 보이면 성공

## 3. 참여자 받기

관리부 콘솔 → **편입 인가 번호** → 메모 적고 발급 → 번호를 한 사람에게 하나씩 전달(1회용).
참여자가 등록증을 신청하면 **등록 심사**에서 승인해야 요원 명부에 올라갑니다.

## 개발

```bash
npm install
npm run dev                  # Supabase 연결 모드
npm run dev -- --mode demo   # 시연 모드 (DB 없이, 이 브라우저에만 저장)
npm run build
```

`main` 브랜치에 올리면 GitHub Actions가 빌드해서 GitHub Pages로 배포합니다.
`.env.production`의 anon 키는 공개용 키이며, 데이터 보호는 Supabase RLS 정책(`schema.sql`)이 담당합니다.

세계관 이름·소속·등급 명칭은 `src/config/world.ts`에서 바꿉니다.
