import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { upsertScore } from "@/lib/services/scores";
import { ForbiddenError } from "@/lib/services/submissions";

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/submissions/[submissionId]/score">
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { submissionId } = await ctx.params;
  const body = await req.json();
  const score = Number(body.score);
  const feedback = typeof body.feedback === "string" ? body.feedback : undefined;

  if (!Number.isFinite(score)) {
    return NextResponse.json({ error: "score must be a number" }, { status: 400 });
  }

  try {
    const result = await upsertScore(session.userId, submissionId, { score, feedback });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
