import AnalyticsDashboard from "../AnalyticsDashboard";
import { useAuth } from "../context/AuthContext";
import { useAssignments } from "../context/AssignmentsContext";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { analyticsRefreshKey } = useAssignments();
  return <AnalyticsDashboard token={token} user={user} refreshKey={analyticsRefreshKey} />;
}
