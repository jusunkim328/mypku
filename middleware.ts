import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSessionWithResponse } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // next-intl이 먼저 locale 라우팅 처리
  const response = intlMiddleware(request);

  // Supabase 세션 쿠키 처리 (response에 추가)
  return await updateSessionWithResponse(request, response);
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청 경로:
     * - api (API routes)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - 이미지 파일 (svg, png, jpg, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
