"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/useToast";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile, DailyGoals as DBDailyGoals } from "@/lib/supabase/types";
import {
  getDevAuthState,
  setDevAuthState,
  MOCK_USER,
  MOCK_SESSION,
  MOCK_PROFILE,
  MOCK_DAILY_GOALS,
} from "@/lib/devAuth";
import { migrateLocalDataIfNeeded, type MigrationResult } from "@/lib/dataMigration";
import { withRetry } from "@/lib/retry";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  dailyGoals: DBDailyGoals | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  migrationResult: MigrationResult | null;
  signInWithGoogle: (returnUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateDailyGoals: (goals: Partial<DBDailyGoals>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AbortController 기반 타임아웃 헬퍼
function createTimeoutController(timeoutMs: number = 10000): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dailyGoals, setDailyGoals] = useState<DBDailyGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevAuthMode, setIsDevAuthMode] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Supabase 클라이언트를 ref로 저장하여 의존성 문제 방지
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // 프로필 가져오기 (의존성 없음)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { signal, cleanup } = createTimeoutController(10000);

    try {
      const { data, error } = await supabaseRef.current
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .abortSignal(signal)
        .single();

      if (error) {
        console.error("[AuthContext] 프로필 조회 실패:", error);
        return null;
      }

      return data as Profile;
    } catch (error) {
      // AbortError는 타임아웃으로 인한 정상적인 취소
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[AuthContext] 프로필 조회 타임아웃");
      } else {
        console.error("[AuthContext] 프로필 조회 에러:", error);
      }
      return null;
    } finally {
      cleanup();
    }
  }, []);

  // 일일 목표 가져오기 (의존성 없음)
  const fetchDailyGoals = useCallback(async (userId: string): Promise<DBDailyGoals | null> => {
    const { signal, cleanup } = createTimeoutController(10000);

    try {
      const { data, error } = await supabaseRef.current
        .from("daily_goals")
        .select("*")
        .eq("user_id", userId)
        .abortSignal(signal)
        .single();

      if (error) {
        console.error("[AuthContext] 일일 목표 조회 실패:", error);
        return null;
      }

      return data as DBDailyGoals;
    } catch (error) {
      // AbortError는 타임아웃으로 인한 정상적인 취소
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[AuthContext] 일일 목표 조회 타임아웃");
      } else {
        console.error("[AuthContext] 일일 목표 조회 에러:", error);
      }
      return null;
    } finally {
      cleanup();
    }
  }, []);

  // 사용자 데이터 새로고침
  const refreshUserData = useCallback(async () => {
    if (!user) return;

    try {
      const [profileData, goalsData] = await Promise.all([
        withRetry(() => fetchProfile(user.id)),
        withRetry(() => fetchDailyGoals(user.id)),
      ]);
      setProfile(profileData);
      setDailyGoals(goalsData);
    } catch (error) {
      console.error("[AuthContext] 사용자 데이터 새로고침 실패:", error);
    }
  }, [user, fetchProfile, fetchDailyGoals]);

  // 초기 세션 확인 (INITIAL_SESSION에서만 데이터 로드)
  useEffect(() => {
    let isMounted = true;

    // 인증 상태 변화 구독
    // 주의: onAuthStateChange 콜백 안에서 Supabase 쿼리를 직접 호출하면
    // 세션 초기화 완료 전에 실행되어 행이 걸릴 수 있음 → setTimeout으로 분리
    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // SIGNED_OUT 이벤트는 로그아웃이므로 데이터 클리어만
        if (event === "SIGNED_OUT") {
          setProfile(null);
          setDailyGoals(null);
          setMigrationResult(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log(`[AuthContext] 이벤트: ${event}, 사용자: ${session.user.email}`);

          // async 작업을 콜백 바깥에서 실행 (Supabase 세션 초기화 완료 보장)
          const userId = session.user.id;
          setTimeout(async () => {
            if (!isMounted) return;

            try {
              const [profileData, goalsData] = await Promise.all([
                fetchProfile(userId),
                fetchDailyGoals(userId),
              ]);

              if (!isMounted) return;

              setProfile(profileData);
              setDailyGoals(goalsData);

              // 마이그레이션: SIGNED_IN만 (INITIAL_SESSION/TOKEN_REFRESHED는 불필요)
              if (event === "SIGNED_IN") {
                try {
                  console.log("[AuthContext] 게스트 데이터 마이그레이션 확인 중...");
                  const result = await migrateLocalDataIfNeeded(userId);
                  if (isMounted) setMigrationResult(result);

                  if (result.status === "completed" && result.count && result.count > 0) {
                    toast.success(`${result.count}개의 기록이 계정에 동기화되었습니다!`);
                  }
                  console.log(`[AuthContext] 마이그레이션 결과: ${result.status}`);
                } catch (migrationError) {
                  console.error("[AuthContext] 마이그레이션 실패:", migrationError);
                }
              }
            } catch (error) {
              console.error("[AuthContext] 데이터 로드 실패:", error);
            } finally {
              if (isMounted) {
                setIsLoading(false);
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setDailyGoals(null);
          setMigrationResult(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchDailyGoals]);

  // Dev Auth 모드 지원 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // 초기 Dev Auth 상태 확인
    const devState = getDevAuthState();
    if (devState.enabled) {
      console.log("[AuthContext] Dev Auth 모드 활성화됨");
      setIsDevAuthMode(true);
      setUser(devState.user || MOCK_USER);
      setSession(MOCK_SESSION);
      setProfile(devState.profile || MOCK_PROFILE);
      setDailyGoals(devState.dailyGoals || MOCK_DAILY_GOALS);
      setIsLoading(false);
    }

    // Dev Auth 상태 변경 이벤트 리스너
    const handleDevAuthChange = (event: CustomEvent<{
      enabled: boolean;
      user: User | null;
      profile: Profile | null;
      dailyGoals: DBDailyGoals | null;
    }>) => {
      const { enabled, user: devUser, profile: devProfile, dailyGoals: devGoals } = event.detail;

      if (enabled) {
        console.log("[AuthContext] Dev Auth 로그인");
        setIsDevAuthMode(true);
        setUser(devUser || MOCK_USER);
        setSession(MOCK_SESSION);
        setProfile(devProfile || MOCK_PROFILE);
        setDailyGoals(devGoals || MOCK_DAILY_GOALS);
      } else {
        console.log("[AuthContext] Dev Auth 로그아웃");
        setIsDevAuthMode(false);
        setUser(null);
        setSession(null);
        setProfile(null);
        setDailyGoals(null);
      }
      setIsLoading(false);
    };

    window.addEventListener("devAuthStateChange", handleDevAuthChange as EventListener);

    return () => {
      window.removeEventListener("devAuthStateChange", handleDevAuthChange as EventListener);
    };
  }, []);

  const signInWithGoogle = useCallback(async (returnUrl?: string) => {
    // 상대경로만 허용 (Open Redirect 방지)
    const safeReturnUrl = returnUrl?.startsWith("/") ? returnUrl : undefined;
    const callbackUrl = safeReturnUrl
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnUrl)}`
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signOut = useCallback(async () => {
    // Dev Auth 모드면 로컬 상태만 클리어
    if (isDevAuthMode) {
      setDevAuthState({
        enabled: false,
        user: null,
        profile: null,
        dailyGoals: null,
      });
      setIsDevAuthMode(false);
      setUser(null);
      setSession(null);
      setProfile(null);
      setDailyGoals(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase, isDevAuthMode]);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) throw new Error("로그인이 필요합니다.");

    // Dev Auth 모드면 로컬 상태만 업데이트
    if (isDevAuthMode) {
      const newProfile = profile ? { ...profile, ...updates } : null;
      setProfile(newProfile);
      setDevAuthState({ profile: newProfile });
      console.log("[AuthContext] Dev Auth 프로필 업데이트:", updates);
      return;
    }

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);

        if (error) throw error;
      });

      // 로컬 상태 업데이트
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error("[AuthContext] 프로필 업데이트 실패:", error);
      toast.error("설정 저장에 실패했습니다. 다시 시도해 주세요.");
      throw error;
    }
  }, [user, supabase, isDevAuthMode, profile]);

  // 일일 목표 업데이트
  const updateDailyGoals = useCallback(async (goals: Partial<DBDailyGoals>) => {
    if (!user) throw new Error("로그인이 필요합니다.");

    // Dev Auth 모드면 로컬 상태만 업데이트
    if (isDevAuthMode) {
      const newGoals = dailyGoals ? { ...dailyGoals, ...goals } : null;
      setDailyGoals(newGoals);
      setDevAuthState({ dailyGoals: newGoals });
      console.log("[AuthContext] Dev Auth 일일 목표 업데이트:", goals);
      return;
    }

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from("daily_goals")
          .update(goals)
          .eq("user_id", user.id);

        if (error) throw error;
      });

      // 로컬 상태 업데이트
      setDailyGoals((prev) => prev ? { ...prev, ...goals } : null);
    } catch (error) {
      console.error("[AuthContext] 일일 목표 업데이트 실패:", error);
      toast.error("목표 저장에 실패했습니다. 다시 시도해 주세요.");
      throw error;
    }
  }, [user, supabase, isDevAuthMode, dailyGoals]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        dailyGoals,
        isLoading,
        isAuthenticated: !!user,
        migrationResult,
        signInWithGoogle,
        signOut,
        updateProfile,
        updateDailyGoals,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
