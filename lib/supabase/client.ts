"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// 싱글톤 패턴: 브라우저에서 하나의 클라이언트 인스턴스만 사용
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) {
    return client;
  }

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
