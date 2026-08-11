import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAssignments } from "../context/AssignmentsContext";

const priorityFor = (dueDate) => {
  const days = (new Date(dueDate) - new Date()) / 86400000;
  if (days <= 2) return "HIGH";
  if (days <= 5) return "MEDIUM";
  return "LOW";
};

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { assignments, loading, error, deleteAssignment, updateAssignmentStatus } = useAssignments();
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const canDelete = user.role === "teacher" || user.role === "admin";

  const remove = async (id) => {
    setActionError("");
    try { await deleteAssignment(id); } catch (deleteError) { setActionError(deleteError.message); }
  };

  const toggleCompletion = async (assignment) => {
    setActionError("");
    setUpdatingId(assignment._id);
    try {
      await updateAssignmentStatus(assignment._id, assignment.status === "completed" ? "assigned" : "completed");
    } catch (updateError) {
      setActionError(updateError.message);
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <section className="page-section">
      <header className="page-header"><div><p className="eyebrow">Plan your work</p><h1>Assignments</h1><p>Review deadlines, progress, and priorities across your courses.</p></div><Link className="primary-button" to="/assignments/new">Add Assignment</Link></header>
      {(error || actionError) && <p className="form-error" role="alert">{error || actionError}</p>}
      <div className="assignment-grid" aria-live="polite">
        {loading ? <div className="empty-state">Loading assignments…</div> : assignments.length === 0 ? <div className="empty-state"><h2>No assignments yet</h2><p>Add your first assignment to begin tracking your workload.</p></div> : assignments.map((assignment) => {
          const priority = priorityFor(assignment.dueDate);
          const isOwner = user.role === "student" && assignment.studentId === user._id;
          const completed = assignment.status === "completed";
          return <article className={completed ? "assignment-card assignment-completed" : "assignment-card"} key={assignment._id}><div className="card-heading"><span className={`status-pill priority-${priority.toLowerCase()}`}>{priority}</span>{assignment.status && <span className="status-text">{assignment.status}</span>}</div><h2>{assignment.title}</h2><p>{assignment.course || "Uncategorized"}</p><dl><div><dt>Due</dt><dd>{new Date(assignment.dueDate).toLocaleDateString()}</dd></div>{assignment.weight != null && <div><dt>Weight</dt><dd>{assignment.weight}%</dd></div>}</dl><div className="assignment-actions">{isOwner && <button className={completed ? "secondary-button" : "completion-button"} disabled={updatingId === assignment._id} type="button" onClick={() => toggleCompletion(assignment)}>{updatingId === assignment._id ? "Updating…" : completed ? "Mark Incomplete" : "Mark Complete"}</button>}{canDelete && <button className="danger-button" type="button" onClick={() => remove(assignment._id)}>Delete</button>}</div></article>;
        })}
      </div>
    </section>
  );
}
