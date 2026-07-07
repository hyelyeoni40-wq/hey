import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { getResultDetailForViewer } from "@/lib/services/results";
import { getChildrenForParent } from "@/lib/services/parentChild";
import { ForbiddenError } from "@/lib/services/submissions";

const STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: "미제출",
  SUBMITTED: "제출",
  RESUBMITTED: "재제출",
};

export default async function ResultDetailPage({
  params,
  searchParams,
}: PageProps<"/results/[assessmentId]">) {
  const session = await verifySession();
  if (session.role !== Role.STUDENT && session.role !== Role.PARENT) {
    redirect("/dashboard");
  }

  const { assessmentId } = await params;
  const { child } = await searchParams;

  let studentId = session.userId;
  if (session.role === Role.PARENT) {
    const children = await getChildrenForParent(session.userId);
    const requested = typeof child === "string" ? child : undefined;
    const match = requested && children.find((c) => c.id === requested);
    studentId = match ? match.id : (children[0]?.id ?? session.userId);
  }

  const backHref = `/results${session.role === Role.PARENT ? `?child=${studentId}` : ""}`;

  let detail;
  try {
    detail = await getResultDetailForViewer(session, studentId, assessmentId);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return (
        <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
          <p>
            <Link href={backHref}>← 목록으로</Link>
          </p>
          <p>접근 권한이 없습니다.</p>
        </main>
      );
    }
    throw err;
  }

  if (!detail) {
    return (
      <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
        <p>
          <Link href={backHref}>← 목록으로</Link>
        </p>
        <p>해당 수행평가를 찾을 수 없습니다.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href={backHref}>← 목록으로</Link>
      </p>
      <h1>{detail.title}</h1>
      <p>
        교과: {detail.subject} / 마감: {detail.dueDate.toISOString().slice(0, 10)} / 제출상태:{" "}
        {STATUS_LABEL[detail.status]}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>루브릭: {detail.rubric}</p>

      {detail.isResultPublished ? (
        <section>
          <h2>결과</h2>
          <p>점수: {detail.score}</p>
          <p>피드백: {detail.feedback || "(없음)"}</p>
        </section>
      ) : (
        <section>
          <h2>채점 중</h2>
          <p>아직 결과가 공개되지 않았습니다.</p>
        </section>
      )}
    </main>
  );
}
