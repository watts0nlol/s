/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAuth } from "./AuthContext";

const CoursesContext = createContext(null);

export function CoursesProvider({ children }) {
  const { token, user, authHeaders, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: authHeaders() });
    if (response.status === 401) {
      logout();
      throw new Error("Your session has expired.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Course request failed.");
    return data;
  }, [authHeaders, logout]);

  const fetchCourses = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true); setError("");
    try { setCourses(await request("/api/courses")); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [request, token, user]);

  useEffect(() => {
    if (token && user) fetchCourses();
    else setCourses([]);
  }, [fetchCourses, token, user]);

  const createCourse = useCallback(async (input) => {
    const course = await request("/api/courses", { method: "POST", body: JSON.stringify(input) });
    setCourses((current) => [...current, course].sort((a, b) => a.code.localeCompare(b.code)));
    return course;
  }, [request]);

  const joinCourse = useCallback(async (joinCode) => {
    const course = await request("/api/courses/join", { method: "POST", body: JSON.stringify({ joinCode }) });
    setCourses((current) => current.some((item) => item._id === course._id) ? current : [...current, course].sort((a, b) => a.code.localeCompare(b.code)));
    return course;
  }, [request]);

  const value = useMemo(() => ({ courses, loading, error, fetchCourses, createCourse, joinCourse }), [courses, loading, error, fetchCourses, createCourse, joinCourse]);
  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>;
}

export const useCourses = () => useContext(CoursesContext);
