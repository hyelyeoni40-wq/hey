import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { decrypt, getSessionCookieValue, SESSION_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/definitions";

/**
 * For Server Components / Server Actions. Redirects to /login when there is
 * no valid session, matching the Next.js recommended DAL pattern.
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const cookie = await getSessionCookieValue();
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

/**
 * For Route Handlers. Reads the cookie directly off the NextRequest instead
 * of next/headers so handlers can be exercised in isolation (unit/integration
 * tests) without Next's request-scoped AsyncLocalStorage. Returns null
 * instead of redirecting — callers decide between 401 and 403.
 */
export async function verifySessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  return decrypt(cookie);
}

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
});
