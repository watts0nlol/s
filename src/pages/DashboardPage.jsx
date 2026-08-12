import AnalyticsDashboard from "../AnalyticsDashboard";
import TeacherDashboard from "../components/TeacherDashboard";
import { useAuth } from "../context/AuthContext";
import { useAssignments } from "../context/AssignmentsContext";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { analyticsRefreshKey } = useAssignments();
  if (user?.role === "teacher") return <TeacherDashboard token={token} user={user} refreshKey={analyticsRefreshKey} />;
  return <AnalyticsDashboard token={token} user={user} refreshKey={analyticsRefreshKey} />;
}
