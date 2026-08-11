import { useEffect, useMemo, useState } from "react";
import { useAssignments } from "./context/AssignmentsContext";
import { useSocket } from "./context/SocketContext";

export default function Chat() {
  const { socket } = useSocket();
  const { assignments, loading } = useAssignments();
  const [message, setMessage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [messagesByCourse, setMessagesByCourse] = useState({});
  const courses = useMemo(() => [...new Set(assignments.map((assignment) => assignment.course?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [assignments]);
  const activeCourse = courses.includes(selectedCourse) ? selectedCourse : courses[0] || "";
  const messages = messagesByCourse[activeCourse] || [];

  useEffect(() => {
    if (!socket) return undefined;

    const handleCourseMessage = (incomingMessage) => {
      if (!activeCourse) return;
      setMessagesByCourse((current) => ({
        ...current,
        [activeCourse]: [...(current[activeCourse] || []), incomingMessage],
      }));
    };

    socket.emit("joinCourse", activeCourse || null);
    socket.on("courseMessage", handleCourseMessage);
    return () => {
      socket.off("courseMessage", handleCourseMessage);
      socket.emit("joinCourse", null);
    };
  }, [activeCourse, socket]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim() || !socket || !activeCourse) return;
    socket.emit("courseMessage", { course: activeCourse, message: message.trim() });
    setMessage("");
  };

  if (loading) {
    return <div className="chat-card content-card"><div className="empty-state chat-empty"><h2>Loading course rooms…</h2></div></div>;
  }

  if (courses.length === 0) {
    return <div className="chat-card content-card"><div className="empty-state chat-empty"><h2>No course rooms yet</h2><p>Add an assignment with a course name to make its chat room available.</p></div></div>;
  }

  return (
    <div className="chat-card content-card">
      <div className="chat-course-picker" role="tablist" aria-label="Course chat rooms">
        {courses.map((course) => <button key={course} type="button" role="tab" aria-selected={activeCourse === course} className={activeCourse === course ? "chat-course-tab active" : "chat-course-tab"} onClick={() => { setSelectedCourse(course); setMessage(""); }}>{course}</button>)}
      </div>
      <div className="chat-heading"><div><span className="online-dot" /> Course room</div><strong>{activeCourse}</strong></div>
      <div className="chat-messages" aria-live="polite" aria-label={`${activeCourse} course chat messages`}>
        {messages.length === 0 ? <div className="empty-state"><h2>No messages yet</h2><p>Start a conversation with your course community.</p></div> : messages.map((item, index) => <p className="chat-message" key={`${item}-${index}`}>{item}</p>)}
      </div>
      <form className="chat-compose" onSubmit={sendMessage}><label className="sr-only" htmlFor="chat-message">Message {activeCourse}</label><input id="chat-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${activeCourse}…`} /><button className="primary-button" disabled={!socket}>Send</button></form>
    </div>
  );
}
