import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { getChildrenForParent } from "@/lib/services/parentChild";
import { getResultsListForViewer } from "@/lib/services/results";
import { ChildSwitcher } from "@/components/ChildSwitcher";

const STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: "미제출",
  SUBMITTED: "제출",
  RESUBMITTED: "재제출",
};

export default async function ResultsPage({
  searchParams,
}: PageProps<"/results">) {
  const session = await verifySession();
  if (session.role !== Role.STUDENT && session.role !== Role.PARENT) {
    redirect("/dashboard");
  }

  const { child } = await searchParams;

  let studentId: string;
  let children: { id: string; name: string; email: string }[] = [];

  if (session.role === Role.PARENT) {
    children = await getChildrenForParent(session.userId);
    if (children.length === 0) {
      return (
        <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
          <p>연결된 자녀가 없습니다.</p>
        </main>
      );
    }
    const requested = typeof child === "string" ? child : undefined;
    const match = requested && children.find((c) => c.id === requested);
    studentId = match ? match.id : children[0].id;
  } else {
    studentId = session.userId;
  }

  const results = await getResultsListForViewer(session, studentId);
  const bySubject = new Map<string, typeof results>();
  for (const r of results) {
    const list = bySubject.get(r.subject) ?? [];
    list.push(r);
    bySubject.set(r.subject, list);
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>수행평가 결과</h1>

      {session.role === Role.PARENT && (
        <ChildSwitcher childOptions={children} selectedId={studentId} />
      )}

      <p>
        <Link href={`/results/trend${studentId !== session.userId ? `?child=${studentId}` : ""}`}>
          학기별/교과별 점수 추이 보기
        </Link>
      </p>

      {[...bySubject.entries()].map(([subject, items]) => (
        <section key={subject}>
          <h2>{subject}</h2>
          <ul>
            {items.map((r) => (
              <li key={r.submissionId}>
                <Link
                  href={`/results/${r.assessmentId}${studentId !== session.userId ? `?child=${studentId}` : ""}`}
                >
                  {r.title}
                </Link>{" "}
                — {r.dueDate.toISOString().slice(0, 10)} / {STATUS_LABEL[r.status]} /{" "}
                {r.isResultPublished ? "결과 공개됨" : "채점 중"}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {results.length === 0 && <p>등록된 수행평가가 없습니다.</p>}
    </main>
  );
}
