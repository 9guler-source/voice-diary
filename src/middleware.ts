import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Edge 런타임 제약으로 외부 파일 import 대신 인라인 정의
function isGuardianEmail(email: string): boolean {
  return email.endsWith("@voice.app");
}

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/guardian-login"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path === "/";
  const userIsGuardian = user ? isGuardianEmail(user.email ?? "") : false;

  // ── 보호자 전용 경로 (/guardian/*) ──────────────────────────────
  if (path.startsWith("/guardian") && !path.startsWith("/guardian-login")) {
    if (!user) {
      // 미로그인 → 보호자 로그인 페이지로
      const url = request.nextUrl.clone();
      url.pathname = "/guardian-login";
      return NextResponse.redirect(url);
    }
    if (!userIsGuardian) {
      // 일반 사용자가 보호자 경로 접근 → 홈으로
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
    return response; // 보호자 계정 → 통과 (layout에서 DB 재검증)
  }

  // ── 일반 경로 ────────────────────────────────────────────────────
  if (userIsGuardian) {
    // 보호자 계정이 일반 경로 접근 → 보호자 열람 화면으로
    const url = request.nextUrl.clone();
    url.pathname = "/guardian/records";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    // 미로그인 일반 사용자 → 로그인 페이지로
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !userIsGuardian && (path === "/login" || path === "/signup")) {
    // 로그인된 일반 사용자가 로그인/가입 페이지 접근 → 홈으로
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
