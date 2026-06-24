import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "./config";

const socket = io(API_BASE_URL);

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [course] = useState("CPAN212");

  useEffect(() => {
    socket.emit("joinCourse", course);

    socket.on("courseMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off("courseMessage");
  }, [course]);

  const sendMessage = () => {
    if (!message) return;

    socket.emit("courseMessage", {
      course,
      message
    });

    setMessage("");
  };

  return (
    <div>
      <h2>Course Chat</h2>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type message"
      />

      <button onClick={sendMessage}>Send</button>

      <div>
        {messages.map((m, index) => (
          <p key={index}>{m}</p>
        ))}
      </div>
    </div>
  );
}

export default Chat;
