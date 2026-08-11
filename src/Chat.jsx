import { useEffect, useState } from "react";
import { useSocket } from "./context/SocketContext";

export default function Chat() {
  const { socket, messages } = useSocket();
  const [message, setMessage] = useState("");
  const course = "CPAN212";

  useEffect(() => {
    if (socket) socket.emit("joinCourse", course);
  }, [socket]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim() || !socket) return;
    socket.emit("courseMessage", { course, message: message.trim() });
    setMessage("");
  };

  return (
    <div className="chat-card content-card">
      <div className="chat-heading"><div><span className="online-dot" /> Course room</div><span>{course}</span></div>
      <div className="chat-messages" aria-live="polite" aria-label="Course chat messages">
        {messages.length === 0 ? <div className="empty-state"><h2>No messages yet</h2><p>Start a conversation with your course community.</p></div> : messages.map((item, index) => <p className="chat-message" key={`${item}-${index}`}>{item}</p>)}
      </div>
      <form className="chat-compose" onSubmit={sendMessage}><label className="sr-only" htmlFor="chat-message">Course chat message</label><input id="chat-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type a message…" /><button className="primary-button" disabled={!socket}>Send</button></form>
    </div>
  );
}
