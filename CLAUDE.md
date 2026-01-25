# MyPKU - AI 맞춤형 식단 관리 앱

## 프로젝트 개요

PKU(페닐케톤뇨증) 환자를 위한 AI 기반 맞춤형 식단 관리 앱.

- **대상**: PKU 환자 (1차), 일반 건강 관리 사용자 (2차)
- **핵심 기능**: Gemini Vision 음식 분석 + 페닐알라닌 추적 + AI 코칭
- **서비스 언어**: 영어 (기본), 한국어
- **개발 커뮤니케이션**: 한국어

---

## 기술 스택

```
Frontend: Next.js 15.3.8 (App Router) + React 19 + TypeScript + Tailwind CSS
Backend: Next.js API Routes + Supabase (Auth/DB/Storage) + Gemini API
상태관리: Zustand 5.x (localStorage persist)
다국어: next-intl (en, ko)
배포: Vercel
```

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

## 프로젝트 구조

```
app/
├── [locale]/               # 다국어 라우팅 (en, ko)
│   ├── page.tsx            # 홈
│   ├── analyze/            # 음식 분석
│   ├── history/            # 기록
│   ├── settings/           # 설정
│   └── auth/               # 로그인/에러
├── api/                    # API Routes (analyze, coaching)
└── auth/callback/          # OAuth 콜백

components/
├── pages/                  # 페이지별 클라이언트 컴포넌트
├── dashboard/              # 대시보드 (NutrientRing, DailyGoalCard, WeeklyChart, CoachingMessage)
├── analyze/                # 분석 (ImageUploader, AnalysisResult, FoodItemCard)
└── common/                 # 공통 (Disclaimer, Toast, Providers)

i18n/                       # 다국어 설정
├── routing.ts              # 라우팅 설정 (locales, defaultLocale)
├── request.ts              # 서버 설정
└── navigation.ts           # Link, useRouter, usePathname

messages/                   # 번역 파일
├── en.json                 # 영어
└── ko.json                 # 한국어

hooks/                      # 커스텀 훅
├── useNutritionStore.ts    # Zustand 영양 데이터
├── useAuth.ts              # Supabase 인증
└── useToast.ts             # 토스트 알림

lib/
├── gemini.ts               # Gemini API 클라이언트 (서버 전용!)
├── prompts.ts              # 프롬프트 템플릿
└── supabase/               # Supabase 클라이언트
```

---

## 환경 변수

```env
GEMINI_API_KEY=xxx                    # 서버 전용 - 클라이언트 노출 금지!
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 개발 규칙

### API 보안
- `GEMINI_API_KEY`는 절대 클라이언트에 노출 금지
- 모든 Gemini 호출은 `app/api/` 라우트를 통해서만

### 클라이언트 컴포넌트
- 클라이언트 컴포넌트는 `"use client"` 디렉티브 필수
- 페이지 로직은 `components/pages/*Client.tsx`에 작성

### 다국어 (L10n)
- `useTranslations()` 훅으로 번역 텍스트 사용
- `Link`는 `@/i18n/navigation`에서 임포트
- URL 라우팅: `/` (영어), `/ko` (한국어)

### 듀얼 모드 (PKU/일반)
- PKU 모드: 페닐알라닌(mg) 추적 우선
- 일반 모드: 칼로리 추적 우선
- 공통: 칼로리, 단백질, 탄수화물, 지방

### 면책조항
- 모든 페이지에 `<Disclaimer />` 컴포넌트 표시 필수
- 의료 진단/치료 조언 제공 금지

### 에러 처리
- API 재시도는 Exponential Backoff 방식 사용

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

### 진행 중
- [ ] Supabase Storage 이미지 저장
- [ ] Vercel 배포 설정
- [ ] 프로덕션 에러 핸들링
