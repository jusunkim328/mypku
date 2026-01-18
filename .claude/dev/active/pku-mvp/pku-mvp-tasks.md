# pku-mvp Tasks

**Last Updated**: 2026-01-17 21:50

## 완료 기준

- [x] Next.js 15 프로젝트 설정 완료
- [x] Gemini 3 API 연동 및 음식 분석 동작 (API Route 구현)
- [x] 듀얼 모드 UI (PKU/일반) 구현
- [x] 일일 대시보드 영양소 시각화
- [x] 식사 기록 저장 및 히스토리 조회 (기능 구현 완료)
- [x] AI 코칭 메시지 생성 (API 구현 완료)
- [x] 프로덕션 빌드 성공 ✅
- [x] Vercel 배포 완료 ✅
- [ ] 3분 데모 영상 제작

## 진행 상태

### ✅ 완료됨
- [x] 개발 계획 문서화
- [x] dev-docs 초기화
- [x] Docker 샌드박스 설정 (docker-compose.yml)
- [x] Next.js 15 + TypeScript 프로젝트 생성
- [x] Tailwind CSS 설정
- [x] 자체 UI 컴포넌트 라이브러리 생성 (Konsta UI 대체)
- [x] TypeScript 타입 정의 (`types/nutrition.ts`)
- [x] Zustand 상태 관리 설정 (`hooks/useNutritionStore.ts`)
- [x] Gemini 3 API 클라이언트 (`lib/gemini.ts`)
- [x] 2단계 프롬프트 구현 (`lib/prompts.ts`)
- [x] API Route - 음식 분석 (`app/api/analyze/route.ts`)
- [x] API Route - AI 코칭 (`app/api/coaching/route.ts`)
- [x] 메인 대시보드 (`app/page.tsx`, `HomeClient.tsx`)
- [x] 원형 프로그레스 컴포넌트 (`NutrientRing.tsx`)
- [x] 일일 목표 카드 (`DailyGoalCard.tsx`)
- [x] 이미지 업로드 컴포넌트 (`ImageUploader.tsx`)
- [x] 분석 결과 컴포넌트 (`AnalysisResult.tsx`, `FoodItemCard.tsx`)
- [x] 음식 분석 페이지 (`AnalyzeClient.tsx`)
- [x] 설정 페이지 (`SettingsClient.tsx`)
- [x] 히스토리 페이지 (`HistoryClient.tsx`)
- [x] 주간 차트 (`WeeklyChart.tsx`, `WeeklyChartClient.tsx`)
- [x] AI 코칭 메시지 컴포넌트 (`CoachingMessage.tsx`)
- [x] 면책조항 컴포넌트 (`Disclaimer.tsx`)
- [x] 개발 서버 정상 작동 확인 (http://localhost:3000)

### 🔄 진행 중
- [x] GitHub 푸시 완료 (main 브랜치)
- [x] Vercel 배포 완료
- [x] React2Shell 보안 취약점 패치 (Next.js 15.3.8)

### ⏳ 대기 중

#### Week 2-3 남은 작업
- [ ] GEMINI_API_KEY 설정 후 실제 테스트
- [ ] 실제 음식 사진으로 Gemini API 테스트
- [ ] UI/UX 폴리싱
- [ ] 반응형 조정
- [ ] 에러 핸들링 강화
- [ ] 데모 시나리오 준비
- [ ] 3분 데모 영상 촬영

## 다음 단계

1. Vercel Environment Variable에 `GEMINI_API_KEY` 설정
2. 배포된 URL에서 음식 사진 분석 테스트
3. UI/UX 폴리싱 및 반응형 조정
4. 데모 시나리오 준비 및 3분 영상 촬영

## 알려진 이슈

### ✅ 해결됨: 빌드 시 SSR 오류
- **문제**: React 19 + Next.js 15 + Zustand persist의 호환성 문제
- **상태**: ✅ 해결 완료 (2026-01-17)
- **해결 방법**: `"use client"` + `dynamic import (ssr: false)` 패턴 적용

## 차단 요소

- Vercel에 GEMINI_API_KEY 환경 변수 설정 필요
