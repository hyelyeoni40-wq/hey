"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action}>
      <div>
        <label htmlFor="email">이메일</label>
        <br />
        <input id="email" name="email" type="email" required />
      </div>
      {state?.errors?.email && <p role="alert">{state.errors.email.join(", ")}</p>}

      <div>
        <label htmlFor="password">비밀번호</label>
        <br />
        <input id="password" name="password" type="password" required />
      </div>
      {state?.errors?.password && (
        <p role="alert">{state.errors.password.join(", ")}</p>
      )}

      {state?.message && <p role="alert">{state.message}</p>}

      <button disabled={pending} type="submit">
        로그인
      </button>
    </form>
  );
}
