import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFoundPage() {
  const { token, user } = useAuth();
  return <main className="not-found"><span className="brand-mark">C</span><p className="eyebrow">404</p><h1>Page not found</h1><p>The page you requested is not part of CourseFlow.</p><Link className="primary-button" to={token && user ? "/dashboard" : "/login"}>Return to {token && user ? "Dashboard" : "Login"}</Link></main>;
}
