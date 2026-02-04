/**
 * PKU 관련 상수 정의
 */

// 신뢰도 임계값 (AI 분석 결과 평가)
export const PKU_CONFIDENCE = {
  /** 매우 낮음 - 인식 불가, 무조건 avoid 처리 */
  VERY_LOW: 0.3,
  /** 낮음 - 불확실, 안전등급 한 단계 상향 */
  LOW: 0.5,
  /** 중간 - 보통 수준의 확신 */
  MEDIUM: 0.7,
  /** 높음 - 명확한 인식 */
  HIGH: 0.8,
} as const;

// Phe 허용량 기본값 (mg/day)
export const PKU_PHE_DEFAULTS = {
  /** 신생아/영아 기본 허용량 */
  INFANT: 200,
  /** 소아 기본 허용량 */
  CHILD: 300,
  /** 청소년/성인 기본 허용량 */
  ADULT: 400,
  /** 앱 기본값 */
  DEFAULT: 300,
} as const;

// Exchange 단위 (mg Phe)
export const PKU_EXCHANGE = {
  /** 표준 Exchange 단위 (대부분의 클리닉) */
  STANDARD: 50,
  /** 정밀 Exchange 단위 (일부 유럽 클리닉) */
  DETAILED: 15,
} as const;

// PKU 안전등급 Phe 임계값 (mg per serving)
export const PKU_SAFETY_THRESHOLDS = {
  /** Safe: 20mg 이하 */
  SAFE_MAX: 20,
  /** Caution: 21-100mg */
  CAUTION_MAX: 100,
  // Avoid: 100mg 초과
} as const;

// 혈중 Phe 목표 범위 (µmol/L)
export const PKU_BLOOD_TARGETS = {
  /** 최소 목표 */
  MIN: 120,
  /** 최대 목표 */
  MAX: 360,
} as const;

// 단위 변환
export const PKU_UNIT_CONVERSION = {
  /** mg/dL → µmol/L 변환 계수 */
  MG_DL_TO_UMOL_L: 60.54,
} as const;
