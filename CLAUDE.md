# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

PKU(페닐케톤뇨증) 환자를 위한 AI 기반 맞춤형 식단 관리 PWA.

- **대상**: PKU 환자 (1차), 일반 건강 관리 사용자 (2차)
- **핵심 기능**: Gemini Vision 음식 분석 + 페닐알라닌 추적 + AI 코칭
- **서비스 언어**: 영어 (기본), 한국어
- **개발 커뮤니케이션**: 한국어

---

## 개발 명령어

```bash
bun dev          # 개발 서버 (localhost:3000)
bun build        # 프로덕션 빌드
bun lint         # ESLint 검사
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
다국어: next-intl (en, ko)
PWA: Serwist (Service Worker)
배포: Vercel
```

---

## 아키텍처

### 데이터 흐름

```
[사진/음성/바코드] → API Route → Gemini/외부 API → FoodItem[] → Zustand Store
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

- `/` → 영어 (기본)
- `/ko` → 한국어
- `Link`, `useRouter`, `usePathname`은 반드시 `@/i18n/navigation`에서 import
- 번역 텍스트는 `useTranslations()` 훅 사용

### 클라이언트/서버 분리

- 페이지 파일 (`app/[locale]/*/page.tsx`): 서버 컴포넌트, 메타데이터 정의
- 클라이언트 로직: `components/pages/*Client.tsx`에 `"use client"` 디렉티브와 함께 작성
- Gemini API 호출: 반드시 `app/api/` 라우트를 통해서만 (GEMINI_API_KEY 서버 전용)

---

## 핵심 모듈

### Supabase 클라이언트
- **브라우저**: `lib/supabase/client.ts` (싱글톤 패턴)
- **서버**: `lib/supabase/server.ts` (async, cookies() 사용)
- **미들웨어**: `lib/supabase/middleware.ts` (세션 갱신)

### 상태 관리 (Zustand)
- `hooks/useNutritionStore.ts`: 영양 데이터, 일일 목표, 모드 설정
- `hooks/useMealRecords.ts`: Supabase/localStorage 통합 식사 기록
- `hooks/useStreakStore.ts`: 연속 기록 추적
- `hooks/useBadgeStore.ts`: 뱃지/업적

### 사용자 설정 동기화 패턴
- `hooks/useUserSettings.ts`: 로그인/비로그인 상태에 따른 데이터 소스 통합
- `contexts/AuthContext.tsx`: profile, dailyGoals 상태 관리 + Supabase 동기화
- 로그인 시 Supabase 우선, 비로그인 시 localStorage 사용
- DB nullable 필드는 기본값 적용 (`dbGoals.calories ?? 2000`)

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
profiles          # 사용자 프로필 (auth.users 연동)
health_conditions # PKU 건강 상태 (별도 동의 필요)
daily_goals       # 일일 영양 목표
meal_records      # 식사 기록 (total_nutrition: JSONB)
food_items        # 개별 음식 아이템 (nutrition: JSONB)
pku_foods         # PKU 식품 DB (외부 API 캐싱)
```

- 모든 테이블에 RLS 정책 적용 (auth.uid() 기반)
- Storage 버킷: `meal-images` (Public)

---

## 개발 규칙

### 듀얼 모드 (PKU/일반)
- PKU 모드: 페닐알라닌(mg) 추적 우선, `pkuSafety` 등급 표시
- 일반 모드: 칼로리 추적 우선
- 공통: 칼로리, 단백질, 탄수화물, 지방

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

### 면책조항
- 모든 페이지에 `<Disclaimer />` 컴포넌트 표시 필수
- 의료 진단/치료 조언 제공 금지

---

## 환경 변수

```env
GEMINI_API_KEY=xxx                    # 서버 전용 - 클라이언트 노출 금지!
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 현재 상태

### 완료
- [x] Gemini 2.0 Flash 음식 분석
- [x] 듀얼 모드 UI (PKU/일반)
- [x] 대시보드 및 영양소 시각화
- [x] 식사 기록 및 히스토리
- [x] AI 코칭 메시지
- [x] Supabase Auth (Google SSO)
- [x] 다국어 지원 (영어/한국어)
- [x] PWA (Serwist Service Worker)
- [x] PKU 식품 DB + 외부 API 통합
- [x] 바코드 스캐너
- [x] 음성 입력

### 진행 중
- [ ] Vercel 배포 설정
- [ ] 프로덕션 에러 핸들링
- [ ] localStorage → Supabase 마이그레이션 (첫 로그인 시)
- [ ] waterGoal/waterIntakes Supabase 동기화
- [ ] 오프라인 동기화 큐 (IndexedDB 기반)
