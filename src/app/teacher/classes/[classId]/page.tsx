import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { getClassForTeacher } from "@/lib/services/classes";
import { createAssessmentAction, enrollStudentAction } from "@/app/actions/teacher";

export default async function ClassPage({
  params,
}: PageProps<"/teacher/classes/[classId]">) {
  const session = await verifySession();
  if (session.role !== Role.TEACHER) {
    redirect("/dashboard");
  }

  const { classId } = await params;
  const cls = await getClassForTeacher(session.userId, classId);
  if (!cls) {
    redirect("/teacher");
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href="/teacher">← 내 학급</Link>
      </p>
      <h1>
        {cls.name} ({cls.subject})
      </h1>

      <h2>학생 명단</h2>
      <ul>
        {cls.enrollments.map((e) => (
          <li key={e.id}>
            {e.student.name} ({e.student.email})
          </li>
        ))}
        {cls.enrollments.length === 0 && <li>등록된 학생이 없습니다.</li>}
      </ul>

      <form action={enrollStudentAction}>
        <input type="hidden" name="classId" value={cls.id} />
        <label htmlFor="email">학생 이메일로 등록</label>
        <br />
        <input id="email" name="email" type="email" required />
        <button type="submit">등록</button>
      </form>

      <h2>수행평가 항목</h2>
      <ul>
        {cls.assessments.map((a) => (
          <li key={a.id}>
            <Link href={`/teacher/assessments/${a.id}`}>{a.title}</Link>{" "}
            — 마감 {a.dueDate.toISOString().slice(0, 10)} (
            {a.isPublished ? "결과 공개됨" : "채점 중"})
          </li>
        ))}
        {cls.assessments.length === 0 && <li>등록된 평가가 없습니다.</li>}
      </ul>

      <h3>수행평가 등록</h3>
      <form action={createAssessmentAction}>
        <input type="hidden" name="classId" value={cls.id} />
        <div>
          <label htmlFor="title">제목</label>
          <br />
          <input id="title" name="title" required />
        </div>
        <div>
          <label htmlFor="subject">교과</label>
          <br />
          <input id="subject" name="subject" defaultValue={cls.subject} required />
        </div>
        <div>
          <label htmlFor="dueDate">마감일</label>
          <br />
          <input id="dueDate" name="dueDate" type="date" required />
        </div>
        <div>
          <label htmlFor="rubric">평가기준 (루브릭)</label>
          <br />
          <textarea id="rubric" name="rubric" rows={4} required />
        </div>
        <button type="submit">등록</button>
      </form>
    </main>
  );
}
