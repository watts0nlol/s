// src/AnalyticsDashboard.jsx
// Analytics & Logic Dashboard

import { useState, useEffect } from "react";
import ProgressBar from "./components/ProgressBar";
import StatCard from "./components/StatCard";
import RiskCard from "./components/RiskCard";
import PerformanceChart from "./components/PerformanceChart";
import { API_BASE_URL } from "./config";

const PRIORITY_COLORS = {
  OVERDUE:  { bg: "#fdecea", text: "#c62828", border: "#e53935" },
  CRITICAL: { bg: "#fff3e0", text: "#e65100", border: "#fb8c00" },
  HIGH:     { bg: "#fff8e1", text: "#f57f17", border: "#fdd835" },
  MEDIUM:   { bg: "#e3f2fd", text: "#1565c0", border: "#1976d2" },
  LOW:      { bg: "#e8f5e9", text: "#2e7d32", border: "#43a047" },
  DONE:     { bg: "#f5f5f5", text: "#9e9e9e", border: "#bdbdbd" },
};

const RISK_COLORS = {
  HIGH:   { bg: "#fdecea", text: "#c62828", border: "#e53935" },
  MEDIUM: { bg: "#fff3e0", text: "#e65100", border: "#fb8c00" },
  LOW:    { bg: "#fff8e1", text: "#f57f17", border: "#fdd835" },
  NONE:   { bg: "#e8f5e9", text: "#2e7d32", border: "#43a047" },
};

const gradeColor = (pct) => {
  if (pct >= 80) return "#2e7d32";
  if (pct >= 70) return "#1565c0";
  if (pct >= 60) return "#e65100";
  return "#c62828";
};

function GPAArc({ gpa, label }) {
  const pct = (gpa / 4.0) * 100;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = gpa >= 3.5 ? "#43a047" : gpa >= 3.0 ? "#1976d2" : gpa >= 2.0 ? "#fb8c00" : "#e53935";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e3f2fd" strokeWidth="9" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
        <text x="48" y="44" textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily="Arial,sans-serif">{gpa.toFixed(1)}</text>
        <text x="48" y="60" textAnchor="middle" fill="#9e9e9e" fontSize="10" fontFamily="Arial,sans-serif">/ 4.0</text>
      </svg>
      <span style={{ fontSize: 11, color: "#757575", letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "Arial,sans-serif" }}>{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.DONE;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: "700", fontFamily: "Arial,sans-serif", letterSpacing: 0.4 }}>
      {priority}
    </span>
  );
}

function GradeBar({ pct, label }) {
  const color = gradeColor(pct);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "#555", fontFamily: "Arial,sans-serif" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: "700", color, fontFamily: "Arial,sans-serif" }}>{pct}%</span>
      </div>
      <div style={{ background: "#e3f2fd", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 6, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

function TrendChart({ trendData }) {
  if (!trendData || trendData.length === 0) {
    return <p style={{ color: "#9e9e9e", fontSize: 13, fontFamily: "Arial,sans-serif" }}>No graded assignments yet.</p>;
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "0 2px", borderBottom: "2px solid #e3f2fd" }}>
        {trendData.map((pt, i) => {
          const h = Math.max((pt.grade / 100) * 80, 4);
          const color = pt.trend === "improving" ? "#43a047" : pt.trend === "declining" ? "#e53935" : "#1976d2";
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 9, color: "#9e9e9e", fontFamily: "Arial,sans-serif", marginBottom: 2 }}>{pt.grade}%</span>
              <div title={`${pt.title}: ${pt.grade}%`}
                style={{ width: "100%", height: h, background: color, borderRadius: "3px 3px 0 0", transition: "height 0.6s ease", cursor: "pointer" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        {[["#43a047","Improving"],["#1976d2","Stable"],["#e53935","Declining"]].map(([c,l]) => (
          <span key={l} style={{ fontSize: 11, color: "#555", fontFamily: "Arial,sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: "inline-block" }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json);
        if (json.courses?.length > 0) setSelectedCourse(json.courses[0].courseName);
      } catch {
        setData(MOCK_DATA);
        setSelectedCourse(MOCK_DATA.courses[0].courseName);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) return <div className="card" style={{ textAlign: "center", padding: 30 }}><p style={{ color: "#9e9e9e" }}>Loading analytics…</p></div>;
  if (!data) return null;

  const course = data.courses?.find((c) => c.courseName === selectedCourse);
  const completedPct = data.totalAssignments > 0 ? Math.round((data.completedAssignments / data.totalAssignments) * 100) : 0;

  return (
    <div style={{ textAlign: "left" }}>
      <h2>📊 Analytics Dashboard</h2>

      {/* GPA + Stats */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <GPAArc gpa={data.cumulativeGPA || 0} label="Cumulative GPA" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
<StatCard
  title="Total"
  value={data.totalAssignments}
  color="#1976d2"
  icon="📊"
/>

<StatCard
  title="Completed"
  value={data.completedAssignments}
  color="#2e7d32"
  sub={`${completedPct}% done`}
  icon="✅"
/>

<StatCard
  title="Pending"
  value={data.pendingAssignments}
  color="#f57c00"
  icon="⏳"
/>

<StatCard
  title="Courses"
  value={data.totalCourses}
  color="#7b1fa2"
  icon="📚"
/>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Assignments */}
      {data.upcomingPriority?.length > 0 && (
        <div className="card">
          <h2>🔥 Urgent Assignments</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.upcomingPriority.map((a, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", background: "#f9f9f9", borderRadius: 8,
                border: `1px solid ${PRIORITY_COLORS[a.priority]?.border || "#ccc"}`,
                flexWrap: "wrap", gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PriorityBadge priority={a.priority} />
                  <span style={{ fontWeight: "600", fontSize: 14, color: "#333", fontFamily: "Arial,sans-serif" }}>{a.title}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#757575", fontFamily: "Arial,sans-serif" }}>{a.course}</span>
                  <span style={{ fontSize: 12, color: "#9e9e9e", fontFamily: "Arial,sans-serif" }}>
                    {a.daysUntilDue < 0 ? `${Math.abs(Math.round(a.daysUntilDue))}d overdue` : `in ${Math.round(a.daysUntilDue)}d`}
                  </span>
                  {a.weight && <span style={{ fontSize: 12, fontWeight: "700", color: "#1976d2", fontFamily: "Arial,sans-serif" }}>{a.weight}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Breakdown */}
      {data.courses?.length > 0 && (
        <div className="card">
          <h2>📚 Course Breakdown</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {data.courses.map((c) => (
              <button key={c.courseName} onClick={() => setSelectedCourse(c.courseName)}
                style={{
                  padding: "8px 16px", border: "none", borderRadius: 6, cursor: "pointer",
                  fontFamily: "Arial,sans-serif", fontSize: 13, fontWeight: "600",
                  background: selectedCourse === c.courseName ? "#1976d2" : "#e3f2fd",
                  color: selectedCourse === c.courseName ? "white" : "#1565c0",
                  transition: "background 0.2s",
                }}>
                {c.courseName}
              </button>
            ))}
          </div>

          {course && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>

                {/* Grade & Prediction */}
                <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 16, border: "1px solid #e3f2fd" }}>
                  <h3 style={{ margin: "0 0 12px", color: "#333", fontSize: 14, fontWeight: 600 }}>📈 Grade & Prediction</h3>
                  <div style={{ marginBottom: 10 }}>
                    <p>Current ({course.gpa?.letterGrade || "N/A"})</p>
                    <ProgressBar value={course.gpa?.percentage || 0} />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <p>Predicted ({course.prediction?.predictedLetter || "N/A"})</p>
                    <ProgressBar value={course.prediction?.predicted || 0} />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <p>Best Case</p>
                    <ProgressBar value={course.prediction?.bestCase || 0} />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <p>Worst Case</p>
                    <ProgressBar value={course.prediction?.worstCase || 0} />
                  </div>
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "#e3f2fd", borderRadius: 6 }}>
                    <span style={{ fontSize: 12, color: "#1565c0", fontFamily: "Arial,sans-serif" }}>
                      📝 <strong>{course.prediction?.remainingWeight || 0}%</strong> of course weight remaining
                    </span>
                  </div>
                </div>

                {/* Risk */}
                <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 16, border: `1px solid ${RISK_COLORS[course.risk?.riskLevel]?.border || "#ccc"}` }}>
                  <h3 style={{ margin: "0 0 12px", color: "#333", fontSize: 14, fontWeight: 600 }}>⚠️ Risk Assessment</h3>
                  <div style={{
                    display: "inline-block", marginBottom: 12,
                    background: RISK_COLORS[course.risk?.riskLevel]?.bg || "#f5f5f5",
                    color: RISK_COLORS[course.risk?.riskLevel]?.text || "#333",
                    border: `1px solid ${RISK_COLORS[course.risk?.riskLevel]?.border || "#ccc"}`,
                    borderRadius: 6, padding: "4px 14px", fontWeight: "700", fontSize: 13,
                    letterSpacing: 0.5, fontFamily: "Arial,sans-serif",
                  }}>{course.risk?.riskLevel} RISK</div>
                  {course.risk?.alerts?.map((alert, i) => (
                    <p key={i} style={{ fontSize: 12, color: "#c62828", margin: "0 0 4px", fontFamily: "Arial,sans-serif" }}>{alert}</p>
                  ))}
                  {course.risk?.recommendations?.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: "1px solid #e3f2fd", paddingTop: 8 }}>
                      {course.risk.recommendations.map((r, i) => (
                        <p key={i} style={{ fontSize: 12, color: "#2e7d32", margin: "0 0 4px", fontFamily: "Arial,sans-serif" }}>💡 {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Trend Chart */}
              <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 16, border: "1px solid #e3f2fd" }}>
                <h3 style={{ margin: "0 0 6px", color: "#333", fontSize: 14, fontWeight: 600 }}>📉 Performance Trend</h3>
                <p style={{ fontSize: 12, color: "#757575", margin: "0 0 12px", fontFamily: "Arial,sans-serif" }}>{course.trends?.summary}</p>
                <TrendChart trendData={course.trends?.trendData} />
              </div>
            </div>
          )}
        </div>
      )}

      {data.courses?.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "#9e9e9e", padding: 30 }}>
          <p>No assignments added yet. Start adding assignments to see your analytics.</p>
        </div>
      )}
    </div>
  );
}

const MOCK_DATA = {
  cumulativeGPA: 3.2,
  totalAssignments: 8,
  completedAssignments: 5,
  upcomingPriority: [
    { title: "Lab 3 Report", course: "CPAN 212", priority: "CRITICAL", daysUntilDue: 0.8, weight: 15 },
    { title: "Midterm Exam", course: "CPAN 314", priority: "HIGH", daysUntilDue: 2.5, weight: 30 },
    { title: "Assignment 4", course: "CPAN 212", priority: "MEDIUM", daysUntilDue: 4.1, weight: 10 },
  ],
  courses: [
    {
      courseName: "CPAN 314",
      gpa: { gpa: 3.3, percentage: 82, letterGrade: "A-", totalWeight: 40 },
      prediction: { predicted: 78.5, bestCase: 91, worstCase: 57, predictedLetter: "B+", remainingWeight: 60, completedWeight: 40 },
      risk: { riskLevel: "LOW", alerts: ["📌 Current grade (82%) could be improved."], recommendations: ["Maintain consistent effort on remaining assignments."] },
      trends: {
        summary: "📈 Overall trend: improving. Average: 79%. Best: 88%, Lowest: 68%.",
        trendData: [
          { title: "Quiz 1", grade: 68, trend: "stable" },
          { title: "Lab 1", grade: 75, trend: "improving" },
          { title: "Assignment 1", grade: 82, trend: "improving" },
          { title: "Midterm", grade: 85, trend: "improving" },
          { title: "Lab 2", grade: 88, trend: "improving" },
        ],
      },
    },
    {
      courseName: "CPAN 212",
      gpa: { gpa: 2.7, percentage: 73, letterGrade: "B", totalWeight: 30 },
      prediction: { predicted: 69, bestCase: 84, worstCase: 51, predictedLetter: "C+", remainingWeight: 70, completedWeight: 30 },
      risk: { riskLevel: "MEDIUM", alerts: ["📉 Current grade (73%) needs improvement."], recommendations: ["Focus on high-weight assignments."] },
      trends: {
        summary: "📉 Overall trend: declining. Average: 73%. Best: 80%, Lowest: 65%.",
        trendData: [
          { title: "Assignment 1", grade: 80, trend: "stable" },
          { title: "Lab 1", grade: 76, trend: "declining" },
          { title: "Quiz 1", grade: 65, trend: "declining" },
        ],
      },
    },
  ],
};
