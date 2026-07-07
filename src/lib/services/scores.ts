import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/services/submissions";
import { recomputeAssessmentPublishState } from "@/lib/services/assessmentState";
import { notifyResultPublished } from "@/lib/services/notifications";

async function assertTeacherOwnsSubmission(teacherId: string, submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assessment: { include: { class: true } } },
  });
  if (!submission || submission.assessment.class.teacherId !== teacherId) {
    throw new ForbiddenError();
  }
  return submission;
}

async function assertTeacherOwnsAssessment(teacherId: string, assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { class: true },
  });
  if (!assessment || assessment.class.teacherId !== teacherId) {
    throw new ForbiddenError();
  }
  return assessment;
}

/** Draft/temp-save: writes score+feedback without publishing. */
export async function upsertScore(
  teacherId: string,
  submissionId: string,
  data: { score: number; feedback?: string }
) {
  await assertTeacherOwnsSubmission(teacherId, submissionId);

  return prisma.score.upsert({
    where: { submissionId },
    update: { score: data.score, feedback: data.feedback },
    create: { submissionId, score: data.score, feedback: data.feedback },
  });
}

export async function listSubmissionsForAssessment(teacherId: string, assessmentId: string) {
  await assertTeacherOwnsAssessment(teacherId, assessmentId);

  return prisma.submission.findMany({
    where: { assessmentId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      score: true,
    },
    orderBy: { student: { name: "asc" } },
  });
}

export async function publishOne(teacherId: string, submissionId: string) {
  const submission = await assertTeacherOwnsSubmission(teacherId, submissionId);

  const score = await prisma.score.findUnique({ where: { submissionId } });
  if (!score) {
    throw new Error("채점 결과가 없어 공개할 수 없습니다. 먼저 점수를 입력하세요.");
  }

  await prisma.score.update({
    where: { submissionId },
    data: { isPublished: true, gradedAt: score.gradedAt ?? new Date() },
  });

  await recomputeAssessmentPublishState(submission.assessmentId);
  await notifyResultPublished(submissionId);
}

export async function publishAll(teacherId: string, assessmentId: string) {
  await assertTeacherOwnsAssessment(teacherId, assessmentId);

  const scores = await prisma.$transaction(async (tx) => {
    const scores = await tx.score.findMany({
      where: { submission: { assessmentId } },
    });

    for (const score of scores) {
      await tx.score.update({
        where: { id: score.id },
        data: { isPublished: true, gradedAt: score.gradedAt ?? new Date() },
      });
    }
    return scores;
  });

  await recomputeAssessmentPublishState(assessmentId);
  for (const score of scores) {
    await notifyResultPublished(score.submissionId);
  }
}
