import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCourses } from "../context/CoursesContext";

export default function CoursesPage() {
  const { user } = useAuth();
  const { courses, loading, error, createCourse, joinCourse } = useCourses();
  const [createForm, setCreateForm] = useState({ name: "", code: "", teacherId: "" });
  const [joinCode, setJoinCode] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canCreate = user.role === "teacher" || user.role === "admin";

  const create = async (event) => {
    event.preventDefault();
    setActionError(""); setSuccess(""); setSubmitting(true);
    try {
      const payload = { name: createForm.name, code: createForm.code };
      if (user.role === "admin" && createForm.teacherId) payload.teacherId = createForm.teacherId;
      const course = await createCourse(payload);
      setCreateForm({ name: "", code: "", teacherId: "" });
      setSuccess(`${course.code} was created.`);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const join = async (event) => {
    event.preventDefault();
    setActionError(""); setSuccess(""); setSubmitting(true);
    try {
      const course = await joinCourse(joinCode);
      setJoinCode("");
      setSuccess(`You joined ${course.code}.`);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const heading = user.role === "student" ? "Enrolled Courses" : user.role === "admin" ? "All Courses" : "Courses You Teach";

  return (
    <section className="page-section">
      <header className="page-header">
        <div>
          <p className="eyebrow">Course membership</p>
          <h1>Courses</h1>
          <p>{user.role === "student" ? "Join and access your enrolled courses." : "Create and manage the courses you teach."}</p>
        </div>
      </header>
      {(error || actionError) && <p className="form-error" role="alert">{actionError || error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}
      <div className="course-management-layout">
        <div>
          <h2 className="subsection-title">{heading}</h2>
          {loading ? (
            <div className="content-card empty-state">Loading courses…</div>
          ) : courses.length === 0 ? (
            <div className="content-card empty-state">
              <h3>No courses yet</h3>
              <p>{user.role === "student" ? "Use a join code to enroll in your first course." : "Create your first CourseFlow course."}</p>
            </div>
          ) : (
            <div className="managed-course-grid">
              {courses.map((course) => (
                <article className="managed-course-card content-card" key={course._id}>
                  <span className="course-icon">{course.code.charAt(0)}</span>
                  <div>
                    <p className="eyebrow">{course.code}</p>
                    <h2>{course.name}</h2>
                    <small>{course.enrollmentCount ?? course.studentIds?.length ?? 0} enrolled</small>
                    {course.joinCode && <p className="join-code">Join code <strong>{course.joinCode}</strong></p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <aside>
          {canCreate ? (
            <form className="content-card stacked-form" onSubmit={create}>
              <div><p className="eyebrow">Teacher tools</p><h2>Create Course</h2></div>
              <label>Course code<input value={createForm.code} onChange={(event) => setCreateForm({ ...createForm, code: event.target.value })} placeholder="CPAN 366" required /></label>
              <label>Course name<input value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Web Application Development" required /></label>
              {user.role === "admin" && <label>Teacher ID <span>(optional)</span><input value={createForm.teacherId} onChange={(event) => setCreateForm({ ...createForm, teacherId: event.target.value })} /></label>}
              <button className="primary-button" disabled={submitting}>Create Course</button>
            </form>
          ) : (
            <form className="content-card stacked-form" onSubmit={join}>
              <div><p className="eyebrow">Enrollment</p><h2>Join a Course</h2></div>
              <label>Join code<input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Enter code" maxLength="12" required /></label>
              <button className="primary-button" disabled={submitting}>Join Course</button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
