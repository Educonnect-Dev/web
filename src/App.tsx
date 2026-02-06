import "./App.css";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import { AuthPage } from "./features/auth/auth-page";
import { EmailVerificationPage } from "./features/auth/email-verification-page";
import { FeedPage } from "./features/feed/feed-page";
import { TeacherDashboardLayout } from "./features/dashboard/teacher-dashboard-layout";
import { StudentDashboardPage } from "./features/dashboard/student-dashboard-page";
import { TeacherContentsPage } from "./features/dashboard/pages/teacher-contents-page";
import { TeacherDashboardOverview } from "./features/dashboard/pages/teacher-dashboard-overview";
import { TeacherProfilePage } from "./features/dashboard/pages/teacher-profile-page";
import { TeacherSessionsPage } from "./features/dashboard/pages/teacher-sessions-page";
import { TeacherSettingsPage } from "./features/dashboard/pages/teacher-settings-page";
import { TeacherSubscribersPage } from "./features/dashboard/pages/teacher-subscribers-page";
import { LandingPage } from "./features/landing/landing-page";
import { FreeContentsPage } from "./features/contents/free-contents-page";
import { ComingSoonPage } from "./features/coming-soon/coming-soon-page";
import { CompleteTeacherProfilePage } from "./features/profile/complete-teacher-profile-page";
import { CompleteStudentProfilePage } from "./features/profile/complete-student-profile-page";
import { PublicProfilePage } from "./features/profile/public-profile-page";
import { TeacherSearchPage } from "./features/search/teacher-search-page";
import { StudentCalendarPage } from "./features/sessions/student-calendar-page";
import { StudentSessionsPage } from "./features/sessions/student-sessions-page";
import { restoreSession } from "./services/auth-persistence";

function App() {
  const [isRestoring, setIsRestoring] = useState(true);
  useEffect(() => {
    let isMounted = true;
    if (typeof window === "undefined") {
      setIsRestoring(false);
      return;
    }
    const hasAuth = window.localStorage.getItem("educonnect_auth");
    if (!hasAuth) {
      setIsRestoring(false);
      return;
    }
    restoreSession()
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsRestoring(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isRestoring) {
    return (
      <div className="app-boot">
        <div className="app-boot__card">
          <div className="app-boot__spinner" />
          <p>Connexion en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/free-contents" element={<FreeContentsPage />} />
      <Route path="/paid-contents" element={<ComingSoonPage />} />
      <Route path="/login" element={<AuthPage initialMode="login" />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/admin/verification" element={<ComingSoonPage />} />
      <Route path="/onboarding/teacher-profile" element={<CompleteTeacherProfilePage />} />
      <Route path="/onboarding/student-profile" element={<CompleteStudentProfilePage />} />
      <Route path="/calendar" element={<StudentCalendarPage />} />
      <Route path="/dashboard/student/sessions" element={<StudentSessionsPage />} />
      <Route path="/messages" element={<ComingSoonPage />} />
      <Route path="/search/teachers" element={<TeacherSearchPage />} />
      <Route path="/public-profiles/:id" element={<PublicProfilePage />} />
      <Route path="/dashboard/student" element={<StudentDashboardPage />} />
      <Route path="/dashboard/student/progress" element={<ComingSoonPage />} />
      <Route path="/dashboard/teacher" element={<TeacherDashboardLayout />}>
        <Route index element={<TeacherDashboardOverview />} />
        <Route path="contents" element={<TeacherContentsPage />} />
        <Route path="subscribers" element={<TeacherSubscribersPage />} />
        <Route path="sessions" element={<TeacherSessionsPage />} />
        <Route path="sessions/subscribers" element={<ComingSoonPage />} />
        <Route path="revenue" element={<ComingSoonPage />} />
        <Route path="messages" element={<ComingSoonPage />} />
        <Route path="profile" element={<TeacherProfilePage />} />
        <Route path="settings" element={<TeacherSettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
