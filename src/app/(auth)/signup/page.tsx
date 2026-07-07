import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>회원가입</h1>
      <SignupForm />
      <p style={{ marginTop: "1rem" }}>
        이미 계정이 있으신가요? <Link href="/login">로그인</Link>
      </p>
    </main>
  );
}
