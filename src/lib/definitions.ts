import * as z from "zod";
import type { Role } from "@/generated/prisma/enums";

export const LoginSchema = z.object({
  email: z.email({ error: "올바른 이메일을 입력하세요." }).trim(),
  password: z.string().min(1, { error: "비밀번호를 입력하세요." }),
});

export type LoginState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;

const baseSignup = {
  name: z.string().min(2, { error: "이름은 2자 이상이어야 합니다." }).trim(),
  email: z.email({ error: "올바른 이메일을 입력하세요." }).trim(),
  password: z
    .string()
    .min(8, { error: "비밀번호는 8자 이상이어야 합니다." })
    .regex(/[a-zA-Z]/, { error: "영문자를 최소 1자 포함해야 합니다." })
    .regex(/[0-9]/, { error: "숫자를 최소 1자 포함해야 합니다." }),
};

export const SignupSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("STUDENT"), ...baseSignup }),
  z.object({ role: z.literal("TEACHER"), ...baseSignup }),
  z.object({
    role: z.literal("PARENT"),
    ...baseSignup,
    childEmails: z
      .array(z.email({ error: "자녀의 올바른 이메일을 입력하세요." }))
      .min(1, { error: "자녀 이메일을 최소 1명 입력하세요." }),
  }),
]);

export type SignupState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export type SessionPayload = {
  userId: string;
  role: Role;
  expiresAt: Date;
};
