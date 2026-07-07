import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { upsertScore, publishOne } from "@/lib/services/scores";
import { getResultDetailForViewer, getResultsListForViewer } from "@/lib/services/results";
import type { SessionPayload } from "@/lib/definitions";

function actingAs(userId: string, role: Role): SessionPayload {
  return { userId, role, expiresAt: new Date(Date.now() + 60_000) };
}

describe("Score publish visibility", () => {
  let teacherId: string;
  let studentId: string;
  let assessmentId: string;
  let submissionId: string;

  beforeAll(async () => {
    const teacher = await prisma.user.create({
      data: {
        email: `pv-teacher-${Date.now()}@test.local`,
        name: "PV Teacher",
        role: Role.TEACHER,
        passwordHash: "x",
      },
    });
    teacherId = teacher.id;

    const student = await prisma.user.create({
      data: {
        email: `pv-student-${Date.now()}@test.local`,
        name: "PV Student",
        role: Role.STUDENT,
        passwordHash: "x",
      },
    });
    studentId = student.id;

    const cls = await prisma.class.create({
      data: { name: "PV Class", subject: "Test", teacherId },
    });
    await prisma.enrollment.create({ data: { classId: cls.id, studentId } });

    const assessment = await prisma.assessment.create({
      data: {
        title: "PV Assessment",
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

    await upsertScore(teacherId, submissionId, { score: 77, feedback: "잘했어요" });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
    await prisma.$disconnect();
  });

  it("omits score/feedback keys before publish", async () => {
    const detail = await getResultDetailForViewer(
      actingAs(studentId, Role.STUDENT),
      studentId,
      assessmentId
    );
    expect(detail?.isResultPublished).toBe(false);
    expect(detail).not.toHaveProperty("score");
    expect(detail).not.toHaveProperty("feedback");
  });

  it("marks the list entry as not published before publish", async () => {
    const list = await getResultsListForViewer(actingAs(studentId, Role.STUDENT), studentId);
    const entry = list.find((r) => r.assessmentId === assessmentId);
    expect(entry?.isResultPublished).toBe(false);
  });

  it("exposes score/feedback only after publish", async () => {
    await publishOne(teacherId, submissionId);

    const detail = await getResultDetailForViewer(
      actingAs(studentId, Role.STUDENT),
      studentId,
      assessmentId
    );
    expect(detail?.isResultPublished).toBe(true);
    expect(detail?.score).toBe(77);
    expect(detail?.feedback).toBe("잘했어요");

    const list = await getResultsListForViewer(actingAs(studentId, Role.STUDENT), studentId);
    const entry = list.find((r) => r.assessmentId === assessmentId);
    expect(entry?.isResultPublished).toBe(true);
  });
});
