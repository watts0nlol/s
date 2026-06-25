import { useState, useEffect } from "react";
import "./App.css";
import Announcements from "./Announcements";
import Chat from "./Chat";
import { io } from "socket.io-client";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { API_BASE_URL } from "./config";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [authError, setAuthError] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [notification, setNotification] = useState("");

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socket.on("notification", (msg) => setNotification(msg));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (token && user) fetchAssignments();
  }, [token]);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      if (res.ok) setAssignments(await res.json());
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Authentication failed"); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch {
      setAuthError("Network error — is the server running?");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setAssignments([]);
  };

  const addAssignment = async (e) => {
    e.preventDefault();
    if (!title || !date) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title, dueDate: date, studentId, course }),
      });
      if (res.ok) {
        const created = await res.json();
        setAssignments((prev) => [...prev, created]);
        setTitle(""); setDate(""); setStudentId(""); setCourse("");
      }
    } catch (err) {
      console.error("Failed to create assignment:", err);
    }
  };

  const deleteAssignment = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) setAssignments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Failed to delete assignment:", err);
    }
  };

  const checkPriority = (dueDate) => {
    const diff = (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff <= 2) return "HIGH";
    if (diff <= 5) return "MEDIUM";
    return "LOW";
  };

  const getPriorityStyle = (priority) => {
    if (priority === "HIGH") return { color: "#e53935" };
    if (priority === "MEDIUM") return { color: "#fb8c00" };
    return { color: "#43a047" };
  };

  if (!token || !user) {
    return (
      <div className="container">
        <h1>Student Assignment Tracker</h1>
        <form className="form auth-form" onSubmit={handleAuth}>
          <h2>{authMode === "login" ? "Log In" : "Register"}</h2>
          {authMode === "register" && (
            <>
              <input
                placeholder="First Name"
                value={authForm.firstName}
                onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })}
                required
              />
              <input
                placeholder="Last Name"
                value={authForm.lastName}
                onChange={(e) => setAuthForm({ ...authForm, lastName: e.target.value })}
                required
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            required
          />
          {authError && <p className="auth-error">{authError}</p>}
          <button type="submit">{authMode === "login" ? "Log In" : "Register"}</button>
          <p className="auth-switch">
            {authMode === "login" ? "No account? " : "Have an account? "}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
            >
              {authMode === "login" ? "Register" : "Log In"}
            </button>
          </p>
        </form>
      </div>
    );
  }

  const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";

  return (
    <div className="container">
      <div className="app-header">
        <h1>Student Assignment Tracker</h1>
        <div className="user-info">
          <span>{user.firstName} {user.lastName} <em>({user.role})</em></span>
          <button className="logout-btn" onClick={logout}>Log Out</button>
        </div>
      </div>

      {notification && <div className="notification">🔔 {notification}</div>}

      <Announcements />
      <Chat />
      <AnalyticsDashboard token={token} />

      <form className="form" id="assignment-form" onSubmit={addAssignment}>
        <h2>Add Assignment</h2>
        <input
          type="text"
          placeholder="Assignment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        {isTeacherOrAdmin && (
          <input
            type="text"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />
        )}
        <input
          type="text"
          placeholder="Course (optional)"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <button type="submit">Add Assignment</button>
      </form>

      <div className="list" id="assignment-list">
        <h2>📋 Your Assignments</h2>
        {loading ? (
          <p>Loading...</p>
        ) : assignments.length === 0 ? (
          <p>No assignments yet.</p>
        ) : (
          assignments.map((a) => {
            const priority = checkPriority(a.dueDate);
            return (
              <div key={a._id} className="card">
                <h3>{a.title}</h3>
                {a.course && <p>Course: {a.course}</p>}
                <p>Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                <p>Status: {a.status}</p>
                <p style={getPriorityStyle(priority)}>
                  {priority === "HIGH" && "⚠️ High Priority"}
                  {priority === "MEDIUM" && "⚡ Medium Priority"}
                  {priority === "LOW" && "✅ Low Priority"}
                </p>
                {isTeacherOrAdmin && (
                  <button className="deleteBtn" onClick={() => deleteAssignment(a._id)}>
                    Delete
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;
