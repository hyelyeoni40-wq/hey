import { NextRequest, NextResponse } from "next/server";
import { runDueAndNotSubmittedSweep } from "@/lib/services/notifications";

/**
 * Accepts either:
 * - Vercel Cron Jobs: GET request with `Authorization: Bearer $CRON_SECRET`,
 *   added automatically by Vercel when a `CRON_SECRET` env var is set on the
 *   project (see vercel.json's `crons` entry for this path).
 * - Any other external scheduler: POST with an `x-cron-secret` header.
 */
function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueAndNotSubmittedSweep();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueAndNotSubmittedSweep();
  return NextResponse.json(result);
}
