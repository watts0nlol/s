import { useEffect, useMemo, useState } from "react";
import { useCourses } from "./context/CoursesContext";
import { useSocket } from "./context/SocketContext";
import { useAuth } from "./context/AuthContext";
import { API_BASE_URL } from "./config";

const mergeMessages = (current, incoming) => {
  const byId = new Map(current.filter((item) => item._id).map((item) => [item._id, item]));
  incoming.forEach((item) => {
    if (item._id) byId.set(item._id, item);
  });
  return [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export default function Chat() {
  const { socket } = useSocket();
  const { authHeaders, logout } = useAuth();
  const { courses, loading } = useCourses();
  const [message, setMessage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [messagesByCourse, setMessagesByCourse] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const sortedCourses = useMemo(() => [...courses].sort((a, b) => a.code.localeCompare(b.code)), [courses]);
  const activeCourse = sortedCourses.find((course) => course._id === selectedCourse) || sortedCourses[0] || null;
  const messages = messagesByCourse[activeCourse?._id] || [];

  useEffect(() => {
    if (!socket || !activeCourse) return undefined;

    const controller = new AbortController();
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/course-messages/${activeCourse._id}`, { headers: authHeaders(), signal: controller.signal });
        if (response.status === 401) return logout();
        const history = await response.json();
        if (!response.ok) throw new Error(history.error || "Chat history could not be loaded.");
        setMessagesByCourse((current) => ({
          ...current,
          [activeCourse._id]: mergeMessages(current[activeCourse._id] || [], history),
        }));
      } catch (error) {
        if (error.name !== "AbortError") console.error("Chat history could not be loaded:", error.message);
      } finally {
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    };

    const handleCourseMessage = (incomingMessage) => {
      if (incomingMessage.course !== activeCourse._id) return;
      setMessagesByCourse((current) => ({
        ...current,
        [activeCourse._id]: mergeMessages(current[activeCourse._id] || [], [incomingMessage]),
      }));
    };

    const joinSelectedCourse = () => socket.emit("joinCourse", activeCourse._id);
    void loadHistory();
    if (socket.connected) joinSelectedCourse();
    socket.on("connect", joinSelectedCourse);
    socket.on("courseMessage", handleCourseMessage);
    return () => {
      controller.abort();
      socket.off("connect", joinSelectedCourse);
      socket.off("courseMessage", handleCourseMessage);
      socket.emit("joinCourse", null);
    };
  }, [activeCourse, authHeaders, logout, socket]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim() || !socket || !activeCourse) return;
    socket.emit("courseMessage", { course: activeCourse._id, message: message.trim() });
    setMessage("");
  };

  if (loading) {
    return <div className="chat-card content-card"><div className="empty-state chat-empty"><h2>Loading course rooms…</h2></div></div>;
  }

  if (sortedCourses.length === 0) {
    return <div className="chat-card content-card"><div className="empty-state chat-empty"><h2>No course rooms yet</h2><p>Join or create a course to make its chat room available.</p></div></div>;
  }

  return (
    <div className="chat-card content-card">
      <div className="chat-course-picker" role="tablist" aria-label="Course chat rooms">
        {sortedCourses.map((course) => <button key={course._id} type="button" role="tab" aria-selected={activeCourse?._id === course._id} className={activeCourse?._id === course._id ? "chat-course-tab active" : "chat-course-tab"} onClick={() => { setSelectedCourse(course._id); setMessage(""); }}>{course.code}</button>)}
      </div>
      <div className="chat-heading"><div><span className="online-dot" /> Course room</div><strong>{activeCourse.code} — {activeCourse.name}</strong></div>
      <div className="chat-messages" aria-live="polite" aria-label={`${activeCourse.code} course chat messages`}>
        {historyLoading && messages.length === 0 ? <div className="empty-state"><p>Loading conversation…</p></div> : messages.length === 0 ? <div className="empty-state"><h2>No messages yet</h2><p>Start a conversation with your course community.</p></div> : messages.map((item) => <article className="chat-message" key={item._id}><header><strong>{item.sender ? `${item.sender.firstName} ${item.sender.lastName}` : "Course member"}</strong>{item.sender?.role && <span>{item.sender.role}</span>}</header><p>{item.message}</p></article>)}
      </div>
      <form className="chat-compose" onSubmit={sendMessage}><label className="sr-only" htmlFor="chat-message">Message {activeCourse.code}</label><input id="chat-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${activeCourse.code}…`} /><button className="primary-button" disabled={!socket}>Send</button></form>
    </div>
  );
}
