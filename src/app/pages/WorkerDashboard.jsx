import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Coins, Flame, Sparkles, TrendingUp } from "lucide-react";
import DashboardLayout from "../components/common/DashboardLayout";
import WorkerSidebar from "../components/worker/WorkerSidebar";
import WorkerJobFeed from "../components/worker/WorkerJobFeed";
import NegotiationInbox from "../components/worker/WorkerNegotiationInbox";
import WorkerWorkspace from "../components/worker/WorkerWorkspace";
import WorkerWallet from "../components/worker/WorkerWallet";
import EconomyHub from "./EconomyHub";
import WorkerProfile from "../components/worker/WorkerProfile";
import SettingsPage from "./SettingsPage";
import { useAuth } from "../context/AuthContext";
import { getWallet } from "../lib/walletApi";
import { getMyCandidateStats } from "../lib/candidatesApi";
import { getInitials } from "../utils/formValidation";
import { getSocket } from "../lib/socketClient";
import EconomyInfoTooltip from "../components/shared/EconomyInfoTooltip";
import NotificationBell from "../components/shared/NotificationBell";
import OnboardingWizard from "../components/common/OnboardingWizard";
import { shouldShowFrame, verifiedRingClass } from "../utils/verification";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// A real, local-time-of-day greeting — not a fixed "Welcome back" — so the
// new warm header actually reads as personalized rather than static copy.
// Text-only, no emoji, across every period.
function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return { text: "Good Morning" };
  if (hour >= 12 && hour < 17) return { text: "Good Afternoon" };
  if (hour >= 17 && hour < 21) return { text: "Good Evening" };
  return { text: "Good Night" };
}

// "Lobby vs. Workroom": the big warm greeting only belongs on the landing
// tab (Job Feed). Every other tab is a workroom the user already knows
// they're in — it gets a slim, contextual title instead so the greeting
// doesn't repeat itself (and eat vertical space) on every navigation.
const TAB_TITLES = {
  feed: "Job Feed",
  negotiations: "Chats",
  workspace: "Your Workspace",
  wallet: "Wallet",
  economy: "Economy Hub",
  profile: "My Profile",
  settings: "Account Settings",
};

export default function WorkerDashboard({ onLogout }) {
  const navigate = useNavigate();
  const { tab: urlTab } = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [hustleStats, setHustleStats] = useState(null);

  // Tab is driven entirely by the URL (/worker or /worker/:tab) so deep
  // links — like a "Job Invite" notification — can land directly on a tab.
  // "feed" (Job Feed) is the bare-/worker default, not "workspace" — a
  // worker's landing page should be where new jobs are, not their current
  // work, matching how BusinessDashboard's default is "overview" rather
  // than an active-projects list.
  const tab = urlTab ?? "feed";
  const setTab = (id) => navigate(id === "feed" ? "/worker" : `/worker/${id}`);
  const projectIdFromUrl = searchParams.get("invite");
  const greeting = getGreeting();
  // Same stale-title fix as BusinessDashboard.jsx — re-asserts the title on
  // every tab change so a child page's own useDocumentTitle (e.g.
  // SettingsPage.jsx, which has no unmount cleanup) never gets stuck
  // showing after navigating back to another tab.
  useDocumentTitle(`${TAB_TITLES[tab] ?? "Job Feed"} — WorkBridge`);

  useEffect(() => {
    getWallet()
      .then((wallet) => setWalletBalance(Number(wallet.balance)))
      .catch(() => {});
  }, []);

  // The Hustle Stats card — real job_candidates counts (source='APPLICATION'
  // only), not a fabricated "momentum" number.
  useEffect(() => {
    getMyCandidateStats()
      .then(setHustleStats)
      .catch(() => {});
  }, []);

  // A brand-new invite is the one event a worker's own `projects` state
  // can't already contain (they've never seen this project before), so it's
  // handled here — mounted on every worker page — rather than inside
  // WorkerWorkspace, which only reacts to projects it already loaded. The
  // real "you have a pending invite" indicator itself lives on
  // WorkerSidebar.jsx's own Negotiations nav item (its own independent
  // fetch) — this toast is just the live, in-the-moment alert; no header
  // bell/badge duplicates it.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (event.type !== "PROJECT_CREATED") return;
      toast.info(`${event.businessName ?? "A business"} invited you to "${event.title}".`);
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
  }, []);

  return (
    <DashboardLayout
      sidebar={<WorkerSidebar tab={tab} onTabChange={setTab} onLogout={onLogout} />}
    >
      <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-900">
        {tab === "feed" ? (
          /* Warm Greeting — the "Lobby". One row now, same compact scale as
             BusinessDashboard.jsx's greeting: smaller avatar, identity on
             the left, every status pill (payout note, momentum, streak/
             tokens HUD, balance, bell) folded into a single row on the
             right instead of a separate second row underneath. */
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 p-5 md:p-6">
            <div className="flex min-w-0 items-center gap-3">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className={`h-12 w-12 flex-shrink-0 rounded-full object-cover shadow-lg ${verifiedRingClass(shouldShowFrame(currentUser?.verified, currentUser), "md", "emerald")}`}
                />
              ) : (
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-base font-semibold text-white shadow-lg ${verifiedRingClass(shouldShowFrame(currentUser?.verified, currentUser), "md", "emerald")}`}>
                  {getInitials(currentUser?.name)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  {greeting.text}, {currentUser?.name?.split(" ")[0] ?? "there"}!
                </h1>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  Ready to crush some goals today? Here are your top matches.
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              <span
                title="Once a business approves your work, the payout lands straight in your wallet."
                className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 sm:inline-flex"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Payouts Automatic
              </span>

              {/* The Hustle Stats card — real job_candidates counts, not a
                  fabricated "momentum" number. */}
              {hustleStats && (
                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:flex">
                  <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-[#FF6B35]" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {hustleStats.thisWeek} this week
                    <span className="font-normal text-slate-400 dark:text-slate-500"> · {hustleStats.thisMonth} this month</span>
                  </p>
                </div>
              )}

              {/* relative z-30 — see BusinessDashboard.jsx's identical pill
                  for why: backdrop-blur alone doesn't stop a later
                  `position: relative` page section from painting over this
                  box (and its tooltip popover) regardless of DOM order. */}
              <div className="relative z-30 hidden items-center gap-3 rounded-2xl border border-white/20 bg-[#0F172A]/90 px-4 py-2 shadow-sm backdrop-blur-md sm:flex">
                <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Flame className="h-4 w-4 text-[#FF6B35]" />
                  {currentUser?.current_streak ?? 0}
                  <span className="hidden font-normal text-slate-300 md:inline">Day Streak</span>
                </span>
                <span className="h-4 w-px bg-white/20" />
                <button
                  type="button"
                  onClick={() => navigate("/worker/economy?tab=shop")}
                  title="Go to the Token Shop"
                  className="flex items-center gap-1.5 text-sm font-bold text-white transition-colors hover:text-amber-300"
                >
                  <Coins className="h-4 w-4 text-amber-400" />
                  {currentUser?.bridge_tokens ?? 0}
                  <span className="hidden font-normal text-slate-300 md:inline">Tokens</span>
                </button>
                <EconomyInfoTooltip title="How Tokens work">
                  <p>Bridge Tokens are your spendable balance — use them in the Token Shop on visibility perks.</p>
                  <p className="mt-2">You earn <strong>+25 Tokens</strong> automatically every time a project you complete gets approved and paid. Nothing else grants Tokens today.</p>
                </EconomyInfoTooltip>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">₹{walletBalance.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Available balance</p>
                </div>
              </div>

              <NotificationBell />
            </div>
          </div>
        ) : (
          /* Slim Contextual Header — the "Workroom": the user already knows
             they navigated here, so just name the page, no repeated greeting. */
          <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800 md:px-8">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {TAB_TITLES[tab] ?? "Dashboard"}
            </h1>
            <div className="flex flex-shrink-0 items-center gap-3">
              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">₹{walletBalance.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Available balance</p>
                </div>
              </div>
              <NotificationBell />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {tab === "feed" && <WorkerJobFeed />}
          {tab === "negotiations" && <NegotiationInbox initialProjectId={projectIdFromUrl} />}
          {tab === "workspace" && <WorkerWorkspace />}
          {tab === "wallet" && <WorkerWallet />}
          {tab === "economy" && <EconomyHub />}
          {tab === "profile" && <WorkerProfile />}
          {tab === "settings" && <SettingsPage />}
        </div>
      </div>

      <OnboardingWizard />
    </DashboardLayout>
  );
}
