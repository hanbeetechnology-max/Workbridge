import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { trackPageView } from "./lib/analytics";
import { PageShell } from "./components/common/PageShell";
// LandingPage stays a static import — it's the `/` entry point, the one
// route that must render on the very first request with no extra
// lazy-chunk round trip. Every other route below is fair game to split.
import LandingPage from "./pages/LandingPage";
import CelebrationOverlay from "./components/common/CelebrationOverlay";
import SupportFab from "./components/common/SupportFab";
import ImpersonationBanner from "./components/common/ImpersonationBanner";
import SuspenseFallback from "./components/common/SuspenseFallback";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Code-split everything that isn't the landing page — none of these are
// needed for the first paint of `/`, so they shouldn't be in the initial
// JS payload.
const FindWorkPage = lazy(() => import("./pages/FindWorkPage"));
const PublicJobFeed = lazy(() => import("./pages/PublicJobFeed"));
const HireTalentPage = lazy(() => import("./pages/HireTalentPage"));
const EnterprisePage = lazy(() => import("./pages/EnterprisePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const RefundCancellationPage = lazy(() => import("./pages/RefundCancellationPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const BusinessVerification = lazy(() => import("./pages/BusinessVerification"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));

function RouteFallback() {
  return <SuspenseFallback label="Loading…" fullScreen />;
}

// Gates a route behind real authentication. `roles`, if given, additionally
// requires the signed-in user's role to be one of the listed values —
// someone logged in as a worker who navigates straight to /business is
// redirected to their own dashboard, not shown someone else's.
function ProtectedRoute({ roles, children }) {
  const { status, currentUser } = useAuth();

  if (status === "loading") return <RouteFallback />;
  if (status === "guest") return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const [userType, setUserType] = useState("worker");

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  // The real, persisted fact — set only by an admin approving verification
  // (POST /api/admin/verify/:id), so it's accurate across reloads/logins.
  // mockVerifiedThisSession exists only because there's no real endpoint a
  // business can call to set this on their own yet — it lets the existing
  // verification wizard demo flow keep working end-to-end in the current
  // tab, but deliberately does NOT persist: reload and you're back to
  // whatever currentUser.verified says. Business verification is free —
  // there was never a real payment gateway behind the old ₹470.82 step
  // (BusinessVerificationDrawer.jsx was a setTimeout with no backend call
  // at all), so it's been removed rather than left as a fake paywall.
  const [mockVerifiedThisSession, setMockVerifiedThisSession] = useState(false);
  const isBusinessVerified = Boolean(currentUser?.verified) || mockVerifiedThisSession;
  const [showVerifiedCelebration, setShowVerifiedCelebration] = useState(false);

  const handleSelect = (type) => {
    setUserType(type);
    navigate("/auth");
  };

  // Navigates by the REAL authenticated role (returned from AuthContext's
  // login/register), not just whichever tab was clicked before signing in —
  // guards against picking "Business" then logging into a worker account.
  const handleAuthSuccess = (user) => {
    const dashboardByRole = {
      worker: "/worker-dashboard",
      business: "/business-dashboard",
      admin: "/admin",
    };
    navigate(dashboardByRole[user.role] ?? "/");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleWizardComplete = () => {
    navigate("/business");
    setMockVerifiedThisSession(true);
    setShowVerifiedCelebration(true);
  };

  return (
    <>
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route
        path="/"
        element={
          <PageShell onSelect={handleSelect}>
            <LandingPage onSelect={handleSelect} />
          </PageShell>
        }
      />
      <Route
        path="/find-work"
        element={
          <PageShell onSelect={handleSelect}>
            <FindWorkPage onSelect={handleSelect} />
          </PageShell>
        }
      />
      <Route
        path="/jobs"
        element={
          <PageShell onSelect={handleSelect}>
            <PublicJobFeed onSelect={handleSelect} />
          </PageShell>
        }
      />
      <Route
        path="/hire-talent"
        element={
          <PageShell onSelect={handleSelect}>
            <HireTalentPage onSelect={handleSelect} />
          </PageShell>
        }
      />
      <Route
        path="/enterprise"
        element={
          <PageShell onSelect={handleSelect}>
            <EnterprisePage onSelect={handleSelect} />
          </PageShell>
        }
      />
      <Route
        path="/privacy"
        element={
          <PageShell onSelect={handleSelect}>
            <PrivacyPolicyPage />
          </PageShell>
        }
      />
      <Route
        path="/terms"
        element={
          <PageShell onSelect={handleSelect}>
            <TermsPage />
          </PageShell>
        }
      />
      <Route
        path="/refund-policy"
        element={
          <PageShell onSelect={handleSelect}>
            <RefundCancellationPage />
          </PageShell>
        }
      />
      <Route
        path="/pricing"
        element={
          <PageShell onSelect={handleSelect}>
            <PricingPage />
          </PageShell>
        }
      />
      <Route
        path="/contact"
        element={
          <PageShell onSelect={handleSelect}>
            <ContactPage />
          </PageShell>
        }
      />
      <Route
        path="/auth"
        element={
          <AuthPage
            userType={userType}
            onSuccess={handleAuthSuccess}
            onBack={() => navigate("/")}
          />
        }
      />
      <Route
        path="/worker"
        element={
          <ProtectedRoute roles={["worker"]}>
            <WorkerDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker-dashboard"
        element={
          <ProtectedRoute roles={["worker"]}>
            <WorkerDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker-dashboard/:tab"
        element={
          <ProtectedRoute roles={["worker"]}>
            <WorkerDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/:tab"
        element={
          <ProtectedRoute roles={["worker"]}>
            <WorkerDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business"
        element={
          <ProtectedRoute roles={["business"]}>
            <BusinessDashboard
              onLogout={handleLogout}
              onVerify={() => navigate("/verify")}
              isVerified={isBusinessVerified}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-dashboard"
        element={
          <ProtectedRoute roles={["business"]}>
            <BusinessDashboard
              onLogout={handleLogout}
              onVerify={() => navigate("/verify")}
              isVerified={isBusinessVerified}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verify"
        element={
          <ProtectedRoute roles={["business"]}>
            <BusinessVerification
              onComplete={handleWizardComplete}
              onExit={() => navigate("/business")}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminPanel onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route path="/invoice" element={<InvoicePage />} />
      <Route path="/profiles/:id" element={<PublicProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>

    {showVerifiedCelebration && (
      <CelebrationOverlay
        variant="verified"
        title="Your business is verified"
        message="Your company now carries the Verified badge across WorkBridge. Job posting is unlocked — Workers can trust every brief you publish."
        primaryLabel="Post your first job"
        onPrimary={() => setShowVerifiedCelebration(false)}
        onClose={() => setShowVerifiedCelebration(false)}
      />
    )}
    <ImpersonationBanner />
    <SupportFab />
    <Toaster position="top-right" richColors />
    </>
  );
}
