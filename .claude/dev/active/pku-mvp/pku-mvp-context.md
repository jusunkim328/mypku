# pku-mvp Context

**Last Updated**: 2026-01-17 20:40

## 프로젝트 구조

```
mypku/
├── app/
│   ├── page.tsx              # 메인 대시보드
│   ├── analyze/page.tsx      # 음식 사진 분석
│   ├── history/page.tsx      # 식사 기록
│   ├── settings/page.tsx     # 모드 설정
│   └── api/
│       ├── analyze/route.ts  # Gemini API 호출 (키 보호)
│       └── coaching/route.ts # AI 코칭 메시지 생성
├── components/
│   ├── dashboard/
│   │   ├── NutrientRing.tsx  # 원형 진행률
│   │   ├── DailyGoalCard.tsx
│   │   ├── WeeklyChart.tsx   # recharts 주간 차트
│   │   └── CoachingMessage.tsx
│   ├── analyze/
│   │   ├── ImageUploader.tsx
│   │   ├── AnalysisResult.tsx
│   │   └── FoodItemCard.tsx  # 개별 음식 수정 가능
│   └── common/
│       ├── ModeToggle.tsx
│       └── Disclaimer.tsx    # 웰니스 앱 면책조항
├── lib/
│   ├── gemini.ts             # Gemini 3 API 클라이언트 (서버 전용)
│   ├── prompts.ts            # 2단계 프롬프트
│   └── nutrition.ts          # 영양성분 계산
├── hooks/
│   └── useNutritionStore.ts  # Zustand 상태
└── types/
    └── nutrition.ts          # TypeScript 타입
```

## 핵심 파일

### 생성 예정
- `app/api/analyze/route.ts`: Gemini API 서버 사이드 호출 (키 보호)
- `lib/prompts.ts`: 2단계 프롬프트 템플릿
- `hooks/useNutritionStore.ts`: Zustand 상태 관리
- `components/dashboard/NutrientRing.tsx`: 핵심 UI 컴포넌트
- `components/common/Disclaimer.tsx`: 면책조항 컴포넌트

## 주요 결정사항

### 아키텍처 결정
- **결정**: Next.js 15 App Router + API Routes
- **이유**: 서버 사이드에서 Gemini API 키 보호, 풀스택 단일 프레임워크
- **대안**: Remix, Astro, 별도 백엔드
- **트레이드오프**: Vercel 종속성 증가, 하지만 빠른 배포

### UI 프레임워크 결정
- **결정**: Tailwind CSS + Konsta UI
- **이유**: 모바일 친화적 네이티브 스타일 UI, 빠른 개발
- **대안**: shadcn/ui, MUI, Chakra UI

### 상태관리 결정
- **결정**: Zustand + LocalStorage persist
- **이유**: 가벼움, 서버 없이 데이터 영속성
- **대안**: Redux, Jotai, Context API

## 데이터 구조

### 핵심 타입 정의
```typescript
type UserMode = 'pku' | 'general';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  phenylalanine_mg?: number;  // PKU 모드
}

interface FoodItem {
  id: string;
  name: string;
  estimatedWeight_g: number;
  nutrition: NutritionData;
  confidence: number;         // AI 신뢰도 0-1
  userVerified: boolean;      // 사용자 수정 여부
}

interface MealRecord {
  id: string;
  timestamp: Date;
  mealType: MealType;
  imageBase64?: string;
  items: FoodItem[];
  totalNutrition: NutritionData;
}
```

## 의존성

### 핵심 패키지
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@google/generative-ai": "^latest",
    "tailwindcss": "^3.4.x",
    "konsta": "^3.x",
    "recharts": "^2.x",
    "zustand": "^4.x"
  }
}
```

### 외부 의존성
- Gemini 3 Pro Vision API
- Vercel 배포 플랫폼

## 환경 변수

```env
# Gemini AI (서버 사이드 전용)
GEMINI_API_KEY=your_gemini_3_api_key
```

## 알려진 이슈

### 현재 제약사항
- Gemini API 할당량 제한
- 음식 인식 정확도 변동

### 리스크 대응
| 리스크 | 대응 |
|--------|------|
| API 할당량 초과 | 개발 중 캐싱, 데모용 프리셋 응답 |
| 인식 정확도 낮음 | 사용자 수정 기능, 신뢰도 점수 표시 |
| 시간 부족 | P1 기능 과감히 제외 |

## 참고 자료

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Next.js 15 App Router](https://nextjs.org/docs)
- [Konsta UI](https://konstaui.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
