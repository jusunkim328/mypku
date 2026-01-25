"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile, DailyGoals, Database } from "@/lib/supabase/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  dailyGoals: DailyGoals | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateDailyGoals: (goals: Partial<DailyGoals>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // 프로필 가져오기
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("프로필 조회 실패:", error);
      return null;
    }

    return data as Profile;
  }, [supabase]);

  // 일일 목표 가져오기
  const fetchDailyGoals = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("daily_goals")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("일일 목표 조회 실패:", error);
      return null;
    }

    return data as DailyGoals;
  }, [supabase]);

  // 초기 세션 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("[useAuth] Calling getSession...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("[useAuth] getSession result:", {
          session: !!session,
          user: session?.user?.email,
          error: sessionError,
          accessToken: session?.access_token?.substring(0, 20) + "..."
        });

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [profileData, goalsData] = await Promise.all([
            fetchProfile(session.user.id),
            fetchDailyGoals(session.user.id),
          ]);
          setProfile(profileData);
          setDailyGoals(goalsData);
        }
      } catch (error) {
        console.error("인증 초기화 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 인증 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [profileData, goalsData] = await Promise.all([
            fetchProfile(session.user.id),
            fetchDailyGoals(session.user.id),
          ]);
          setProfile(profileData);
          setDailyGoals(goalsData);
        } else {
          setProfile(null);
          setDailyGoals(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, fetchDailyGoals]);

  // Google SSO 로그인
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

    if (error) {
      console.error("Google 로그인 실패:", error);
      throw error;
    }
  }, [supabase]);

  // 로그아웃
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("로그아웃 실패:", error);
      throw error;
    }
  }, [supabase]);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) throw new Error("로그인이 필요합니다.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("프로필 업데이트 실패:", error);
      throw error;
    }

    // 로컬 상태 업데이트
    setProfile((prev) => prev ? { ...prev, ...updates } : null);
  }, [user, supabase]);

  // 일일 목표 업데이트
  const updateDailyGoals = useCallback(async (goals: Partial<DailyGoals>) => {
    if (!user) throw new Error("로그인이 필요합니다.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("daily_goals")
      .update(goals)
      .eq("user_id", user.id);

    if (error) {
      console.error("일일 목표 업데이트 실패:", error);
      throw error;
    }

    // 로컬 상태 업데이트
    setDailyGoals((prev) => prev ? { ...prev, ...goals } : null);
  }, [user, supabase]);

  // 프로필 새로고침
  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const [profileData, goalsData] = await Promise.all([
      fetchProfile(user.id),
      fetchDailyGoals(user.id),
    ]);
    setProfile(profileData);
    setDailyGoals(goalsData);
  }, [user, fetchProfile, fetchDailyGoals]);

  return {
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
    refreshProfile,
  };
}
