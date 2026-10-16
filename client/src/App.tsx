import { Routes, Route, Navigate } from "react-router";
import PublicOnly from "./routes/PublicOnly";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import VerifyEmailPage from "./pages/Auth/VerifyEmailPage";
import Landing from "./pages/Landing";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route path="/" element={<Landing />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
