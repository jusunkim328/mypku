/**
 * localStorage 키 상수
 *
 * 중복 방지를 위해 한 곳에서 관리
 */

// Zustand persist 저장소 키
export const NUTRITION_STORAGE_KEY = "mypku-nutrition-storage";

// 마이그레이션 백업 키
export const NUTRITION_BACKUP_KEY = `${NUTRITION_STORAGE_KEY}_backup`;
