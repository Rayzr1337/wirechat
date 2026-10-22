import { Routes, Route, Navigate } from "react-router";
import PublicOnly from "./routes/PublicOnly";
import RequireAuth from "./routes/requireAuth";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import VerifyEmailPage from "./pages/Auth/VerifyEmailPage";
import Landing from "./pages/Landing";
import { RoomsLayout } from "./pages/RoomsLayout";
import RoomsPlaceholder from "./pages/Rooms";
import { RoomView } from "./pages/RoomView";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Toasts } from "./components/Toasts";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/" element={<Landing />} />

        <Route element={<RequireAuth />}>
          <Route path="/rooms" element={<RoomsLayout />}>
            <Route index element={<RoomsPlaceholder />} />
            <Route path=":roomId" element={<RoomView />} />
          </Route>
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </ErrorBoundary>
  );
}
