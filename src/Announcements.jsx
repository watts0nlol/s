import { useEffect, useState } from "react";
import { API_BASE_URL } from "./config";
import { useAuth } from "./context/AuthContext";
import { useCourses } from "./context/CoursesContext";

export default function Announcements() {
  const { user, authHeaders, logout } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeCourse = courses.find((course) => course._id === selectedCourse) || courses[0] || null;
  const canPost = user.role === "teacher" || user.role === "admin";

  useEffect(() => {
    if (!activeCourse) return undefined;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/announcements/course/${activeCourse._id}`, { headers: authHeaders(), signal: controller.signal });
        if (response.status === 401) return logout();
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Announcements could not be loaded.");
        setAnnouncements(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [activeCourse, authHeaders, logout]);

  const createAnnouncement = async (event) => {
    event.preventDefault();
    if (!message.trim() || !activeCourse) return;
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcements/course/${activeCourse._id}`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Announcement could not be posted.");
      setAnnouncements((current) => [data, ...current]);
      setMessage("");
    } catch (requestError) { setError(requestError.message); }
  };

  if (coursesLoading) return <div className="content-card empty-state">Loading courses…</div>;
  if (!activeCourse) return <div className="content-card empty-state"><h2>No course announcements yet</h2><p>Join or create a course to access its announcements.</p></div>;

  return <div className="announcement-shell"><div className="chat-course-picker" role="tablist" aria-label="Course announcements">{courses.map((course) => <button key={course._id} type="button" role="tab" aria-selected={activeCourse._id === course._id} className={activeCourse._id === course._id ? "chat-course-tab active" : "chat-course-tab"} onClick={() => setSelectedCourse(course._id)}>{course.code}</button>)}</div><div className="announcement-heading content-card"><div><p className="eyebrow">Selected course</p><h2>{activeCourse.code} — {activeCourse.name}</h2></div>{canPost && <form className="announcement-compose" onSubmit={createAnnouncement}><label className="sr-only" htmlFor="announcement-message">Announcement message</label><input id="announcement-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a course announcement…" required /><button className="primary-button">Post</button></form>}</div>{error && <p className="form-error" role="alert">{error}</p>}<div className="announcement-list" aria-live="polite">{loading ? <div className="content-card empty-state">Loading announcements…</div> : announcements.length === 0 ? <div className="content-card empty-state"><h2>No announcements</h2><p>Course updates will appear here.</p></div> : announcements.map((announcement) => <article className="announcement-card content-card" key={announcement._id}><span className="announcement-course">{activeCourse.code}</span><p>{announcement.message}</p>{announcement.createdAt && <time dateTime={announcement.createdAt}>{new Date(announcement.createdAt).toLocaleDateString()}</time>}</article>)}</div></div>;
}
