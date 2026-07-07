"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: "NOT_SUBMITTED" | "SUBMITTED" | "RESUBMITTED";
  score: number | null;
  feedback: string | null;
  isPublished: boolean;
};

const STATUS_LABEL: Record<Row["status"], string> = {
  NOT_SUBMITTED: "미제출",
  SUBMITTED: "제출",
  RESUBMITTED: "재제출",
};

export function GradingTable({
  assessmentId,
  submissions,
}: {
  assessmentId: string;
  submissions: Row[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>(
    Object.fromEntries(
      submissions.map((s) => [
        s.id,
        { score: s.score?.toString() ?? "", feedback: s.feedback ?? "" },
      ])
    )
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveDraft(submissionId: string) {
    const draft = drafts[submissionId];
    const score = Number(draft.score);
    if (!Number.isFinite(score)) {
      setMessage("점수는 숫자로 입력하세요.");
      return;
    }
    setBusyId(submissionId);
    setMessage(null);
    const res = await fetch(`/api/submissions/${submissionId}/score`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, feedback: draft.feedback }),
    });
    setBusyId(null);
    if (!res.ok) {
      setMessage("저장 실패");
      return;
    }
    setMessage("임시저장 완료");
    router.refresh();
  }

  async function publishOne(submissionId: string) {
    setBusyId(submissionId);
    setMessage(null);
    const res = await fetch(`/api/assessments/${assessmentId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "one", submissionId }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "공개 실패");
      return;
    }
    router.refresh();
  }

  async function publishAll() {
    setBusyId("__all__");
    setMessage(null);
    const res = await fetch(`/api/assessments/${assessmentId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "all" }),
    });
    setBusyId(null);
    if (!res.ok) {
      setMessage("일괄 공개 실패");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={publishAll} disabled={busyId !== null}>
        학급 전체 일괄 공개
      </button>
      {message && <p role="status">{message}</p>}

      <div style={{ overflowX: "auto" }}>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
        <thead>
          <tr>
            <th>학생</th>
            <th>제출상태</th>
            <th>점수</th>
            <th>피드백</th>
            <th>공개여부</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id}>
              <td>
                {s.studentName}
                <br />
                <small>{s.studentEmail}</small>
              </td>
              <td>{STATUS_LABEL[s.status]}</td>
              <td>
                <input
                  type="number"
                  style={{ width: "4rem" }}
                  value={drafts[s.id]?.score ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [s.id]: { ...prev[s.id], score: e.target.value },
                    }))
                  }
                />
              </td>
              <td>
                <input
                  type="text"
                  style={{ width: "12rem" }}
                  value={drafts[s.id]?.feedback ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [s.id]: { ...prev[s.id], feedback: e.target.value },
                    }))
                  }
                />
              </td>
              <td>{s.isPublished ? "공개됨" : "채점 중"}</td>
              <td>
                <button disabled={busyId === s.id} onClick={() => saveDraft(s.id)}>
                  임시저장
                </button>{" "}
                <button disabled={busyId === s.id || s.isPublished} onClick={() => publishOne(s.id)}>
                  공개
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
