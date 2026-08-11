import { useEffect, useMemo, useState } from "react";
import { useCourses } from "./context/CoursesContext";
import { useSocket } from "./context/SocketContext";

export default function Chat() {
  const { socket } = useSocket();
  const { courses, loading } = useCourses();
  const [message, setMessage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [messagesByCourse, setMessagesByCourse] = useState({});
  const sortedCourses = useMemo(() => [...courses].sort((a, b) => a.code.localeCompare(b.code)), [courses]);
  const activeCourse = sortedCourses.find((course) => course._id === selectedCourse) || sortedCourses[0] || null;
  const messages = messagesByCourse[activeCourse?._id] || [];

  useEffect(() => {
    if (!socket) return undefined;

    const handleCourseMessage = (incomingMessage) => {
      if (!activeCourse) return;
      setMessagesByCourse((current) => ({
        ...current,
        [activeCourse._id]: [...(current[activeCourse._id] || []), incomingMessage],
      }));
    };

    socket.emit("joinCourse", activeCourse?._id || null);
    socket.on("courseMessage", handleCourseMessage);
    return () => {
      socket.off("courseMessage", handleCourseMessage);
      socket.emit("joinCourse", null);
    };
  }, [activeCourse, socket]);

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
        {messages.length === 0 ? <div className="empty-state"><h2>No messages yet</h2><p>Start a conversation with your course community.</p></div> : messages.map((item, index) => <p className="chat-message" key={`${item}-${index}`}>{item}</p>)}
      </div>
      <form className="chat-compose" onSubmit={sendMessage}><label className="sr-only" htmlFor="chat-message">Message {activeCourse.code}</label><input id="chat-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${activeCourse.code}…`} /><button className="primary-button" disabled={!socket}>Send</button></form>
    </div>
  );
}
