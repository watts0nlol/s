import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SocketProvider, useSocket } from "../context/SocketContext";

const navigation = [
  ["/dashboard", "⌂", "Dashboard"],
  ["/assignments", "✓", "Assignments"],
  ["/assignments/new", "+", "Add Assignment"],
  ["/chat", "◇", "Chat"],
  ["/announcements", "○", "Announcements"],
];

function LayoutContent() {
  const { user, logout } = useAuth();
  const { notification } = useSocket();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="brand-block">
          <span className="brand-mark">C</span>
          <div><strong>CourseFlow</strong><small>Your academic progress,<br />all in one place.</small></div>
        </div>
        <nav className="app-nav" aria-label="Primary navigation">
          {navigation.map(([to, icon, label]) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <span aria-hidden="true">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="user-avatar" aria-hidden="true">{user.firstName?.[0]}{user.lastName?.[0]}</div>
          <div><strong>{user.firstName} {user.lastName}</strong><small>{user.role}</small></div>
        </div>
        <button className="nav-link logout-button" type="button" onClick={handleLogout}><span aria-hidden="true">↪</span>Logout</button>
      </aside>

      <header className="mobile-header">
        <NavLink to="/dashboard" className="mobile-brand"><span className="brand-mark">C</span>CourseFlow</NavLink>
        <button type="button" className="menu-button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span className="sr-only">Toggle navigation</span>☰
        </button>
      </header>
      {menuOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main className="app-content" id="main-content">
        {notification && <div className="notification" role="status">{notification}</div>}
        <Outlet />
      </main>
    </div>
  );
}

export default function AuthenticatedLayout() {
  return <SocketProvider><LayoutContent /></SocketProvider>;
}
