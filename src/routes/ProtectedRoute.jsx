import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { token, user } = useAuth();
  const location = useLocation();
  return token && user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
