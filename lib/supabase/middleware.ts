import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
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
  if (isDev) {
    console.log("[supabase-middleware] getUser:", { user: user?.email, error: error?.message });
  }

  return response;
}
