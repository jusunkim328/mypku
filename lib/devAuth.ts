/**
 * 개발 환경 인증 테스트 유틸리티
 *
 * ⚠️ 개발 환경에서만 동작합니다. 프로덕션에서는 자동 비활성화됩니다.
 *
 * 사용법:
 * 1. Mock Mode: NEXT_PUBLIC_DEV_AUTH_MOCK=true 환경 변수 설정
 * 2. Test Account: /api/dev/login API 호출
 *
 * Chrome DevTools MCP에서 테스트:
 * - Mock Mode: 자동으로 테스트 사용자로 인증됨
 * - Test Account: evaluate_script로 devLogin() 호출
 */

import type { User, Session } from "@supabase/supabase-js";
import type { Profile, DailyGoals } from "@/lib/supabase/types";

// 프로덕션 환경 체크 (모든 Dev Auth 기능 비활성화)
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (IS_PRODUCTION && typeof window !== "undefined") {
  console.warn("[DevAuth] Dev Auth is disabled in production environment.");
}

// Mock 모드 활성화 여부
export const isDevAuthMockEnabled = (): boolean => {
  if (IS_PRODUCTION) return false;
  if (typeof window === "undefined") return false;
  return process.env.NEXT_PUBLIC_DEV_AUTH_MOCK === "true";
};

// Mock 사용자 데이터
export const MOCK_USER: User = {
  id: "dev-test-user-00000000-0000-0000-0000-000000000001",
  email: "dev-test@mypku.local",
  app_metadata: {},
  user_metadata: {
    full_name: "Dev Test User",
    avatar_url: null,
  },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone: undefined,
  last_sign_in_at: new Date().toISOString(),
  role: "authenticated",
  identities: [],
  factors: [],
};

export const MOCK_SESSION: Session = {
  access_token: "dev-mock-access-token",
  refresh_token: "dev-mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: MOCK_USER,
};

export const MOCK_PROFILE: Profile = {
  id: MOCK_USER.id,
  email: MOCK_USER.email!,
  name: "Dev Test User",
  avatar_url: null,
  mode: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_DAILY_GOALS: DailyGoals = {
  id: "dev-goals-00000000-0000-0000-0000-000000000001",
  user_id: MOCK_USER.id,
  calories: 2000,
  protein_g: 50,
  carbs_g: 250,
  fat_g: 65,
  phenylalanine_mg: 300,
  updated_at: new Date().toISOString(),
};

// localStorage 키
const DEV_AUTH_KEY = "mypku_dev_auth";

interface DevAuthState {
  enabled: boolean;
  user: User | null;
  profile: Profile | null;
  dailyGoals: DailyGoals | null;
}

// Dev Auth 상태 저장
export const setDevAuthState = (state: Partial<DevAuthState>): void => {
  if (IS_PRODUCTION || typeof window === "undefined") return;

  const current = getDevAuthState();
  const newState = { ...current, ...state };
  localStorage.setItem(DEV_AUTH_KEY, JSON.stringify(newState));

  // 상태 변경 이벤트 발생 (AuthContext에서 감지)
  window.dispatchEvent(new CustomEvent("devAuthStateChange", { detail: newState }));
};

// Dev Auth 상태 조회
export const getDevAuthState = (): DevAuthState => {
  if (typeof window === "undefined") {
    return { enabled: false, user: null, profile: null, dailyGoals: null };
  }

  try {
    const stored = localStorage.getItem(DEV_AUTH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }

  return { enabled: false, user: null, profile: null, dailyGoals: null };
};

// Dev Auth 활성화 (Mock 데이터로 로그인)
export const enableDevAuth = (customData?: {
  profile?: Partial<Profile>;
  dailyGoals?: Partial<DailyGoals>;
}): void => {
  if (IS_PRODUCTION) {
    console.warn("[DevAuth] enableDevAuth is disabled in production.");
    return;
  }

  const profile = { ...MOCK_PROFILE, ...customData?.profile };
  const dailyGoals = { ...MOCK_DAILY_GOALS, ...customData?.dailyGoals };

  setDevAuthState({
    enabled: true,
    user: MOCK_USER,
    profile,
    dailyGoals,
  });

  console.log("[DevAuth] Mock 인증 활성화됨", { profile, dailyGoals });
};

// Dev Auth 비활성화
export const disableDevAuth = (): void => {
  if (IS_PRODUCTION) {
    console.warn("[DevAuth] disableDevAuth is disabled in production.");
    return;
  }

  setDevAuthState({
    enabled: false,
    user: null,
    profile: null,
    dailyGoals: null,
  });

  console.log("[DevAuth] Mock 인증 비활성화됨");
};

// 전역 함수로 노출 (Chrome DevTools에서 쉽게 호출)
if (typeof window !== "undefined" && !IS_PRODUCTION) {
  (window as typeof window & {
    devLogin: typeof enableDevAuth;
    devLogout: typeof disableDevAuth;
    devAuthState: typeof getDevAuthState;
  }).devLogin = enableDevAuth;
  (window as typeof window & { devLogout: typeof disableDevAuth }).devLogout = disableDevAuth;
  (window as typeof window & { devAuthState: typeof getDevAuthState }).devAuthState = getDevAuthState;

  console.log("[DevAuth] 개발 모드 - 사용 가능한 함수:");
  console.log("  - devLogin()  : Mock 사용자로 로그인");
  console.log("  - devLogout() : 로그아웃");
  console.log("  - devAuthState() : 현재 상태 확인");
}
