import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { token, user, refreshingUser } = useAuth();
  const location = useLocation();
  if (refreshingUser) return <main className="route-loading">Loading CourseFlow…</main>;
  return token && user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
