import "@/App.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Show, SignIn, SignUp, useUser } from "@clerk/react";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { UploadQueueProvider } from "@/lib/uploadQueue";
import { useApi } from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import AppHeader from "@/components/AppHeader";
import OfflineBanner from "@/components/OfflineBanner";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import TripPage from "@/pages/TripPage";
import JoinPage from "@/pages/JoinPage";

function SyncProfile() {
  const { user } = useUser();
  const api = useApi();
  const done = useRef(null);
  useEffect(() => {
    if (!user || done.current === user.id) return;
    done.current = user.id;
    api.post("/me", {
      name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0],
      email: user.primaryEmailAddress?.emailAddress,
      avatar: user.imageUrl,
    }).catch(() => {});
  }, [user, api]);
  return null;
}

function Private({ children }) {
  return (
    <>
      <Show when="signed-in">
        <UploadQueueProvider>
          <SyncProfile />
          {children}
          <OfflineBanner />
        </UploadQueueProvider>
      </Show>
      <Show when="signed-out"><Navigate to="/sign-in" replace /></Show>
    </>
  );
}

const AuthWrap = ({ children }) => (
  <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">{children}</div>
);

function Home() {
  return (
    <>
      <Show when="signed-in"><Private><Dashboard /></Private></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <ClerkAuthProvider>
            <div className="min-h-screen bg-background text-foreground">
              <AppHeader />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/sign-in/*" element={<AuthWrap><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></AuthWrap>} />
                <Route path="/sign-up/*" element={<AuthWrap><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /></AuthWrap>} />
                <Route path="/join/:token" element={<JoinPage />} />
                <Route path="/trips/:tripId" element={<Private><TripPage /></Private>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Toaster position="top-center" />
          </ClerkAuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
