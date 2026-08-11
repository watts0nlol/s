/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAuth } from "./AuthContext";

const AssignmentsContext = createContext(null);

export function AssignmentsProvider({ children }) {
  const { token, user, authHeaders, logout } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  const fetchAssignments = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/assignments`, { headers: authHeaders() });
      if (response.status === 401) return logout();
      if (!response.ok) throw new Error("Assignments could not be loaded.");
      setAssignments(await response.json());
    } catch (fetchError) {
      setError(fetchError.message || "Assignments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, logout, token, user]);

  useEffect(() => {
    if (token && user) fetchAssignments();
    else setAssignments([]);
  }, [fetchAssignments, token, user]);

  const addAssignment = useCallback(async (input) => {
    const response = await fetch(`${API_BASE_URL}/api/assignments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    if (response.status === 401) {
      logout();
      throw new Error("Your session has expired.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Assignment could not be created.");
    setAssignments((current) => [...current, data].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
    setAnalyticsRefreshKey((key) => key + 1);
    return data;
  }, [authHeaders, logout]);

  const deleteAssignment = useCallback(async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (response.status === 401) return logout();
    if (!response.ok) throw new Error("Assignment could not be deleted.");
    setAssignments((current) => current.filter((assignment) => assignment._id !== id));
    setAnalyticsRefreshKey((key) => key + 1);
  }, [authHeaders, logout]);

  const value = useMemo(() => ({ assignments, loading, error, fetchAssignments, addAssignment, deleteAssignment, analyticsRefreshKey }), [assignments, loading, error, fetchAssignments, addAssignment, deleteAssignment, analyticsRefreshKey]);
  return <AssignmentsContext.Provider value={value}>{children}</AssignmentsContext.Provider>;
}

export const useAssignments = () => useContext(AssignmentsContext);
