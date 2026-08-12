import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import ProgressBar from "./ProgressBar";
import StatCard from "./StatCard";

const dueText = (dueDate) => new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function TeacherDashboard({ token, user, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/teacher-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Teacher dashboard request failed with status ${response.status}`);
        setData(await response.json());
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setData(null);
          setError("Teacher dashboard data could not be loaded. Check your connection and try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [refreshKey, retryKey, token]);

  if (loading) return <section className="dashboard-state content-card"><div className="dashboard-loader" /><h2>Preparing your dashboard</h2><p>Loading your courses and assignment progress.</p></section>;
  if (error) return <section className="dashboard-state content-card" role="alert"><h2>Unable to load dashboard</h2><p>{error}</p><button className="primary-button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></section>;
  if (!data) return null;

  const summary = data.summary;
  return <section className="dashboard-shell teacher-dashboard">
    <header className="dashboard-welcome"><div><p className="eyebrow">Teaching overview</p><h1>Welcome back, {user?.firstName}</h1><p>Course activity and student assignment progress at a glance.</p></div><span className="today-label">{new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span></header>

    <div className="dashboard-kpi-row" aria-label="Teaching summary">
      <StatCard title="Courses Taught" value={summary.coursesTaught} sub="Courses you own" color="#4f46e5" icon="C" />
      <StatCard title="Students" value={summary.uniqueStudents} sub="Unique enrolled students" color="#0284c7" icon="S" />
      <StatCard title="Active Assignments" value={summary.activeAssignments} sub="Distinct distributions" color="#ea580c" icon="!" />
      <StatCard title="Overall Completion" value={`${summary.overallCompletionPercent}%`} sub={`${summary.completedCopies} of ${summary.distributedCopies} student copies`} color="#059669" icon="✓" />
    </div>

    <section className="dashboard-section" aria-labelledby="teacher-courses-title"><div className="section-heading"><div><p className="eyebrow">What am I teaching?</p><h2 id="teacher-courses-title">My Courses</h2></div><Link to="/courses">Manage Courses</Link></div>
      {data.courses.length ? <div className="course-card-grid teacher-course-grid">{data.courses.map((course) => <article className="course-summary-card" key={course.code}><div className="course-card-top"><span className="course-icon">{course.code.charAt(0)}</span><span className="teacher-course-students">{course.studentCount} {course.studentCount === 1 ? "student" : "students"}</span></div><h3>{course.code}</h3><p className="teacher-course-name">{course.name}</p><dl className="teacher-course-stats"><div><dt>Active assignments</dt><dd>{course.activeAssignmentCount}</dd></div><div><dt>Completion</dt><dd>{course.completionPercent == null ? "No assignments" : `${course.completionPercent}%`}</dd></div></dl>{course.completionPercent != null && <ProgressBar value={course.completionPercent} />}</article>)}</div> : <div className="empty-state content-card"><h3>No courses yet</h3><p>Create a course to start organizing students and assignments.</p><Link className="primary-button" to="/courses">Manage Courses</Link></div>}
    </section>

    <div className="dashboard-two-column teacher-dashboard-columns">
      <section className="content-card urgent-section" aria-labelledby="upcoming-title"><div className="section-heading"><div><p className="eyebrow">What is due next?</p><h2 id="upcoming-title">Upcoming Assignments</h2></div><Link to="/assignments">View All</Link></div>{data.upcomingAssignments.length ? <div className="teacher-assignment-list">{data.upcomingAssignments.map((assignment) => <article className="teacher-assignment-row" key={assignment.distributionId}><div><h3>{assignment.title}</h3><p>{assignment.course} · Due {dueText(assignment.dueDate)}{assignment.weight != null ? ` · Weight ${assignment.weight}%` : ""}</p></div><strong>{assignment.completedCount} of {assignment.assignedCount} completed</strong><small>{assignment.pendingCount} pending</small></article>)}</div> : <div className="empty-state compact-empty"><h3>No upcoming assignments</h3><p>Active course-wide assignments will appear here.</p></div>}</section>

      <section className="content-card urgent-section" aria-labelledby="attention-title"><div className="section-heading"><div><p className="eyebrow">What needs attention?</p><h2 id="attention-title">Needs Attention</h2></div></div>{data.needsAttention.length ? <div className="teacher-attention-list">{data.needsAttention.map((item) => <article className={`teacher-attention-row attention-${item.attentionType}`} key={item.distributionId}><span>{item.attentionType === "overdue" ? "!" : "○"}</span><div><h3>{item.title}</h3><p>{item.course} · {item.attentionType === "overdue" ? "Overdue" : `Due ${dueText(item.dueDate)}`} · {item.pendingCount} pending</p></div></article>)}</div> : <div className="empty-state compact-empty"><h3>Everything is on track</h3><p>No overdue or approaching assignments have pending students.</p></div>}</section>
    </div>

    <section className="content-card quick-actions-card teacher-quick-actions" aria-labelledby="teacher-actions-title"><div className="section-heading"><div><p className="eyebrow">Common tasks</p><h2 id="teacher-actions-title">Quick Actions</h2></div></div><div className="quick-action-list"><Link to="/assignments/new"><span>+</span><div><strong>Add Assignment</strong><small>Distribute work to a course</small></div><b>→</b></Link><Link to="/courses"><span>▤</span><div><strong>Manage Courses</strong><small>Review your courses and enrollment</small></div><b>→</b></Link><Link to="/announcements"><span>○</span><div><strong>Announcements</strong><small>Share a course update</small></div><b>→</b></Link><Link to="/chat"><span>◇</span><div><strong>Chat</strong><small>Connect with your courses</small></div><b>→</b></Link></div></section>
  </section>;
}
