import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { Role, SubmissionStatus } from "@/generated/prisma/enums";
import { getSubmissionForViewer, ForbiddenError } from "@/lib/services/submissions";
import type { SessionPayload } from "@/lib/definitions";

function actingAs(userId: string, role: Role): SessionPayload {
  return { userId, role, expiresAt: new Date(Date.now() + 60_000) };
}

describe("RBAC: submission access", () => {
  let teacherId: string;
  let otherTeacherId: string;
  let studentAId: string;
  let studentBId: string;
  let parentOfAId: string;
  let submissionAId: string;

  beforeAll(async () => {
    const teacher = await prisma.user.create({
      data: {
        email: `rbac-teacher-${Date.now()}@test.local`,
        name: "Test Teacher",
        role: Role.TEACHER,
        passwordHash: "x",
      },
    });
    teacherId = teacher.id;

    const otherTeacher = await prisma.user.create({
      data: {
        email: `rbac-teacher-other-${Date.now()}@test.local`,
        name: "Other Teacher",
        role: Role.TEACHER,
        passwordHash: "x",
      },
    });
    otherTeacherId = otherTeacher.id;

    const studentA = await prisma.user.create({
      data: {
        email: `rbac-student-a-${Date.now()}@test.local`,
        name: "Student A",
        role: Role.STUDENT,
        passwordHash: "x",
      },
    });
    studentAId = studentA.id;

    const studentB = await prisma.user.create({
      data: {
        email: `rbac-student-b-${Date.now()}@test.local`,
        name: "Student B",
        role: Role.STUDENT,
        passwordHash: "x",
      },
    });
    studentBId = studentB.id;

    const parentOfA = await prisma.user.create({
      data: {
        email: `rbac-parent-a-${Date.now()}@test.local`,
        name: "Parent of A",
        role: Role.PARENT,
        passwordHash: "x",
      },
    });
    parentOfAId = parentOfA.id;

    await prisma.parentChild.create({
      data: { parentId: parentOfAId, studentId: studentAId },
    });

    const cls = await prisma.class.create({
      data: { name: "RBAC Test Class", subject: "Test", teacherId },
    });

    await prisma.enrollment.createMany({
      data: [
        { classId: cls.id, studentId: studentAId },
        { classId: cls.id, studentId: studentBId },
      ],
    });

    const assessment = await prisma.assessment.create({
      data: {
        title: "RBAC Test Assessment",
        subject: "Test",
        classId: cls.id,
        dueDate: new Date(),
        semester: "2026-1",
        rubric: "N/A",
      },
    });

    const submissionA = await prisma.submission.create({
      data: {
        assessmentId: assessment.id,
        studentId: studentAId,
        status: SubmissionStatus.SUBMITTED,
      },
    });
    submissionAId = submissionA.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: { in: [teacherId, otherTeacherId, studentAId, studentBId, parentOfAId] },
      },
    });
    await prisma.$disconnect();
  });

  it("allows the owning student to view their own submission", async () => {
    const result = await getSubmissionForViewer(
      actingAs(studentAId, Role.STUDENT),
      submissionAId
    );
    expect(result?.id).toBe(submissionAId);
  });

  it("forbids a different student from viewing someone else's submission", async () => {
    await expect(
      getSubmissionForViewer(actingAs(studentBId, Role.STUDENT), submissionAId)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows a linked parent to view their child's submission", async () => {
    const result = await getSubmissionForViewer(
      actingAs(parentOfAId, Role.PARENT),
      submissionAId
    );
    expect(result?.id).toBe(submissionAId);
  });

  it("allows the owning teacher to view a submission in their class", async () => {
    const result = await getSubmissionForViewer(
      actingAs(teacherId, Role.TEACHER),
      submissionAId
    );
    expect(result?.id).toBe(submissionAId);
  });

  it("forbids a teacher who doesn't own the class", async () => {
    await expect(
      getSubmissionForViewer(actingAs(otherTeacherId, Role.TEACHER), submissionAId)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns null for a non-existent submission", async () => {
    const result = await getSubmissionForViewer(
      actingAs(studentAId, Role.STUDENT),
      "does-not-exist"
    );
    expect(result).toBeNull();
  });
});
