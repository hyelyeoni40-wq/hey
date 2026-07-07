import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";
import { listClassesForTeacher } from "@/lib/services/classes";
import { createClassAction } from "@/app/actions/teacher";

export default async function TeacherPage() {
  const session = await verifySession();
  if (session.role !== Role.TEACHER) {
    redirect("/dashboard");
  }

  const classes = await listClassesForTeacher(session.userId);

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>내 학급</h1>

      <ul>
        {classes.map((cls) => (
          <li key={cls.id}>
            <Link href={`/teacher/classes/${cls.id}`}>
              {cls.name} ({cls.subject})
            </Link>{" "}
            — 학생 {cls._count.enrollments}명, 평가 {cls._count.assessments}건
          </li>
        ))}
        {classes.length === 0 && <li>아직 등록된 학급이 없습니다.</li>}
      </ul>

      <h2>학급 만들기</h2>
      <form action={createClassAction}>
        <div>
          <label htmlFor="name">학급명</label>
          <br />
          <input id="name" name="name" placeholder="예: 1학년 3반" required />
        </div>
        <div>
          <label htmlFor="subject">교과</label>
          <br />
          <input id="subject" name="subject" placeholder="예: 국어" required />
        </div>
        <button type="submit">만들기</button>
      </form>
    </main>
  );
}
