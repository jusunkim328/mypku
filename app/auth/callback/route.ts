import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  // 보안: 상대 경로만 허용
  if (!next.startsWith("/")) {
    next = "/";
  }

  // 쿠키에서 locale 가져오기 (next-intl이 설정함)
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";

  if (code) {
    console.log("[callback] Exchanging code for session...");
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[callback] Result:", {
      hasSession: !!data?.session,
      user: data?.session?.user?.email,
      error: error?.message
    });

    if (!error) {
      // locale 경로로 리다이렉트
      const isLocalEnv = origin.includes("localhost") || process.env.NODE_ENV === "development";
      const forwardedHost = request.headers.get("x-forwarded-host");
      const redirectPath = `/${locale}${next === "/" ? "" : next}`;

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  // 인증 실패 시 에러 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/${locale}/auth/error`);
}
