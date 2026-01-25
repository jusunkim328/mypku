import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  return updateSessionWithResponse(request, NextResponse.next({ request }));
}

export async function updateSessionWithResponse(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll();
          console.log("[supabase-middleware] getAll cookies:", cookies.map(c => c.name));
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log("[supabase-middleware] setAll cookies:", cookiesToSet.map(c => c.name));
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신 (사용자가 로그인한 경우)
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log("[supabase-middleware] getUser result:", { user: user?.email, error: error?.message });

  return response;
}
