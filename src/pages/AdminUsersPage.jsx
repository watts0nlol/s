import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function AdminUsersPage() {
  const { user: currentUser, authHeaders, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`, { headers: authHeaders(), signal: controller.signal });
        if (response.status === 401) return logout();
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || "Users could not be loaded.");
        setUsers(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadUsers();
    return () => controller.abort();
  }, [authHeaders, logout]);

  const changeRole = async (target, role) => {
    if (role === "student" && !window.confirm(`Demote ${target.firstName} ${target.lastName} to student?`)) return;
    setUpdatingId(target._id); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${target._id}/role`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Role could not be updated.");
      setUsers((current) => current.map((item) => item._id === target._id ? data.user : item));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <section className="page-section">
      <header className="page-header"><div><p className="eyebrow">Administration</p><h1>User Management</h1><p>Provision teacher access while keeping public registration student-only.</p></div></header>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-user-list content-card" aria-live="polite">
        {loading ? <div className="empty-state">Loading users…</div> : users.map((account) => (
          <article className="admin-user-row" key={account._id}>
            <div className="user-avatar" aria-hidden="true">{account.firstName?.[0]}{account.lastName?.[0]}</div>
            <div className="admin-user-identity"><strong>{account.firstName} {account.lastName}</strong><span>{account.email}</span></div>
            <span className={`admin-role role-${account.role}`}>{account.role}</span>
            <div className="admin-user-actions">
              {account.role === "student" && <button className="completion-button" disabled={updatingId === account._id} onClick={() => changeRole(account, "teacher")}>Promote to Teacher</button>}
              {account.role === "teacher" && <button className="secondary-button" disabled={updatingId === account._id} onClick={() => changeRole(account, "student")}>Demote to Student</button>}
              {(account.role === "admin" || account._id === currentUser._id) && <span>Protected account</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
