type EmailContent = { subject: string; text: string };

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export function resultPublishedEmail(params: {
  recipientName: string;
  studentName: string;
  assessmentTitle: string;
  assessmentId: string;
}): EmailContent {
  return {
    subject: `[수행평가 확인] "${params.assessmentTitle}" 결과가 공개되었습니다`,
    text: `${params.recipientName}님,

${params.studentName} 학생의 "${params.assessmentTitle}" 수행평가 결과가 공개되었습니다.
아래 링크에서 확인하세요.

${APP_URL}/results/${params.assessmentId}
`,
  };
}

export function dueSoonEmail(params: {
  recipientName: string;
  studentName: string;
  assessmentTitle: string;
  dueDate: Date;
}): EmailContent {
  return {
    subject: `[수행평가 확인] "${params.assessmentTitle}" 마감이 임박했습니다`,
    text: `${params.recipientName}님,

${params.studentName} 학생의 "${params.assessmentTitle}" 수행평가 마감일이 곧 도래합니다.
마감일: ${params.dueDate.toISOString().slice(0, 10)}

아직 제출하지 않았다면 서둘러 제출해 주세요.
`,
  };
}

export function notSubmittedEmail(params: {
  recipientName: string;
  studentName: string;
  assessmentTitle: string;
  dueDate: Date;
}): EmailContent {
  return {
    subject: `[수행평가 확인] "${params.assessmentTitle}" 미제출 안내`,
    text: `${params.recipientName}님,

${params.studentName} 학생이 "${params.assessmentTitle}" 수행평가를 아직 제출하지 않았습니다.
마감일: ${params.dueDate.toISOString().slice(0, 10)}
`,
  };
}
