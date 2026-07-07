"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = { semester: string; subject: string; avgScore: number };

export function ScoreTrendChart({ data }: { data: TrendPoint[] }) {
  const semesters = [...new Set(data.map((d) => d.semester))].sort();
  const subjects = [...new Set(data.map((d) => d.subject))];

  const chartData = semesters.map((semester) => {
    const row: Record<string, string | number> = { semester };
    for (const subject of subjects) {
      const point = data.find((d) => d.semester === semester && d.subject === subject);
      if (point) row[subject] = point.avgScore;
    }
    return row;
  });

  const colors = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"];

  if (data.length === 0) {
    return <p>표시할 공개된 성적이 없습니다.</p>;
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="semester" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          {subjects.map((subject, i) => (
            <Line
              key={subject}
              type="monotone"
              dataKey={subject}
              stroke={colors[i % colors.length]}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
