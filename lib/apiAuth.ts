import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * API 라우트용 인증 헬퍼.
 * 인증 성공 시 supabase 클라이언트와 user를 반환하고,
 * 실패 시 null을 반환한다.
 */
export async function requireAuth(): Promise<{
  supabase: SupabaseClient;
  user: User;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return { supabase, user };
}
