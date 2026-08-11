import { useEffect, useState } from "react";
import { API_BASE_URL } from "./config";

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/announcements`)
      .then((res) => res.json())
      .then((data) => setAnnouncements(data))
      .catch(() => setError("Announcements could not be loaded."));
  }, []);

  return (
    <div className="announcement-list" aria-live="polite">
      {error && <p className="form-error" role="alert">{error}</p>}
      {!error && announcements.length === 0 && <div className="empty-state"><h2>No announcements yet</h2></div>}

      {announcements.map((a, index) => (
        <article className="announcement-card content-card" key={index}>
          <span className="announcement-course">{a.course}</span>
          <p>{a.message}</p>
        </article>
      ))}
    </div>
  );
}

export default Announcements;
