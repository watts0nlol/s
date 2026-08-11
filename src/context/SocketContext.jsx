/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../config";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket] = useState(() => io(API_BASE_URL));
  const [notification, setNotification] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const handleNotification = (message) => setNotification(message);
    const handleCourseMessage = (message) => setMessages((current) => [...current, message]);
    socket.on("notification", handleNotification);
    socket.on("courseMessage", handleCourseMessage);
    return () => {
      socket.off("notification", handleNotification);
      socket.off("courseMessage", handleCourseMessage);
      socket.disconnect();
    };
  }, [socket]);

  const value = useMemo(() => ({ socket, notification, messages }), [socket, notification, messages]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
