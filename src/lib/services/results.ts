import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { assertParentOfStudent } from "@/lib/services/parentChild";
import { ForbiddenError } from "@/lib/services/submissions";
import type { SessionPayload } from "@/lib/definitions";

async function assertCanViewStudent(actingUser: SessionPayload, studentId: string) {
  if (actingUser.role === Role.STUDENT) {
    if (actingUser.userId !== studentId) throw new ForbiddenError();
    return;
  }
  if (actingUser.role === Role.PARENT) {
    const linked = await assertParentOfStudent(actingUser.userId, studentId);
    if (!linked) throw new ForbiddenError();
    return;
  }
  throw new ForbiddenError();
}

/** List view: never exposes score/feedback, only submission + publish status. */
export async function getResultsListForViewer(actingUser: SessionPayload, studentId: string) {
  await assertCanViewStudent(actingUser, studentId);

  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: {
      assessment: true,
      score: { select: { isPublished: true } },
    },
    orderBy: { assessment: { dueDate: "desc" } },
  });

  return submissions.map((s) => ({
    submissionId: s.id,
    assessmentId: s.assessmentId,
    title: s.assessment.title,
    subject: s.assessment.subject,
    semester: s.assessment.semester,
    dueDate: s.assessment.dueDate,
    status: s.status,
    isResultPublished: s.score?.isPublished ?? false,
  }));
}

/**
 * Detail view: rubric and submission status are always included. score and
 * feedback keys are omitted entirely (not just nulled) unless Score.isPublished
 * is true — this is the sole visibility gate, see services/assessmentState.ts.
 */
export async function getResultDetailForViewer(
  actingUser: SessionPayload,
  studentId: string,
  assessmentId: string
) {
  await assertCanViewStudent(actingUser, studentId);

  const submission = await prisma.submission.findUnique({
    where: { assessmentId_studentId: { assessmentId, studentId } },
    include: { assessment: true, score: true },
  });
  if (!submission) return null;

  const isResultPublished = submission.score?.isPublished ?? false;

  return {
    submissionId: submission.id,
    status: submission.status,
    title: submission.assessment.title,
    subject: submission.assessment.subject,
    rubric: submission.assessment.rubric,
    dueDate: submission.assessment.dueDate,
    isResultPublished,
    ...(isResultPublished
      ? { score: submission.score!.score, feedback: submission.score!.feedback }
      : {}),
  };
}

export async function getScoreTrend(
  actingUser: SessionPayload,
  studentId: string,
  opts: { subject?: string } = {}
) {
  await assertCanViewStudent(actingUser, studentId);

  const scores = await prisma.score.findMany({
    where: {
      isPublished: true,
      submission: {
        studentId,
        assessment: opts.subject ? { subject: opts.subject } : undefined,
      },
    },
    include: { submission: { include: { assessment: true } } },
  });

  const bySemesterSubject = new Map<string, { semester: string; subject: string; total: number; count: number }>();
  for (const score of scores) {
    const { semester, subject } = score.submission.assessment;
    const key = `${semester}__${subject}`;
    const entry = bySemesterSubject.get(key) ?? { semester, subject, total: 0, count: 0 };
    entry.total += score.score;
    entry.count += 1;
    bySemesterSubject.set(key, entry);
  }

  return [...bySemesterSubject.values()]
    .map((e) => ({ semester: e.semester, subject: e.subject, avgScore: e.total / e.count }))
    .sort((a, b) => a.semester.localeCompare(b.semester));
}
