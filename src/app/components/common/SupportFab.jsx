import { useLocation, useNavigate } from "react-router-dom";
import { Headphones } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// A global, always-reachable floating help button ("MNC-style" corner
// bubble) — one click straight to the caller's real support thread
// (SupportChat.jsx, backed by support_threads/support_messages), not a
// decorative link. Hidden for admins (they ARE the support team, reached
// via AdminSupportTab instead), during the business verification wizard (a
// focused flow that shouldn't be interrupted mid-step), and on the public
// marketing pages — a still-logged-in user can land back on any of these
// (e.g. clicking the logo), and a "get help" bubble floating over the
// marketing site looks out of place next to its own CTAs.
const HIDDEN_PATH_PREFIXES = [
  "/verify",
  "/find-work",
  "/hire-talent",
  "/enterprise",
  "/privacy",
  "/terms",
  "/auth",
];

export default function SupportFab() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser || currentUser.role === "admin") return null;
  if (location.pathname === "/") return null;
  if (HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return null;

  // Support now lives inside Settings (its own tab), not as a top-level
  // dashboard tab — see SettingsPage.jsx's `settingsTab` router-state
  // convention.
  const goToSupport = () => {
    if (currentUser.role === "worker") {
      // Worker dashboard tabs are URL-driven (/worker/:tab) — a plain
      // navigate is enough, see WorkerDashboard.jsx.
      navigate("/worker/settings", { state: { settingsTab: "support" } });
    } else {
      // Business dashboard tabs are local component state, not URL-driven —
      // BusinessDashboard.jsx reads state.tab to jump to Settings, and
      // SettingsPage.jsx reads state.settingsTab to land on Support inside it.
      navigate("/business-dashboard", { state: { tab: "settings", settingsTab: "support" } });
    }
  };

  return (
    <button
      type="button"
      onClick={goToSupport}
      aria-label="Get help — go to Support"
      title="Get help"
      // bottom-24 (not bottom-6) — chat composers across this app (project
      // negotiations, and now Settings' own Support tab) sit flush against
      // the true bottom-right of their panel with no reserved clearance;
      // at bottom-6 this button sat directly on top of their Send button.
      // 96px clears the tallest composer bar (~92px) with a small margin.
      className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow-[0_10px_30px_-8px_rgba(255,107,53,0.55)] transition-transform duration-200 hover:scale-105 active:scale-95"
    >
      <Headphones className="h-6 w-6" />
    </button>
  );
}
