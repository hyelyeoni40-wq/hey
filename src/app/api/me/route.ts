import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(user);
}
