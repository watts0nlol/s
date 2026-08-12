import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAssignments } from "../context/AssignmentsContext";
import { useCourses } from "../context/CoursesContext";

export default function AddAssignmentPage() {
  const { user } = useAuth();
  const { addAssignment } = useAssignments();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", dueDate: "", studentId: "", course: "", courseId: "", weight: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const elevated = user.role === "teacher" || user.role === "admin";
  const linkedCourse = Boolean(form.courseId);

  const submit = async (event) => {
    event.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.weight === "") delete payload.weight;
      else payload.weight = Number(payload.weight);
      await addAssignment(payload);
      navigate("/assignments", { state: { created: true } });
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-section narrow-page">
      <header className="page-header"><div><p className="eyebrow">New coursework</p><h1>Add Assignment</h1><p>{elevated ? "Distribute coursework to every enrolled student in a course." : "Add a deadline to CourseFlow and keep your academic plan current."}</p></div></header>
      <form className="content-card stacked-form" onSubmit={submit}>
        <label>Assignment title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        {courses.length > 0 && (
          <label>{elevated ? "Distribute to course" : "CourseFlow course"} <span>(optional)</span>
            <select value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value, course: event.target.value ? "" : form.course, studentId: event.target.value ? "" : form.studentId })}>
              <option value="">Legacy or unlinked assignment</option>
              {courses.map((course) => <option key={course._id} value={course._id}>{course.code} — {course.name}</option>)}
            </select>
          </label>
        )}
        {elevated && !linkedCourse && <label>Student ID <span>(legacy/unlinked only)</span><input value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required /></label>}
        {!linkedCourse && <label>Legacy course name <span>(optional)</span><input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} placeholder="For an unlinked assignment" /></label>}
        {elevated && <label>Weight (%) <span>(optional)</span><input type="number" min="0" max="100" step="0.1" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} placeholder="0–100" /></label>}
        <label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><Link className="secondary-button" to="/assignments">Cancel</Link><button className="primary-button" disabled={submitting}>{submitting ? "Adding…" : elevated && linkedCourse ? "Distribute Assignment" : "Add Assignment"}</button></div>
      </form>
    </section>
  );
}
