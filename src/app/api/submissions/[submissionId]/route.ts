import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getSubmissionForViewer, ForbiddenError } from "@/lib/services/submissions";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/submissions/[submissionId]">
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await ctx.params;

  try {
    const submission = await getSubmissionForViewer(session, submissionId);
    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(submission);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
