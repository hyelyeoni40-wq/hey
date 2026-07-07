import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { publishOne, publishAll } from "@/lib/services/scores";
import { ForbiddenError } from "@/lib/services/submissions";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/assessments/[assessmentId]/publish">
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assessmentId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  try {
    if (body.mode === "one") {
      if (typeof body.submissionId !== "string") {
        return NextResponse.json({ error: "submissionId required" }, { status: 400 });
      }
      await publishOne(session.userId, body.submissionId);
    } else if (body.mode === "all") {
      await publishAll(session.userId, assessmentId);
    } else {
      return NextResponse.json({ error: "mode must be 'one' or 'all'" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
