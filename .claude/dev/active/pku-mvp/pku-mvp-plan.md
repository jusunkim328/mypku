# pku-mvp 구현 계획

**Last Updated**: 2026-01-17 20:40

## 목표

PKU(페닐케톤뇨증) 환자와 일반 사용자를 위한 AI 기반 맞춤형 식단 관리 웹 서비스 MVP 개발
- **해커톤 마감**: 2026년 2월 9일 (약 3주)
- **핵심 차별점**: Gemini 3 멀티모달 비전 + 희귀질환 특화

## MVP 핵심 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 음식 사진 분석 | Gemini 3 Vision → 영양성분 자동 추출 | P0 |
| 듀얼 모드 UI | PKU 모드(페닐알라닌) / 일반 모드(칼로리) | P0 |
| 일일 대시보드 | 오늘의 영양소 섭취량 시각화 | P0 |
| AI 코칭 | 주간 섭취량 기반 피드백 메시지 | P1 |
| 식사 히스토리 | 최근 7일간 기록 조회 | P1 |

**MVP 제외**: 회원가입, 식약처 API, 특수식품 DB, 네이티브 앱, 푸시 알림

## 구현 단계

### Week 1 (1/17-1/24): 핵심 인프라
1. Next.js 15 프로젝트 설정, Tailwind + Konsta UI 구성
2. Gemini 3 API 연동, 2단계 프롬프트 구현
3. 이미지 업로드 UI, 카메라 캡처
4. 분석 결과 파싱, Zustand 상태 관리

### Week 2 (1/25-1/31): 핵심 기능
1. 대시보드 UI (원형 프로그레스)
2. PKU/일반 모드 전환 로직
3. 식사 기록 저장, 히스토리
4. AI 코칭 메시지

### Week 3 (2/1-2/9): 폴리싱 + 제출
1. UI/UX 폴리싱, 반응형
2. 에러 핸들링, 엣지 케이스
3. 데모 시나리오, 3분 영상
4. README, 최종 배포

## 기술적 접근

### 기술 스택
```
Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, Konsta UI
차트: recharts
상태관리: Zustand (LocalStorage persist)
AI: Gemini 3 Pro Vision API, @google/generative-ai SDK
배포: Vercel
```

### 2단계 프롬프트 엔지니어링
- **Step 1**: 구성 요소 해체 (음식 식별, 재료/조리법 추정, 중량 추정)
- **Step 2**: 영양 수치 산출 (칼로리, 단백질, 탄수화물, 지방, 페닐알라닌)

### Gemini 3 고급 기능
- `media_resolution_high`: 음식 세부 인식 향상
- `Structured Output`: JSON 스키마 강제
- `Streaming`: 실시간 분석 진행 표시

## 예상 산출물

### 생성될 파일
- `app/page.tsx`: 메인 대시보드
- `app/analyze/page.tsx`: 음식 사진 분석 페이지
- `app/history/page.tsx`: 식사 기록 페이지
- `app/settings/page.tsx`: 모드 설정 페이지
- `app/api/analyze/route.ts`: Gemini API 호출 (키 보호)
- `app/api/coaching/route.ts`: AI 코칭 메시지 생성
- `components/dashboard/*`: 대시보드 컴포넌트들
- `components/analyze/*`: 분석 관련 컴포넌트들
- `lib/gemini.ts`: Gemini 3 API 클라이언트
- `lib/prompts.ts`: 2단계 프롬프트 템플릿
- `hooks/useNutritionStore.ts`: Zustand 상태
- `types/nutrition.ts`: TypeScript 타입

## 고려사항

### 제약조건
- 3주 개발 기간
- Gemini API 할당량 제한

### 위험 요소
- API 할당량 초과 → 개발 중 캐싱, 데모용 프리셋 응답
- 인식 정확도 낮음 → 사용자 수정 기능, 신뢰도 점수 표시
- 시간 부족 → P1 기능 과감히 제외

### 법적 고려사항
- 웰니스 앱 경계 준수
- 면책조항 필수 표시
- AI 가드레일 (의료 진단/처방 금지)

## 검증 방법

1. **기능 테스트**: 다양한 음식 사진 분석, 모드 전환, LocalStorage 영속성
2. **배포 테스트**: Vercel 배포, 모바일/데스크톱 반응형, 환경변수
3. **데모 시나리오**: 촬영 → 분석 → 기록 → 코칭 플로우

## 심사 기준별 전략

| 기준 | 비중 | 어필 포인트 |
|------|------|------------|
| 기술적 완성도 | 40% | Gemini 3 고급 기능, 2단계 프롬프팅, 에러 처리 |
| 혁신성 | 30% | PKU 특화 (시장 공백), 영양사 모사 AI |
| 영향력 | 20% | 희귀질환 환자 5만명, 건강 형평성 |
| 프레젠테이션 | 10% | 깔끔한 UI, 명확한 데모, 감성 스토리 |
