import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Assessment.isPublished is a derived, denormalized convenience flag used
 * only for list-view badges ("결과 공개됨" vs "채점 중") — it is NOT a
 * second authorization gate. The actual visibility rule for a given
 * student/parent is Score.isPublished alone (see services/results.ts in
 * STEP 4). This keeps individual-publish free of any lockout case where a
 * single published score wouldn't show because the assessment-level flag
 * lagged behind.
 */
export async function recomputeAssessmentPublishState(assessmentId: string) {
  const publishedCount = await prisma.score.count({
    where: { submission: { assessmentId }, isPublished: true },
  });

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { isPublished: publishedCount > 0 },
  });
}
