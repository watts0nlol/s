// src/AnalyticsDashboard.jsx
// Analytics & Logic Dashboard

import { useState, useEffect } from "react";
import ProgressBar from "./components/ProgressBar";
import StatCard from "./components/StatCard";
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
  CRITICAL: { bg: "#fdecea", text: "#b42318", border: "#f04438" },
  HIGH:   { bg: "#fdecea", text: "#c62828", border: "#e53935" },
  MEDIUM: { bg: "#fff3e0", text: "#e65100", border: "#fb8c00" },
  LOW:    { bg: "#fff8e1", text: "#f57f17", border: "#fdd835" },
  NONE:   { bg: "#e8f5e9", text: "#2e7d32", border: "#43a047" },
};

function GPAArc({ gpa, label }) {
  const pct = (gpa / 4.0) * 100;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = gpa >= 3.5 ? "#43a047" : gpa >= 3.0 ? "#1976d2" : gpa >= 2.0 ? "#fb8c00" : "#e53935";
  return (
    <div className="dashboard-gpa">
      <svg width="112" height="112" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e3f2fd" strokeWidth="9" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
        <text x="48" y="44" textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily="Arial,sans-serif">{gpa.toFixed(1)}</text>
        <text x="48" y="60" textAnchor="middle" fill="#9e9e9e" fontSize="10" fontFamily="Arial,sans-serif">/ 4.0</text>
      </svg>
      <span>{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.DONE;
  return (
    <span className="priority-badge" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {priority}
    </span>
  );
}

function TrendChart({ trendData, large = false }) {
  if (!trendData || trendData.length === 0) {
    return <p className="dashboard-muted">No graded assignments yet.</p>;
  }

  const width = 720;
  const height = large ? 260 : 150;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = trendData.map((pt, i) => {
    const x = padding.left + (trendData.length === 1 ? chartWidth / 2 : (i / (trendData.length - 1)) * chartWidth);
    const y = padding.top + chartHeight - (Math.max(0, Math.min(pt.grade, 100)) / 100) * chartHeight;
    return { ...pt, x, y };
  });
  const linePath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className={large ? "trend-chart trend-chart-large" : "trend-chart"}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Performance trend chart">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="trend-grid-line" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="trend-axis-label">{tick}%</text>
            </g>
          );
        })}
        <path d={areaPath} className="trend-area" />
        <path d={linePath} className="trend-line" />
        {points.map((pt, i) => (
          <g key={`${pt.title}-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={large ? 6 : 5} className="trend-point" />
            <text x={pt.x} y={height - 10} textAnchor="middle" className="trend-axis-label">
              {pt.title?.split(" ")[0] || i + 1}
            </text>
          </g>
        ))}
      </svg>
      <div className="trend-legend">
        {[["#43a047","Improving"],["#1976d2","Stable"],["#e53935","Declining"]].map(([c,l]) => (
          <span key={l}>
            <span style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

const getCourseGrade = (course) => course?.gpa?.percentage ?? course?.gpa?.average ?? 0;
const getCourseLetter = (course) => course?.gpa?.letterGrade ?? course?.gpa?.letter ?? "N/A";
const getPredictionValue = (course) => course?.prediction?.predicted ?? course?.prediction?.projectedFinal ?? 0;
const getPredictionLetter = (course) => course?.prediction?.predictedLetter ?? "N/A";
const getBestCase = (course) => course?.prediction?.bestCase ?? course?.prediction?.scenario?.optimistic ?? 0;
const getWorstCase = (course) => course?.prediction?.worstCase ?? course?.prediction?.scenario?.pessimistic ?? 0;
const getRemainingWeight = (course) => course?.prediction?.remainingWeight ?? Math.max(0, 100 - (course?.prediction?.completionPercent ?? 0));
const getTrendData = (course) => course?.trends?.trendData ?? course?.trends?.trend ?? [];
const getTrendSummary = (course) => {
  if (course?.trends?.summary) return course.trends.summary;
  if (course?.trends?.direction) {
    const label = course.trends.direction.replace("_", " ");
    return `Trend: ${label}${course.trends.delta ? ` (${course.trends.delta > 0 ? "+" : ""}${course.trends.delta} pts)` : ""}.`;
  }
  return "Performance trend will appear once graded work is available.";
};

const formatDueDate = (daysUntilDue) => {
  if (daysUntilDue < 0) return `${Math.abs(Math.round(daysUntilDue))}d overdue`;
  if (daysUntilDue < 1) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${Math.round(daysUntilDue)}d`;
};

const getAssignmentPriority = (assignment) => assignment.priority ?? assignment.priorityLabel ?? "LOW";
const getAverageGrade = (trendData) => {
  if (!trendData?.length) return 0;
  return parseFloat((trendData.reduce((sum, pt) => sum + (pt.grade || 0), 0) / trendData.length).toFixed(1));
};

export default function AnalyticsDashboard({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

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
        setUsingFallback(false);
        if (json.courses?.length > 0) setSelectedCourse(json.courses[0].courseName);
      } catch {
        setData(MOCK_DATA);
        setUsingFallback(true);
        setSelectedCourse(MOCK_DATA.courses[0].courseName);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <section className="dashboard-shell">
        <div className="dashboard-state dashboard-card">
          <div className="dashboard-loader" aria-hidden="true" />
          <h2>Loading analytics</h2>
          <p>Your course progress is being prepared.</p>
        </div>
      </section>
    );
  }
  if (!data) return null;

  const course = data.courses?.find((c) => c.courseName === selectedCourse);
  const totalCourses = data.totalCourses ?? data.courses?.length ?? 0;
  const pendingAssignments = data.pendingAssignments ?? Math.max(0, (data.totalAssignments ?? 0) - (data.completedAssignments ?? 0));
  const completedPct = data.totalAssignments > 0 ? Math.round((data.completedAssignments / data.totalAssignments) * 100) : 0;
  const currentTrendData = getTrendData(course);
  const averageGrade = getAverageGrade(currentTrendData);
  const selectedCourseGrade = getCourseGrade(course);
  const selectedRisk = course?.risk?.riskLevel || "NONE";

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Student Tracker Analytics</p>
          <h2>Welcome back</h2>
          <p className="dashboard-subtitle">
            Here is the latest view of course performance, assignment pressure, and academic risk.
          </p>
        </div>
        <div className="dashboard-hero-summary">
          <div>
            <span>{completedPct}%</span>
            <p>completion rate</p>
          </div>
          <a className="dashboard-primary-action" href="#assignment-form">Add Assignment</a>
          {usingFallback && <div className="dashboard-fallback">Preview data shown</div>}
        </div>
      </div>

      <div className="dashboard-kpi-row">
        <StatCard
          title="Cumulative GPA"
          value={(data.cumulativeGPA || 0).toFixed(1)}
          color="#5b5cf6"
          sub="Out of 4.0"
          icon="G"
          trend={data.cumulativeGPA >= 3 ? "On track" : "Needs focus"}
        />
        <StatCard
          title="Completed"
          value={data.completedAssignments}
          color="#16a34a"
          sub={`${completedPct}% complete`}
          icon="C"
          trend="+ Progress"
        />
        <StatCard
          title="Pending"
          value={pendingAssignments}
          color="#f97316"
          sub="Assignments open"
          icon="P"
          trend={pendingAssignments > 0 ? "Action needed" : "Clear"}
        />
        <StatCard
          title="Courses"
          value={totalCourses}
          color="#2563eb"
          sub="Currently tracked"
          icon="K"
          trend="Active"
        />
        <StatCard
          title="Total Work"
          value={data.totalAssignments}
          color="#e11d48"
          sub="All assignments"
          icon="T"
          trend="Portfolio"
        />
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-left-column">
          {data.courses?.length > 0 && (
            <div className="dashboard-card dashboard-course-card" id="dashboard-courses">
              <div className="dashboard-section-heading">
                <div>
                  <p className="dashboard-eyebrow">Course focus</p>
                  <h3>Course Performance</h3>
                </div>
                <div className="course-tabs" role="tablist" aria-label="Courses">
                  {data.courses.map((c) => (
                    <button
                      key={c.courseName}
                      onClick={() => setSelectedCourse(c.courseName)}
                      className={selectedCourse === c.courseName ? "course-tab active" : "course-tab"}
                      type="button"
                      role="tab"
                      aria-selected={selectedCourse === c.courseName}
                    >
                      {c.courseName}
                    </button>
                  ))}
                </div>
              </div>

              {course && (
                <div className="course-command-center">
                  <div className="course-spotlight">
                    <GPAArc gpa={course.gpa?.gpa ?? data.cumulativeGPA ?? 0} label={getCourseLetter(course)} />
                    <div>
                      <p className="dashboard-eyebrow">Selected course</p>
                      <h4>{course.courseName}</h4>
                      <p className="dashboard-muted">
                        Current grade is {selectedCourseGrade || 0}%. Predicted outcome is {getPredictionValue(course) || 0}%.
                      </p>
                    </div>
                  </div>

                  <div className="course-metrics-grid">
                    <div className="mini-metric">
                      <span>{selectedCourseGrade || 0}%</span>
                      <p>Current grade</p>
                    </div>
                    <div className="mini-metric">
                      <span>{getPredictionValue(course) || 0}%</span>
                      <p>Predicted</p>
                    </div>
                    <div className="mini-metric">
                      <span>{getRemainingWeight(course)}%</span>
                      <p>Weight remaining</p>
                    </div>
                    <div className="mini-metric">
                      <span>{selectedRisk}</span>
                      <p>Risk level</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {course && (
            <div className="dashboard-card dashboard-chart-card" id="dashboard-report">
              <div className="dashboard-section-heading">
                <div>
                  <p className="dashboard-eyebrow">Performance trend</p>
                  <h3>Average Grade {averageGrade ? `${averageGrade}%` : ""}</h3>
                </div>
                <a className="dashboard-link" href="#dashboard-courses">View course detail</a>
              </div>
              <p className="dashboard-muted">{getTrendSummary(course)}</p>
              <TrendChart trendData={currentTrendData} large />
            </div>
          )}

          {course && (
            <div className="dashboard-detail-grid">
              <div className="dashboard-card dashboard-panel">
                <h4>Grade Forecast</h4>
                <div className="metric-row">
                  <p>Current ({getCourseLetter(course)})</p>
                  <ProgressBar value={selectedCourseGrade} />
                </div>
                <div className="metric-row">
                  <p>Predicted ({getPredictionLetter(course)})</p>
                  <ProgressBar value={getPredictionValue(course)} />
                </div>
                <div className="forecast-range">
                  <div>
                    <span>{getWorstCase(course)}%</span>
                    <p>Worst case</p>
                  </div>
                  <div>
                    <span>{getBestCase(course)}%</span>
                    <p>Best case</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-card dashboard-panel risk-panel" style={{ borderColor: RISK_COLORS[selectedRisk]?.border || "#d7e5f5" }}>
                <h4>Risk Assessment</h4>
                <div
                  className="risk-badge"
                  style={{
                    background: RISK_COLORS[selectedRisk]?.bg || "#f5f5f5",
                    color: RISK_COLORS[selectedRisk]?.text || "#333",
                    borderColor: RISK_COLORS[selectedRisk]?.border || "#ccc",
                  }}
                >
                  {selectedRisk} RISK
                </div>
                {course.risk?.alerts?.length > 0 ? course.risk.alerts.map((alert, i) => (
                  <p key={i} className="risk-alert">{typeof alert === "string" ? alert : alert.message}</p>
                )) : <p className="dashboard-muted">No major risk alerts for this course.</p>}
                {course.risk?.recommendations?.length > 0 && (
                  <div className="risk-recommendations">
                    {course.risk.recommendations.map((r, i) => (
                      <p key={i}>{typeof r === "string" ? r : r.message}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="dashboard-right-column">
          <div className="dashboard-card dashboard-urgent" id="dashboard-urgent">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-eyebrow">Focus next</p>
                <h3>Urgent Assignments</h3>
              </div>
              <a className="dashboard-link" href="#assignment-list">View all</a>
            </div>

            {data.upcomingPriority?.length > 0 ? (
              <div className="urgent-list">
                {data.upcomingPriority.map((a, i) => (
                  <div key={i} className="urgent-item">
                    <div className="urgent-main">
                      <span className="task-icon">!</span>
                      <div>
                        <h4>{a.title}</h4>
                        <p>{a.course || "Uncategorized"}</p>
                      </div>
                    </div>
                    <div className="urgent-meta">
                      <PriorityBadge priority={getAssignmentPriority(a)} />
                      <span className={a.daysUntilDue < 1 ? "urgent-due urgent-due-hot" : "urgent-due"}>
                        {formatDueDate(a.daysUntilDue)}
                      </span>
                      {a.weight && <span className="urgent-weight">{a.weight}% weight</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-small">
                <h4>No urgent assignments</h4>
                <p>Your highest-priority work will appear here.</p>
              </div>
            )}
          </div>

          <div className="dashboard-card quick-actions-card">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-eyebrow">Shortcuts</p>
                <h3>Quick Actions</h3>
              </div>
            </div>
            <div className="quick-actions-grid">
              <a href="#assignment-form" className="quick-action">
                <span>A</span>
                <div>
                  <h4>Add Assignment</h4>
                  <p>Create local tracker item</p>
                </div>
              </a>
              <a href="#dashboard-courses" className="quick-action">
                <span>C</span>
                <div>
                  <h4>Review Courses</h4>
                  <p>Switch course analytics</p>
                </div>
              </a>
              <a href="#dashboard-report" className="quick-action">
                <span>R</span>
                <div>
                  <h4>View Reports</h4>
                  <p>Jump to trend chart</p>
                </div>
              </a>
              <a href="#dashboard-urgent" className="quick-action">
                <span>P</span>
                <div>
                  <h4>Priority Tasks</h4>
                  <p>See urgent work</p>
                </div>
              </a>
            </div>
          </div>
        </aside>
      </div>

      {data.courses?.length === 0 && (
        <div className="dashboard-state dashboard-card">
          <h2>No analytics yet</h2>
          <p>Add assignments to start seeing GPA, risk, and performance trends.</p>
        </div>
      )}
    </section>
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
