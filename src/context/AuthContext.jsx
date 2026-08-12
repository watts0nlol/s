/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";

const AuthContext = createContext(null);

const readUser = () => {
  const saved = localStorage.getItem("user");
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(readUser);
  const [refreshingUser, setRefreshingUser] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setRefreshingUser(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setRefreshingUser(false);
      return null;
    }
    setRefreshingUser(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        logout();
        return null;
      }
      const data = await response.json();
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setRefreshingUser(false);
    }
  }, [logout, token]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const authenticate = useCallback(async (mode, form) => {
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Authentication failed");
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setRefreshingUser(false);
  }, []);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const value = useMemo(() => ({ token, user, refreshingUser, refreshUser, authenticate, authHeaders, logout }), [token, user, refreshingUser, refreshUser, authenticate, authHeaders, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
