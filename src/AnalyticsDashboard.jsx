import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "./components/ProgressBar";
import StatCard from "./components/StatCard";
import { API_BASE_URL } from "./config";

const priorityColors = {
  OVERDUE: { background: "#fee2e2", color: "#b91c1c" },
  CRITICAL: { background: "#ffedd5", color: "#c2410c" },
  HIGH: { background: "#fef3c7", color: "#a16207" },
  MEDIUM: { background: "#dbeafe", color: "#1d4ed8" },
  LOW: { background: "#dcfce7", color: "#15803d" },
  DONE: { background: "#dcfce7", color: "#15803d" },
};

const riskClass = (risk = "NONE") => `risk-${risk.toLowerCase()}`;
const courseGrade = (course) => course?.gpa?.percentage ?? course?.gpa?.average ?? 0;
const courseLetter = (course) => course?.gpa?.letterGrade ?? course?.gpa?.letter ?? "N/A";
const trendDataFor = (course) => course?.trends?.trendData ?? course?.trends?.trend ?? [];
const courseCompletion = (course) => course?.completionPercent ?? 0;

const dueLabel = (assignment) => {
  const days = assignment.daysUntilDue;
  if (days == null && assignment.dueDate) return new Date(assignment.dueDate).toLocaleDateString();
  if (days < 0) return `${Math.abs(Math.round(days))}d overdue`;
  if (days < 1) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${Math.round(days)}d`;
};

function TrendChart({ data }) {
  if (!data?.length) return <div className="empty-state compact-empty"><h3>No graded work yet</h3><p>Your performance trend will appear after assignments are graded.</p></div>;
  const width = 760;
  const height = 250;
  const padding = { top: 18, right: 22, bottom: 36, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = data.map((point, index) => ({
    ...point,
    x: padding.left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (Math.max(0, Math.min(point.grade, 100)) / 100) * chartHeight,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${points.at(-1).x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  return <div className="trend-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Performance trend chart">{[0, 25, 50, 75, 100].map((tick) => { const y = padding.top + chartHeight - (tick / 100) * chartHeight; return <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="trend-grid-line" /><text x={padding.left - 10} y={y + 4} textAnchor="end" className="trend-axis-label">{tick}%</text></g>; })}<path d={area} className="trend-area" /><path d={line} className="trend-line" />{points.map((point, index) => <g key={`${point.title}-${index}`}><circle cx={point.x} cy={point.y} r="5" className="trend-point" /><text x={point.x} y={height - 10} textAnchor="middle" className="trend-axis-label">{point.title?.split(" ")[0] || index + 1}</text></g>)}</svg></div>;
}

export default function AnalyticsDashboard({ token, user, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Analytics request failed with status ${response.status}`);
        const result = await response.json();
        setData(result);
        setSelectedCourse((current) => result.courses?.some((course) => course.courseName === current) ? current : result.courses?.[0]?.courseName ?? null);
      } catch {
        setData(null); setError("Analytics could not be loaded. Check your connection and try again.");
      } finally { setLoading(false); }
    };
    load();
  }, [refreshKey, retryKey, token]);

  if (loading) return <section className="dashboard-state content-card"><div className="dashboard-loader" /><h2>Preparing your dashboard</h2><p>Loading your latest academic progress.</p></section>;
  if (error) return <section className="dashboard-state content-card" role="alert"><h2>Unable to load analytics</h2><p>{error}</p><button className="primary-button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></section>;
  if (!data) return null;

  const completed = data.completedAssignments ?? 0;
  const total = data.totalAssignments ?? 0;
  const completion = total ? Math.round((completed / total) * 100) : 0;
  const pending = Math.max(0, total - completed);
  const activeCourses = data.totalCourses ?? data.courses?.length ?? 0;
  const selected = data.courses?.find((course) => course.courseName === selectedCourse);
  const selectedTrend = trendDataFor(selected);

  return (
    <section className="dashboard-shell">
      <header className="dashboard-welcome"><div><p className="eyebrow">Academic overview</p><h1>Welcome back, {user?.firstName}</h1><p>Your academic progress, all in one place.</p></div><span className="today-label">{new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span></header>

      <div className="dashboard-kpi-row" aria-label="Academic summary">
        <StatCard title="Cumulative GPA" value={(data.cumulativeGPA || 0).toFixed(1)} sub="Out of 4.0" color="#4f46e5" icon="G" />
        <StatCard title="Completion" value={`${completion}%`} sub={`${completed} of ${total} complete`} color="#059669" icon="✓" />
        <StatCard title="Pending" value={pending} sub="Assignments open" color="#ea580c" icon="!" />
        <StatCard title="Active Courses" value={activeCourses} sub="Currently tracked" color="#0284c7" icon="C" />
      </div>

      <section className="dashboard-section" aria-labelledby="courses-title">
        <div className="section-heading"><div><p className="eyebrow">How am I doing?</p><h2 id="courses-title">Your Courses</h2></div></div>
        {data.courses?.length ? <div className="course-card-grid">{data.courses.map((course) => { const risk = course.risk?.riskLevel || "NONE"; const progress = courseCompletion(course); return <button type="button" className={selectedCourse === course.courseName ? "course-summary-card selected" : "course-summary-card"} onClick={() => setSelectedCourse(course.courseName)} key={course.courseName}><div className="course-card-top"><span className="course-icon">{course.courseName.charAt(0)}</span><span className={`risk-pill ${riskClass(risk)}`}>{risk === "NONE" ? "ON TRACK" : `${risk} RISK`}</span></div><h3>{course.courseName}</h3><div className="course-grade"><strong>{courseGrade(course)}%</strong><span>{courseLetter(course)}</span></div><ProgressBar value={progress} /><small>{progress}% course progress</small></button>; })}</div> : <div className="empty-state content-card"><h3>No courses yet</h3><p>Add assignments with a course to start seeing course performance.</p><Link className="primary-button" to="/assignments/new">Add Assignment</Link></div>}
      </section>

      <div className="dashboard-two-column">
        <section className="content-card urgent-section" aria-labelledby="urgent-title"><div className="section-heading"><div><p className="eyebrow">What is due next?</p><h2 id="urgent-title">Upcoming &amp; Urgent</h2></div><Link to="/assignments">View All</Link></div>{data.upcomingPriority?.length ? <div className="urgent-list">{data.upcomingPriority.map((assignment, index) => { const priority = assignment.priority ?? assignment.priorityLabel ?? "LOW"; const completed = assignment.status === "completed" || priority === "DONE"; return <article className={completed ? "urgent-row urgent-row-completed" : "urgent-row"} key={assignment._id || `${assignment.title}-${index}`}><span className={completed ? "urgent-symbol urgent-symbol-completed" : "urgent-symbol"} aria-hidden="true">{completed ? "✓" : "!"}</span><div className="urgent-copy"><h3>{assignment.title}</h3><p>{assignment.course || "Uncategorized"} · {dueLabel(assignment)}</p></div><div className="urgent-meta"><span className="priority-pill" style={priorityColors[priority] || priorityColors.LOW}>{priority}</span>{assignment.weight != null && <small>{assignment.weight}% weight</small>}</div></article>; })}</div> : <div className="empty-state compact-empty"><h3>Nothing urgent</h3><p>Your priority assignments will appear here.</p></div>}</section>

        <section className="content-card quick-actions-card" aria-labelledby="actions-title"><div className="section-heading"><div><p className="eyebrow">What needs my attention?</p><h2 id="actions-title">Quick Actions</h2></div></div><div className="quick-action-list"><Link to="/assignments/new"><span>+</span><div><strong>Add Assignment</strong><small>Track a new deadline</small></div><b>→</b></Link><Link to="/assignments"><span>✓</span><div><strong>View Assignments</strong><small>Review your workload</small></div><b>→</b></Link><Link to="/chat"><span>◇</span><div><strong>Open Chat</strong><small>Connect with your course</small></div><b>→</b></Link></div></section>
      </div>

      <section className="content-card performance-section" aria-labelledby="performance-title"><div className="section-heading"><div><p className="eyebrow">Performance over time</p><h2 id="performance-title">{selected ? `${selected.courseName} Trend` : "Performance Trend"}</h2></div>{data.courses?.length > 1 && <label className="course-select">Course<select value={selectedCourse || ""} onChange={(event) => setSelectedCourse(event.target.value)}>{data.courses.map((course) => <option key={course.courseName}>{course.courseName}</option>)}</select></label>}</div>{selected?.trends?.summary && <p className="section-note">{selected.trends.summary}</p>}<TrendChart data={selectedTrend} /></section>
    </section>
  );
}
