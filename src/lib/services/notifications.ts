import "server-only";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { NotificationType } from "@/generated/prisma/enums";
import {
  dueSoonEmail,
  notSubmittedEmail,
  resultPublishedEmail,
} from "@/lib/email-templates";

async function getRecipients(studentId: string) {
  const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  const parentLinks = await prisma.parentChild.findMany({
    where: { studentId },
    include: { parent: true },
  });
  return [student, ...parentLinks.map((l) => l.parent)];
}

/** Records a NotificationLog row; returns false (and sends nothing) if this
 *  (type, user, assessment) combo was already notified. */
async function logIfNew(type: NotificationType, userId: string, assessmentId: string) {
  try {
    await prisma.notificationLog.create({ data: { type, userId, assessmentId } });
    return true;
  } catch {
    // Unique constraint violation: already notified for this combo.
    return false;
  }
}

export async function notifyResultPublished(submissionId: string) {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { assessment: true, student: true },
  });

  const recipients = await getRecipients(submission.studentId);

  for (const recipient of recipients) {
    const isNew = await logIfNew(
      NotificationType.RESULT_PUBLISHED,
      recipient.id,
      submission.assessmentId
    );
    if (!isNew) continue;

    const { subject, text } = resultPublishedEmail({
      recipientName: recipient.name,
      studentName: submission.student.name,
      assessmentTitle: submission.assessment.title,
      assessmentId: submission.assessmentId,
    });
    await sendMail({ to: recipient.email, subject, text });
  }
}

export async function runDueAndNotSubmittedSweep(now: Date = new Date()) {
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let dueSoonSent = 0;
  let notSubmittedSent = 0;

  const dueSoonAssessments = await prisma.assessment.findMany({
    where: { dueDate: { gte: now, lte: in24h } },
    include: { submissions: { include: { student: true } } },
  });

  for (const assessment of dueSoonAssessments) {
    for (const submission of assessment.submissions) {
      const recipients = await getRecipients(submission.studentId);
      for (const recipient of recipients) {
        const isNew = await logIfNew(
          NotificationType.DUE_SOON,
          recipient.id,
          assessment.id
        );
        if (!isNew) continue;

        const { subject, text } = dueSoonEmail({
          recipientName: recipient.name,
          studentName: submission.student.name,
          assessmentTitle: assessment.title,
          dueDate: assessment.dueDate,
        });
        await sendMail({ to: recipient.email, subject, text });
        dueSoonSent += 1;
      }
    }
  }

  const overdueNotSubmitted = await prisma.submission.findMany({
    where: { status: "NOT_SUBMITTED", assessment: { dueDate: { lt: now } } },
    include: { assessment: true, student: true },
  });

  for (const submission of overdueNotSubmitted) {
    const recipients = await getRecipients(submission.studentId);
    for (const recipient of recipients) {
      const isNew = await logIfNew(
        NotificationType.NOT_SUBMITTED,
        recipient.id,
        submission.assessmentId
      );
      if (!isNew) continue;

      const { subject, text } = notSubmittedEmail({
        recipientName: recipient.name,
        studentName: submission.student.name,
        assessmentTitle: submission.assessment.title,
        dueDate: submission.assessment.dueDate,
      });
      await sendMail({ to: recipient.email, subject, text });
      notSubmittedSent += 1;
    }
  }

  return { dueSoonSent, notSubmittedSent };
}
