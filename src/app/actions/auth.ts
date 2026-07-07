"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { LoginSchema, SignupSchema, type LoginState, type SignupState } from "@/lib/definitions";
import { createUser, findUserByEmail, EmailAlreadyExistsError } from "@/lib/services/users";
import { linkChildByEmail, ChildNotFoundError } from "@/lib/services/parentChild";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const role = formData.get("role");
  const raw = {
    role,
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    childEmails:
      role === "PARENT"
        ? formData.getAll("childEmails").map(String).filter((v) => v.trim() !== "")
        : undefined,
  };

  const validated = SignupSchema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const data = validated.data;

  try {
    const user = await createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role as Role,
    });

    if (data.role === "PARENT") {
      for (const childEmail of data.childEmails) {
        try {
          await linkChildByEmail(user.id, childEmail);
        } catch (err) {
          if (err instanceof ChildNotFoundError) {
            return { message: `${childEmail}: ${err.message}` };
          }
          throw err;
        }
      }
    }

    await createSession(user.id, user.role);
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      return { message: err.message };
    }
    throw err;
  }

  redirect("/dashboard");
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const { email, password } = validated.data;
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  await createSession(user.id, user.role);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
