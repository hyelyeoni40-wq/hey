"use client";

import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";

type RoleValue = "STUDENT" | "PARENT" | "TEACHER";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<RoleValue>("STUDENT");
  const [childEmails, setChildEmails] = useState<string[]>([""]);

  return (
    <form action={action}>
      <fieldset>
        <legend>사용자 유형</legend>
        {(["STUDENT", "PARENT", "TEACHER"] as const).map((value) => (
          <label key={value} style={{ marginRight: "1rem" }}>
            <input
              type="radio"
              name="role"
              value={value}
              checked={role === value}
              onChange={() => setRole(value)}
            />
            {value === "STUDENT" ? "학생" : value === "PARENT" ? "학부모" : "교사"}
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor="name">이름</label>
        <br />
        <input id="name" name="name" required />
      </div>
      {state?.errors?.name && <p role="alert">{state.errors.name.join(", ")}</p>}

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

      {role === "PARENT" && (
        <fieldset>
          <legend>자녀 이메일 (계정에 등록된 학생 이메일)</legend>
          {childEmails.map((value, index) => (
            <div key={index}>
              <input
                name="childEmails"
                type="email"
                value={value}
                placeholder="자녀 이메일"
                onChange={(e) => {
                  const next = [...childEmails];
                  next[index] = e.target.value;
                  setChildEmails(next);
                }}
                required
              />
              {childEmails.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setChildEmails(childEmails.filter((_, i) => i !== index))
                  }
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setChildEmails([...childEmails, ""])}>
            자녀 추가
          </button>
          {state?.errors?.childEmails && (
            <p role="alert">{state.errors.childEmails.join(", ")}</p>
          )}
        </fieldset>
      )}

      {state?.message && <p role="alert">{state.message}</p>}

      <button disabled={pending} type="submit">
        가입하기
      </button>
    </form>
  );
}
