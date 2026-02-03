"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/useToast";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile, DailyGoals as DBDailyGoals } from "@/lib/supabase/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  dailyGoals: DBDailyGoals | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateDailyGoals: (goals: Partial<DBDailyGoals>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Exponential Backoff 재시도 함수
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

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
    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // SIGNED_IN은 토큰이 아직 준비되지 않은 상태일 수 있으므로 스킵
        // INITIAL_SESSION, TOKEN_REFRESHED, SIGNED_OUT에서만 데이터 로드
        if (event === "SIGNED_IN") {
          return;
        }

        try {
          if (session?.user) {
            const [profileData, goalsData] = await Promise.all([
              fetchProfile(session.user.id),
              fetchDailyGoals(session.user.id),
            ]);

            if (!isMounted) return;

            setProfile(profileData);
            setDailyGoals(goalsData);
          } else {
            setProfile(null);
            setDailyGoals(null);
          }
        } catch (error) {
          console.error("[AuthContext] onAuthStateChange 데이터 로드 실패:", error);
          // 에러가 발생해도 기본 인증은 유지
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchDailyGoals]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) throw new Error("로그인이 필요합니다.");

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
  }, [user, supabase]);

  // 일일 목표 업데이트
  const updateDailyGoals = useCallback(async (goals: Partial<DBDailyGoals>) => {
    if (!user) throw new Error("로그인이 필요합니다.");

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
  }, [user, supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        dailyGoals,
        isLoading,
        isAuthenticated: !!user,
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
