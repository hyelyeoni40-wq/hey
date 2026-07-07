import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getResultsListForViewer } from "@/lib/services/results";
import { ForbiddenError } from "@/lib/services/submissions";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/results/[studentId]">
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = await ctx.params;

  try {
    const results = await getResultsListForViewer(session, studentId);
    return NextResponse.json(results);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
