/**
 * PostgREST 필터 값에서 메타문자를 제거하여 filter injection 방지
 * 위험 문자: , . ( ) " \ — .or() 구문을 조작할 수 있음
 */
export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,.()"\\]/g, "");
}
