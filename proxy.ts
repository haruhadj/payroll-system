import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const publicPaths = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"]

export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request)
  const { pathname } = request.nextUrl

  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const isApiOrStatic =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")

  if (isApiOrStatic) return NextResponse.next()

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
