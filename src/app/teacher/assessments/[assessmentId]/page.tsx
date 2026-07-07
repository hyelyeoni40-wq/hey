import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { listSubmissionsForAssessment } from "@/lib/services/scores";
import { ForbiddenError } from "@/lib/services/submissions";
import { GradingTable } from "./GradingTable";

export default async function AssessmentGradingPage({
  params,
}: PageProps<"/teacher/assessments/[assessmentId]">) {
  const session = await verifySession();
  if (session.role !== Role.TEACHER) {
    redirect("/dashboard");
  }

  const { assessmentId } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { class: true },
  });
  if (!assessment) {
    redirect("/teacher");
  }

  let submissions;
  try {
    submissions = await listSubmissionsForAssessment(session.userId, assessmentId);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect("/teacher");
    }
    throw err;
  }

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href={`/teacher/classes/${assessment.classId}`}>← {assessment.class.name}</Link>
      </p>
      <h1>{assessment.title}</h1>
      <p>
        교과: {assessment.subject} / 마감: {assessment.dueDate.toISOString().slice(0, 10)} /{" "}
        {assessment.isPublished ? "결과 공개됨" : "채점 중"}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>루브릭: {assessment.rubric}</p>

      <GradingTable
        assessmentId={assessment.id}
        submissions={submissions.map((s) => ({
          id: s.id,
          studentName: s.student.name,
          studentEmail: s.student.email,
          status: s.status,
          score: s.score?.score ?? null,
          feedback: s.score?.feedback ?? null,
          isPublished: s.score?.isPublished ?? false,
        }))}
      />
    </main>
  );
}
