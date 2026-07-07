import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { getChildrenForParent } from "@/lib/services/parentChild";
import { getScoreTrend } from "@/lib/services/results";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { ScoreTrendChart } from "@/components/ScoreTrendChart";

export default async function TrendPage({
  searchParams,
}: PageProps<"/results/trend">) {
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

  const trend = await getScoreTrend(session, studentId);

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href={`/results${studentId !== session.userId ? `?child=${studentId}` : ""}`}>
          ← 결과 목록
        </Link>
      </p>
      <h1>학기별/교과별 점수 추이</h1>

      {session.role === Role.PARENT && (
        <ChildSwitcher childOptions={children} selectedId={studentId} />
      )}

      <ScoreTrendChart data={trend} />
    </main>
  );
}
