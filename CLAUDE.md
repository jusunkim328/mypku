# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

PKU(페닐케톤뇨증) 환자를 위한 AI 기반 맞춤형 식단 관리 PWA.

- **대상**: PKU 환자 (신생아~성인), 보호자
- **핵심 기능**: Gemini Vision 음식 분석 + 페닐알라닌(Phe) 추적 + Exchange 단위 관리
- **서비스 언어**: 영어 (기본), 한국어, 러시아어
- **개발 커뮤니케이션**: 한국어

---

## 개발 명령어

```bash
bun dev          # 개발 서버 (localhost:3000)
bun build        # 프로덕션 빌드
bun lint         # ESLint 검사
bun test         # Vitest watch 모드
bun test:run     # Vitest 단회 실행
bun test:coverage # 커버리지 리포트
```

### Docker 환경

```bash
docker-compose up -d                   # 컨테이너 시작 (localhost:3001)
docker-compose exec mypku-dev bash     # 컨테이너 진입
docker-compose down                    # 컨테이너 종료
```

---

## 기술 스택

```
Frontend: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
Backend: Next.js API Routes + Supabase (Auth/DB/Storage) + Gemini API
상태관리: Zustand 5.x (localStorage persist)
다국어: next-intl (en, ko, ru)
PWA: Serwist (Service Worker)
테스트: Vitest + Testing Library
배포: Vercel
```

---

## 아키텍처

### 데이터 흐름

```
[사진/음성/바코드/진단서] → API Route → Gemini/외부 API → FoodItem[] → Zustand Store
                                                               ↓
                                비로그인: localStorage ← useMealRecords → 로그인: Supabase DB
```

### 인증 흐름

```
[Google OAuth] → /auth/callback → exchangeCodeForSession() → AuthContext
                                                                  ↓
                                            useAuth() 훅으로 전역 접근
```

### 다국어 라우팅

- `/` → 영어 (기본, `localePrefix: "as-needed"`)
- `/ko` → 한국어
- `/ru` → 러시아어
- `Link`, `useRouter`, `usePathname`은 반드시 `@/i18n/navigation`에서 import
- 번역 텍스트는 `useTranslations()` 훅 사용
- 번역 파일: `messages/en.json`, `messages/ko.json`, `messages/ru.json`

### 클라이언트/서버 분리

- 페이지 파일 (`app/[locale]/*/page.tsx`): 서버 컴포넌트, 메타데이터 정의
- 클라이언트 로직: `components/pages/*Client.tsx`에 `"use client"` 디렉티브와 함께 작성
- Gemini API 호출: 반드시 `app/api/` 라우트를 통해서만 (GEMINI_API_KEY 서버 전용)

### 보호자 모드 (Caregiver)

보호자가 연결된 환자의 데이터를 조회할 수 있는 기능.

```
보호자: sendInvite(이메일) → caregiver_links (pending) → 초대 토큰
환자: /invite/[token] → acceptInvite() → caregiver_links (accepted)
보호자: PatientSelector → setActivePatient() → 환자 데이터 조회 (RLS)
```

- `hooks/usePatientContext.ts`: 현재 보고 있는 환자 선택 (Zustand, 메모리 전용)
- `hooks/useFamilyShare.ts`: 가족 공유 초대/수락/취소
- `useCanEdit()` / `useTargetUserId()`: 편집 권한 및 대상 사용자 결정
- `caregiver_links` 테이블의 RLS 정책으로 데이터 접근 제한

---

## 핵심 모듈

### Supabase 클라이언트
- **브라우저**: `lib/supabase/client.ts` (싱글톤 패턴)
- **서버**: `lib/supabase/server.ts` (async, cookies() 사용)
- **미들웨어**: `lib/supabase/middleware.ts` (세션 갱신)

### API 라우트 인증 패턴
인증 필요 API에서 `lib/apiAuth.ts`의 `requireAuth()` 사용:
```typescript
const auth = await requireAuth();
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { supabase, user } = auth;
```

### 상태 관리 (Zustand)
- `hooks/useNutritionStore.ts`: 영양 데이터, 일일 목표
- `hooks/useMealRecords.ts`: Supabase/localStorage 통합 식사 기록
- `hooks/useFormulaRecords.ts`: 포뮬러 섭취 추적
- `hooks/useBloodLevels.ts`: 혈중 검사 기록
- `hooks/useStreakStore.ts`: 연속 기록 추적
- `hooks/useBadgeStore.ts`: 뱃지/업적

### 사용자 설정 동기화 패턴
- `hooks/useUserSettings.ts`: 로그인/비로그인 상태에 따른 데이터 소스 통합
- `contexts/AuthContext.tsx`: profile, dailyGoals 상태 관리 + Supabase 동기화
- 로그인 시 Supabase 우선, 비로그인 시 localStorage 사용
- 로그인 전환 시 `migrateLocalDataIfNeeded()`로 로컬 데이터 자동 마이그레이션
- DB nullable 필드는 기본값 적용 (`dbGoals.calories ?? 2000`)

### PKU 전용 기능
- `components/onboarding/`: 온보딩 플로우에서 Phe 허용량/Exchange 단위 설정
- `components/onboarding/DiagnosisOCR.tsx`: 진단서 사진으로 설정값 자동 추출
- `components/dashboard/PheRemainingCard.tsx`: 일일 Phe 잔여량 표시 (녹→노→빨 프로그레스)
- Exchange 계산: 1 Exchange = 50mg Phe (기본값, 커스터마이즈 가능)
- PKU Safety Level: `safe` (≤20mg), `caution` (≤100mg), `avoid` (>100mg)

### PKU 식품 DB
- `lib/pkuFoodDatabase.ts`: PKU 식품 검색, 바코드 조회, 외부 API 폴백
- `lib/foodDataApis.ts`: 외부 식품 API 연동 (USDA, 식약처)
- Supabase `pku_foods` 테이블에 캐싱

### PWA/Service Worker
- `app/sw.ts`: Serwist 기반 런타임 캐싱 전략
  - 정적 자산: CacheFirst (30일)
  - 이미지: CacheFirst (30일)
  - 바코드 API: CacheFirst (90일)
  - AI API: NetworkFirst (타임아웃 30초)
- `app/[locale]/~offline/`: 오프라인 폴백 페이지

---

## DB 스키마 (Supabase)

```
profiles              # 사용자 프로필 (auth.users 연동)
health_conditions     # PKU 건강 상태 (별도 동의 필요)
daily_goals           # 일일 영양 목표
meal_records          # 식사 기록 (total_nutrition: JSONB)
food_items            # 개별 음식 아이템 (nutrition: JSONB)
pku_foods             # PKU 식품 DB (외부 API 캐싱)
blood_level_records   # 혈중 Phe 검사 기록
formula_settings      # 포뮬러(특수분유) 설정
caregiver_links       # 보호자-환자 관계 (초대/수락/거부)
```

- 모든 테이블에 RLS 정책 적용 (auth.uid() 기반)
- `caregiver_links`는 보호자/환자 양쪽 RLS 정책이 별도 적용
- Storage 버킷: `meal-images` (Public)

---

## 개발 규칙

### Git 커밋 규칙
- **커밋은 사용자의 명시적 허락이 있을 때만 진행**
- 사용자가 "/git-commit", "커밋해줘" 등 명시적으로 요청하기 전까지 자동 커밋 금지
- 커밋 전 반드시 변경 사항 요약을 보여주고 확인 받기

### PKU 전용 앱
- 페닐알라닌(mg) 추적이 핵심 지표
- `pkuSafety` 등급과 `exchanges` 필드는 FoodItem에 필수
- 공통 영양소: 칼로리, 단백질, 탄수화물, 지방

### 타입 정의
- `types/nutrition.ts`: `NutritionData`, `FoodItem`, `MealRecord`, `PKUSafetyLevel`
- `lib/supabase/types.ts`: Supabase 테이블 타입 (MCP 자동 생성)

### Supabase 타입 자동 생성
DB 스키마 변경 시 Supabase MCP로 타입 재생성:
```
mcp__plugin_supabase_supabase__generate_typescript_types(project_id: "uviydudvwhhhgvsussyx")
```
- 자동 생성된 타입에는 `__InternalSupabase` 섹션이 포함되어 타입 추론이 정확함
- 수동 타입 정의 시 `.from().update()` 등에서 `never` 타입 에러 발생 가능

### 에러 처리
- API 재시도는 Exponential Backoff 방식 사용 (`lib/pkuFoodDatabase.ts` 참조)
- Rate limit (429) 발생 시 지수적 대기 시간 증가
- Supabase 쿼리 타임아웃: AbortController + `.abortSignal()` 사용
  ```typescript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  await supabase.from("profiles").select("*").abortSignal(controller.signal);
  clearTimeout(timeout);
  ```

### 숫자 입력 UI 주의사항
- **공통 컴포넌트**: `components/ui/NumberInput.tsx` — 범위 검증, 전체 선택, 빈 문자열 처리가 포함된 숫자 입력. 새로운 숫자 입력 필드에서 우선 사용 검토
- **onFocus 전체 선택**: `onFocus={(e) => e.target.select()}` — 기존값을 지우고 입력하는 UX 문제 해결. 모든 `type="number"` 입력에 적용 필수
- **입력 중 범위 강제 금지**: `onChange` 시 min/max를 강제하면 여러 자릿수 입력이 불가능해짐 (예: `300` 입력 시 `3`에서 잘림). 입력 중 자유 타이핑 허용, `onBlur` 시점에만 범위 검증
- **빈 문자열 허용**: 숫자를 지우는 도중 `""` 상태를 허용해야 자연스러운 편집 가능. `onBlur` 시 빈 값이면 `defaultValue`로 복원

### 면책조항
- 모든 페이지에 `<Disclaimer />` 컴포넌트 표시 필수
- 의료 진단/치료 조언 제공 금지

---

## Dev Auth (개발 테스트용)

Chrome DevTools MCP에서 Google SSO 없이 인증 상태를 테스트할 수 있는 기능.

### 사용법 (브라우저 콘솔 또는 evaluate_script)
```javascript
devLogin()                                    // Mock 사용자로 로그인
devLogin({ dailyGoals: { phenylalanine_mg: 400 } })  // 커스텀 설정
devLogout()                                   // 로그아웃
devAuthState()                                // 현재 상태 확인
```

### 동작 방식
- `lib/devAuth.ts`: Mock 사용자 데이터, 전역 함수 정의
- `contexts/AuthContext.tsx`: Dev Auth 상태 감지 및 처리
- `hooks/useMealRecords.ts`: Dev Auth 모드에서 Supabase 대신 localStorage 사용
- 개발 환경에서만 동작 (프로덕션 비활성화)

---

## 환경 변수

```env
GEMINI_API_KEY=xxx                    # 서버 전용 - 클라이언트 노출 금지!
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
