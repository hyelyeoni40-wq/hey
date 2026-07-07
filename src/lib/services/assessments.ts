import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/lib/services/submissions";
import { getSemesterLabel } from "@/lib/semester";
import type { SessionPayload } from "@/lib/definitions";

export async function createAssessment(
  teacherId: string,
  classId: string,
  data: { title: string; subject: string; dueDate: Date; rubric: string }
) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== teacherId) {
    throw new ForbiddenError();
  }

  const assessment = await prisma.assessment.create({
    data: {
      title: data.title,
      subject: data.subject,
      classId,
      dueDate: data.dueDate,
      semester: getSemesterLabel(data.dueDate),
      rubric: data.rubric,
    },
  });

  // Pre-create a NOT_SUBMITTED submission row for every enrolled student so
  // the teacher's grading table and the roster status list have a row per
  // student from the start, without needing a LEFT JOIN "missing row = not
  // submitted" special case throughout the codebase.
  const enrollments = await prisma.enrollment.findMany({ where: { classId } });
  if (enrollments.length > 0) {
    await prisma.submission.createMany({
      data: enrollments.map((e) => ({
        assessmentId: assessment.id,
        studentId: e.studentId,
      })),
      skipDuplicates: true,
    });
  }

  return assessment;
}

export async function listAssessmentsForUser(
  actingUser: SessionPayload,
  opts: { classId?: string } = {}
) {
  if (actingUser.role === Role.TEACHER) {
    return prisma.assessment.findMany({
      where: {
        class: { teacherId: actingUser.userId },
        ...(opts.classId ? { classId: opts.classId } : {}),
      },
      orderBy: { dueDate: "desc" },
    });
  }

  if (actingUser.role === Role.STUDENT) {
    return prisma.assessment.findMany({
      where: {
        class: { enrollments: { some: { studentId: actingUser.userId } } },
        ...(opts.classId ? { classId: opts.classId } : {}),
      },
      orderBy: { dueDate: "desc" },
    });
  }

  return [];
}

export async function getAssessmentDetail(
  actingUser: SessionPayload,
  assessmentId: string
) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { class: true },
  });
  if (!assessment) return null;

  if (actingUser.role === Role.TEACHER) {
    if (assessment.class.teacherId !== actingUser.userId) throw new ForbiddenError();
  } else if (actingUser.role === Role.STUDENT) {
    const enrolled = await prisma.enrollment.findUnique({
      where: {
        classId_studentId: {
          classId: assessment.classId,
          studentId: actingUser.userId,
        },
      },
    });
    if (!enrolled) throw new ForbiddenError();
  } else {
    throw new ForbiddenError();
  }

  return assessment;
}
