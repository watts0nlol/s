import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAssignments } from "../context/AssignmentsContext";

export default function AddAssignmentPage() {
  const { user } = useAuth();
  const { addAssignment } = useAssignments();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", dueDate: "", studentId: "", course: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const elevated = user.role === "teacher" || user.role === "admin";

  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { await addAssignment(form); navigate("/assignments", { state: { created: true } }); }
    catch (createError) { setError(createError.message); }
    finally { setSubmitting(false); }
  };

  return <section className="page-section narrow-page"><header className="page-header"><div><p className="eyebrow">New coursework</p><h1>Add Assignment</h1><p>Add a deadline to CourseFlow and keep your academic plan current.</p></div></header><form className="content-card stacked-form" onSubmit={submit}><label>Assignment title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>{elevated && <label>Student ID<input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required /></label>}<label>Course <span>(optional)</span><input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Link className="secondary-button" to="/assignments">Cancel</Link><button className="primary-button" disabled={submitting}>{submitting ? "Adding…" : "Add Assignment"}</button></div></form></section>;
}
