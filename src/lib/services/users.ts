import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { Role } from "@/generated/prisma/enums";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("이미 가입된 이메일입니다.");
    this.name = "EmailAlreadyExistsError";
  }
}

export async function createUser(params: {
  email: string;
  password: string;
  name: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  });
  if (existing) {
    throw new EmailAlreadyExistsError();
  }

  const passwordHash = await hashPassword(params.password);
  return prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      name: params.name,
      role: params.role,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
