import { useState, useEffect } from "react";
import "./App.css";
import Announcements from "./Announcements";
import Chat from "./Chat";
import { io } from "socket.io-client";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { API_BASE_URL } from "./config";


function App() {
  const [assignments, setAssignments] = useState(() => {
    const saved = localStorage.getItem("assignments");
    return saved ? JSON.parse(saved) : [];
  });
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [token] = useState(localStorage.getItem("token") || "");
  const [notification, setNotification] = useState("");

  useEffect(() => {
  const socket = io(API_BASE_URL);

  socket.on("notification", (msg) => {
    setNotification(msg);
  });

  return () => socket.disconnect();
}, []);

  // Save data
  useEffect(() => {
    localStorage.setItem("assignments", JSON.stringify(assignments));
  }, [assignments]);

  const addAssignment = () => {
    if (!title || !date) return;

    const newAssignment = { title, date };
    setAssignments([...assignments, newAssignment]);

    setTitle("");
    setDate("");
  };

  const deleteAssignment = (index) => {
    const updated = assignments.filter((_, i) => i !== index);
    setAssignments(updated);
  };

  const checkPriority = (date) => {
    const today = new Date();
    const due = new Date(date);
    const diff = (due - today) / (1000 * 60 * 60 * 24);

    if (diff <= 2) return "HIGH";
    if (diff <= 5) return "MEDIUM";
    return "LOW";
  };

  const getPriorityStyle = (priority) => {
    if (priority === "HIGH") return { color: "#e53935" };
    if (priority === "MEDIUM") return { color: "#fb8c00" };
    return { color: "#43a047" };
  };

  return (
    <div className="container">
      <h1>Student Assignment Tracker 2</h1>
      {notification && (
  <div className="notification">
    🔔 {notification}
  </div>
)}

      {/* Announcement Board */}
      <Announcements />
      <Chat />
      <AnalyticsDashboard token={token} />

      {/* Form */}
      <div className="form">
        <input
          type="text"
          placeholder="Assignment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button onClick={addAssignment}>Add Assignment</button>
      </div>

      {/* Assignment List */}
      <div className="list">
        <h2>📋 Your Assignments</h2>

        {assignments.length === 0 ? (
          <p>No assignments yet.</p>
        ) : (
          assignments.map((a, index) => {
            const priority = checkPriority(a.date);

            return (
              <div key={index} className="card">
                <h3>{a.title}</h3>
                <p>Due: {a.date}</p>

                <p style={getPriorityStyle(priority)}>
                  {priority === "HIGH" && "⚠️ High Priority"}
                  {priority === "MEDIUM" && "⚡ Medium Priority"}
                  {priority === "LOW" && "✅ Low Priority"}
                </p>

                <button
                  className="deleteBtn"
                  onClick={() => deleteAssignment(index)}
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;
