import { useEffect, useState } from "react";
import { API_BASE_URL } from "./config";

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/announcements`)
      .then((res) => res.json())
      .then((data) => setAnnouncements(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <section aria-labelledby="announcement-heading">
      <h2 id="announcement-heading">Announcement Board</h2>

      {announcements.length === 0 && <p>No announcements yet</p>}

      {announcements.map((a, index) => (
        <div key={index}>
          <h4>{a.course}</h4>
          <p>{a.message}</p>
        </div>
      ))}
    </section>
  );
}

export default Announcements;
