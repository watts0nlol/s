import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { token, user, authenticate } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (token && user) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authenticate(mode, form);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (authError) {
      setError(authError.message === "Failed to fetch" ? "Network error — is the server running?" : authError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand-block login-brand"><span className="brand-mark">C</span><strong>CourseFlow</strong></div>
        <h1>Your academic progress, all in one place.</h1>
        <p>Stay focused on your courses, deadlines, and academic momentum.</p>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">Welcome to CourseFlow</p>
        <h2 id="auth-title">{mode === "login" ? "Log in to your account" : "Create your account"}</h2>
        <form className="stacked-form" onSubmit={submit}>
          {mode === "register" && <div className="form-row"><label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label><label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label></div>}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? "Log In" : "Register"}</button>
        </form>
        <p className="auth-switch">{mode === "login" ? "New to CourseFlow? " : "Already have an account? "}<button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create account" : "Log in"}</button></p>
      </section>
    </main>
  );
}
