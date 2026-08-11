/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../config";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    const connection = io(API_BASE_URL, { auth: { token } });
    const handleNotification = (message) => setNotification(message);
    connection.on("notification", handleNotification);
    // The connection is an external resource created and destroyed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(connection);
    return () => {
      connection.off("notification", handleNotification);
      connection.disconnect();
    };
  }, [token]);

  const value = useMemo(() => ({ socket, notification }), [socket, notification]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
