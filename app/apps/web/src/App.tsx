import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { LoginPage } from "./pages/Login";
import { HomePage } from "./pages/Home";
import { DocumentsPage } from "./pages/Documents";
import { ThreadPage } from "./pages/Thread";
import { DocumentFormPage } from "./pages/DocumentForm";
import { AnnouncementsPage } from "./pages/Announcements";
import { CalendarPage } from "./pages/Calendar";
import { MilestonesPage } from "./pages/Milestones";
import { StatusReportsPage } from "./pages/StatusReports";
import { MembersPage } from "./pages/Members";
import { MemberPage } from "./pages/Member";
import { SubteamPage } from "./pages/Subteam";
import { SearchPage } from "./pages/Search";
import { SettingsPage } from "./pages/Settings";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Signing you in…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/new" element={<DocumentFormPage />} />
        <Route path="documents/:id" element={<ThreadPage />} />
        <Route path="documents/:id/edit" element={<DocumentFormPage />} />
        <Route path="inactive" element={<DocumentsPage inactive />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="milestones" element={<MilestonesPage />} />
        <Route path="status" element={<StatusReportsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:id" element={<MemberPage />} />
        <Route path="subteams/:id" element={<SubteamPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
