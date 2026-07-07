import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>안녕하세요, {user?.name}님</h1>
      <p>역할: {user?.role}</p>

      {user?.role === "TEACHER" && (
        <p>
          <Link href="/teacher">교사 대시보드로 이동</Link>
        </p>
      )}
      {(user?.role === "STUDENT" || user?.role === "PARENT") && (
        <p>
          <Link href="/results">수행평가 결과 확인</Link>
        </p>
      )}

      <form action={logout}>
        <button type="submit">로그아웃</button>
      </form>
    </main>
  );
}
