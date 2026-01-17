# MyPKU - AI 기반 맞춤형 식단 관리 서비스

PKU(페닐케톤뇨증) 환자와 일반 사용자를 위한 AI 기반 맞춤형 식단 관리 웹 서비스입니다.

## 핵심 기능

- **음식 사진 분석**: Gemini 3 Vision API로 음식 사진에서 영양성분 자동 추출
- **듀얼 모드 UI**: PKU 모드(페닐알라닌 추적) / 일반 모드(칼로리 추적)
- **일일 대시보드**: 오늘의 영양소 섭취량 시각화
- **AI 코칭**: 주간 섭취량 기반 맞춤형 피드백 메시지
- **식사 히스토리**: 최근 7일간 기록 조회

## 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **AI**: Gemini 3 Pro Vision API (2단계 프롬프트 엔지니어링)
- **상태관리**: Zustand (LocalStorage persist)
- **차트**: Recharts
- **배포**: Vercel

## 시작하기

### 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에 Gemini API 키를 설정하세요:

```
GEMINI_API_KEY=your_actual_api_key
```

### 개발 서버 실행

```bash
# 의존성 설치
bun install

# 개발 서버 실행
bun dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 프로덕션 빌드

```bash
bun run build
bun start
```

## 프로젝트 구조

```
mypku/
├── app/
│   ├── page.tsx              # 메인 대시보드
│   ├── analyze/page.tsx      # 음식 사진 분석
│   ├── history/page.tsx      # 식사 기록
│   ├── settings/page.tsx     # 모드 설정
│   └── api/
│       ├── analyze/route.ts  # Gemini API 음식 분석
│       └── coaching/route.ts # AI 코칭 메시지
├── components/
│   ├── dashboard/            # 대시보드 컴포넌트
│   ├── analyze/              # 분석 관련 컴포넌트
│   ├── pages/                # 페이지 클라이언트 컴포넌트
│   ├── common/               # 공통 컴포넌트
│   └── ui/                   # UI 컴포넌트 라이브러리
├── lib/
│   ├── gemini.ts             # Gemini API 클라이언트
│   └── prompts.ts            # 2단계 프롬프트
├── hooks/
│   └── useNutritionStore.ts  # Zustand 상태 관리
└── types/
    └── nutrition.ts          # TypeScript 타입
```

## 면책조항

본 서비스는 의료기기가 아니며, 질병의 유무를 판단하거나 치료할 수 없습니다. 중요한 의학적 결정은 반드시 의사와 상의하십시오. AI 분석 결과는 추정치이며 참고용입니다.

## 라이선스

MIT License
