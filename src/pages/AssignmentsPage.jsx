import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAssignments } from "../context/AssignmentsContext";
import { groupAssignmentsByDistribution } from "../utils/groupAssignments";

const priorityFor = (dueDate) => {
  const days = (new Date(dueDate) - new Date()) / 86400000;
  if (days <= 2) return "HIGH";
  if (days <= 5) return "MEDIUM";
  return "LOW";
};

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { assignments, loading, error, deleteAssignment, deleteAssignmentDistribution, updateAssignmentStatus } = useAssignments();
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [deletingDistributionId, setDeletingDistributionId] = useState("");
  const canDelete = user.role === "teacher" || user.role === "admin";
  const visibleAssignments = useMemo(
    () => canDelete ? groupAssignmentsByDistribution(assignments) : assignments,
    [assignments, canDelete],
  );

  const remove = async (id) => {
    setActionError("");
    try { await deleteAssignment(id); } catch (deleteError) { setActionError(deleteError.message); }
  };

  const removeDistribution = async (assignment) => {
    const confirmed = window.confirm(`Delete “${assignment.title}” for all ${assignment.assignedCount} assigned students? This cannot be undone.`);
    if (!confirmed) return;

    setActionError("");
    setDeletingDistributionId(assignment.distributionId);
    try {
      await deleteAssignmentDistribution(assignment.distributionId);
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setDeletingDistributionId("");
    }
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
        {loading ? <div className="empty-state">Loading assignments…</div> : visibleAssignments.length === 0 ? <div className="empty-state"><h2>No assignments yet</h2><p>Add your first assignment to begin tracking your workload.</p></div> : visibleAssignments.map((assignment) => {
          const priority = priorityFor(assignment.dueDate);
          const isOwner = user.role === "student" && assignment.studentId === user._id;
          const completed = assignment.status === "completed";
          return <article className={!assignment.isDistributionGroup && completed ? "assignment-card assignment-completed" : "assignment-card"} key={assignment.distributionId || assignment._id}><div className="card-heading"><span className={`status-pill priority-${priority.toLowerCase()}`}>{priority}</span>{!assignment.isDistributionGroup && assignment.status && <span className="status-text">{assignment.status}</span>}</div><h2>{assignment.title}</h2><p>{assignment.course || "Uncategorized"}</p><dl><div><dt>Due</dt><dd>{new Date(assignment.dueDate).toLocaleDateString()}</dd></div>{assignment.weight != null && <div><dt>Weight</dt><dd>{assignment.weight}%</dd></div>}{assignment.isDistributionGroup && <div><dt>Assigned</dt><dd>{assignment.assignedCount} {assignment.assignedCount === 1 ? "student" : "students"}</dd></div>}</dl>{assignment.isDistributionGroup && <p className="distribution-progress"><strong>{assignment.completedCount} completed</strong><span aria-hidden="true"> · </span><strong>{assignment.pendingCount} pending</strong></p>}<div className="assignment-actions">{isOwner && <button className={completed ? "secondary-button" : "completion-button"} disabled={updatingId === assignment._id} type="button" onClick={() => toggleCompletion(assignment)}>{updatingId === assignment._id ? "Updating…" : completed ? "Mark Incomplete" : "Mark Complete"}</button>}{canDelete && (assignment.isDistributionGroup ? <button className="danger-button" disabled={deletingDistributionId === assignment.distributionId} type="button" onClick={() => removeDistribution(assignment)}>{deletingDistributionId === assignment.distributionId ? "Deleting…" : "Delete"}</button> : <button className="danger-button" type="button" onClick={() => remove(assignment._id)}>Delete</button>)}</div></article>;
        })}
      </div>
    </section>
  );
}
