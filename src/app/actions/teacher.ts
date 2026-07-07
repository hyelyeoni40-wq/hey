"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { createClass, enrollStudentByEmail } from "@/lib/services/classes";
import { createAssessment } from "@/lib/services/assessments";

async function requireTeacher() {
  const session = await verifySession();
  if (session.role !== Role.TEACHER) {
    throw new Error("교사만 사용할 수 있습니다.");
  }
  return session;
}

export async function createClassAction(formData: FormData) {
  const session = await requireTeacher();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!name || !subject) return;

  await createClass(session.userId, { name, subject });
  revalidatePath("/teacher");
}

export async function enrollStudentAction(formData: FormData) {
  const session = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!classId || !email) return;

  await enrollStudentByEmail(session.userId, classId, email);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function createAssessmentAction(formData: FormData) {
  const session = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "");
  const rubric = String(formData.get("rubric") ?? "").trim();
  if (!classId || !title || !subject || !dueDate || !rubric) return;

  await createAssessment(session.userId, classId, {
    title,
    subject,
    dueDate: new Date(dueDate),
    rubric,
  });
  revalidatePath(`/teacher/classes/${classId}`);
}
