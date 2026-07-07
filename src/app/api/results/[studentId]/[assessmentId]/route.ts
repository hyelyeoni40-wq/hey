import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getResultDetailForViewer } from "@/lib/services/results";
import { ForbiddenError } from "@/lib/services/submissions";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/results/[studentId]/[assessmentId]">
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId, assessmentId } = await ctx.params;

  try {
    const detail = await getResultDetailForViewer(session, studentId, assessmentId);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
