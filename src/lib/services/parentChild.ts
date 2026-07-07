import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

export class ChildNotFoundError extends Error {
  constructor() {
    super("해당 이메일의 학생 계정을 찾을 수 없습니다.");
    this.name = "ChildNotFoundError";
  }
}

export async function linkChildByEmail(parentId: string, childEmail: string) {
  const child = await prisma.user.findUnique({ where: { email: childEmail } });
  if (!child || child.role !== Role.STUDENT) {
    throw new ChildNotFoundError();
  }

  return prisma.parentChild.upsert({
    where: { parentId_studentId: { parentId, studentId: child.id } },
    update: {},
    create: { parentId, studentId: child.id },
  });
}

export async function getChildrenForParent(parentId: string) {
  const links = await prisma.parentChild.findMany({
    where: { parentId },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return links.map((link) => link.student);
}

export async function assertParentOfStudent(parentId: string, studentId: string) {
  const link = await prisma.parentChild.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  return link !== null;
}
