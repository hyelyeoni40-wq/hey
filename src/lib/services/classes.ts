import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/services/submissions";
import { Role } from "@/generated/prisma/enums";

export async function createClass(
  teacherId: string,
  data: { name: string; subject: string }
) {
  return prisma.class.create({
    data: { name: data.name, subject: data.subject, teacherId },
  });
}

export async function listClassesForTeacher(teacherId: string) {
  return prisma.class.findMany({
    where: { teacherId },
    include: { _count: { select: { enrollments: true, assessments: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClassForTeacher(teacherId: string, classId: string) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: { include: { student: { select: { id: true, name: true, email: true } } } },
      assessments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!cls) return null;
  if (cls.teacherId !== teacherId) {
    throw new ForbiddenError();
  }
  return cls;
}

export class StudentNotFoundError extends Error {
  constructor() {
    super("해당 이메일의 학생 계정을 찾을 수 없습니다.");
    this.name = "StudentNotFoundError";
  }
}

export async function enrollStudentByEmail(
  teacherId: string,
  classId: string,
  studentEmail: string
) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new ForbiddenError();
  if (cls.teacherId !== teacherId) throw new ForbiddenError();

  const student = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!student || student.role !== Role.STUDENT) {
    throw new StudentNotFoundError();
  }

  return prisma.enrollment.upsert({
    where: { classId_studentId: { classId, studentId: student.id } },
    update: {},
    create: { classId, studentId: student.id },
  });
}

export async function unenrollStudent(
  teacherId: string,
  classId: string,
  studentId: string
) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new ForbiddenError();
  if (cls.teacherId !== teacherId) throw new ForbiddenError();

  return prisma.enrollment.delete({
    where: { classId_studentId: { classId, studentId } },
  });
}
