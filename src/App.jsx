import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AssignmentsProvider } from "./context/AssignmentsContext";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import AddAssignmentPage from "./pages/AddAssignmentPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <AssignmentsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/assignments" element={<AssignmentsPage />} />
                <Route path="/assignments/new" element={<AddAssignmentPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
      </AssignmentsProvider>
    </AuthProvider>
  );
}
