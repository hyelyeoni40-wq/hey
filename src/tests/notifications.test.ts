import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

const { sendMail } = await import("@/lib/mailer");
const { notifyResultPublished } = await import("@/lib/services/notifications");

describe("Notification dedupe", () => {
  let teacherId: string;
  let studentId: string;
  let parentId: string;
  let assessmentId: string;
  let submissionId: string;

  beforeAll(async () => {
    const teacher = await prisma.user.create({
      data: {
        email: `notif-teacher-${Date.now()}@test.local`,
        name: "Notif Teacher",
        role: Role.TEACHER,
        passwordHash: "x",
      },
    });
    teacherId = teacher.id;

    const student = await prisma.user.create({
      data: {
        email: `notif-student-${Date.now()}@test.local`,
        name: "Notif Student",
        role: Role.STUDENT,
        passwordHash: "x",
      },
    });
    studentId = student.id;

    const parent = await prisma.user.create({
      data: {
        email: `notif-parent-${Date.now()}@test.local`,
        name: "Notif Parent",
        role: Role.PARENT,
        passwordHash: "x",
      },
    });
    parentId = parent.id;

    await prisma.parentChild.create({ data: { parentId, studentId } });

    const cls = await prisma.class.create({
      data: { name: "Notif Class", subject: "Test", teacherId },
    });
    await prisma.enrollment.create({ data: { classId: cls.id, studentId } });

    const assessment = await prisma.assessment.create({
      data: {
        title: "Notif Assessment",
        subject: "Test",
        classId: cls.id,
        dueDate: new Date(),
        semester: "2026-1",
        rubric: "N/A",
      },
    });
    assessmentId = assessment.id;

    const submission = await prisma.submission.create({
      data: { assessmentId, studentId },
    });
    submissionId = submission.id;

    await prisma.score.create({
      data: { submissionId, score: 88, isPublished: true },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [teacherId, studentId, parentId] } } });
    await prisma.$disconnect();
  });

  it("sends one email per recipient (student + parent) on first publish", async () => {
    await notifyResultPublished(submissionId);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("does not send duplicate emails on a repeat call for the same publish", async () => {
    vi.mocked(sendMail).mockClear();
    await notifyResultPublished(submissionId);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
