import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { assertParentOfStudent } from "@/lib/services/parentChild";
import type { SessionPayload } from "@/lib/definitions";

export class ForbiddenError extends Error {
  constructor(message = "접근 권한이 없습니다.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getSubmissionForViewer(
  actingUser: SessionPayload,
  submissionId: string
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assessment: { include: { class: true } },
      score: true,
    },
  });

  if (!submission) return null;

  const allowed = await canViewSubmission(actingUser, submission);
  if (!allowed) {
    throw new ForbiddenError();
  }

  return submission;
}

async function canViewSubmission(
  actingUser: SessionPayload,
  submission: { studentId: string; assessment: { class: { teacherId: string } } }
) {
  if (actingUser.role === Role.TEACHER) {
    return submission.assessment.class.teacherId === actingUser.userId;
  }
  if (actingUser.role === Role.STUDENT) {
    return submission.studentId === actingUser.userId;
  }
  if (actingUser.role === Role.PARENT) {
    return assertParentOfStudent(actingUser.userId, submission.studentId);
  }
  return false;
}
