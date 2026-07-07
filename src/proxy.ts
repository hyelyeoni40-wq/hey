import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/session";

const publicRoutes = ["/login", "/signup", "/"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(cookie);

  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if ((path === "/login" || path === "/signup") && session?.userId) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
