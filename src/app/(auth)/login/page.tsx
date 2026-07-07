import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>로그인</h1>
      <LoginForm />
      <p style={{ marginTop: "1rem" }}>
        계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
    </main>
  );
}
