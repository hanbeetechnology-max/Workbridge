import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Building2, Coins, ShieldAlert, ShieldCheck } from "lucide-react";
import DashboardLayout from "../components/common/DashboardLayout";
import BusinessSidebar from "../components/business/BusinessSidebar";
import BusinessOverview from "../components/business/BusinessOverview";
import BusinessPostJob from "../components/business/BusinessPostJob";
import BusinessWorkers from "../components/business/BusinessWorkers";
import BusinessProjects from "../components/business/BusinessProjects";
import BusinessNegotiationHub from "../components/business/BusinessNegotiationHub";
import BusinessCompany from "../components/business/BusinessCompany";
import BusinessPerksShop from "../components/business/BusinessPerksShop";
import BusinessPayments from "../components/business/BusinessPayments";
import SettingsPage from "./SettingsPage";
import { useAuth } from "../context/AuthContext";
import { getTierData } from "../utils/gamification";
import { getInitials } from "../utils/formValidation";
import EconomyInfoTooltip from "../components/shared/EconomyInfoTooltip";
import NotificationBell from "../components/shared/NotificationBell";
import OnboardingWizard from "../components/common/OnboardingWizard";
import { shouldShowFrame, verifiedRingClass } from "../utils/verification";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// A real, local-time-of-day greeting — matches WorkerDashboard.jsx's own
// getGreeting exactly, kept as its own copy since these are two separate
// page components with no shared "dashboard chrome" module today.
// Text-only, no emoji, across every period.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good Morning" };
  if (hour >= 12 && hour < 17) return { text: "Good Afternoon" };
  if (hour >= 17 && hour < 21) return { text: "Good Evening" };
  return { text: "Good Night" };
}
// "Lobby vs. Workroom": the big warm greeting only belongs on the landing
// tab (Overview). Every other tab is a workroom the user already knows
// they're in — it gets a slim, contextual title instead.
const TAB_TITLES = {
  overview: "Overview",
  post: "Job",
  workers: "Find Workers",
  projects: "Projects",
  negotiations: "Chats",
  company: "Company Profile",
  perks: "Perks Shop",
  payments: "Billing & Payments",
  settings: "Account Settings",
};

const BUSINESS_TAB_IDS = new Set([
  "overview",
  "post",
  "workers",
  "projects",
  "negotiations",
  "company",
  "perks",
  "payments",
  "settings",
]);

export default function BusinessDashboard({ onLogout, onVerify, isVerified = false }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  // ?tab= lets a plain URL string (realtime/events.js's businessDashboardUrl
  // — what NotificationBell.jsx actually navigates to) land on the right
  // tab, same convention as EconomyHub.jsx/WorkerWallet.jsx. location.state
  // stays the mechanism for in-app navigate() calls that already have a
  // location object to attach state to (SupportFab.jsx, BusinessProjects.jsx's
  // "Open Chat").
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTabState] = useState(
    location.state?.tab ?? (BUSINESS_TAB_IDS.has(requestedTab) ? requestedTab : "overview")
  );
  // setTab now also writes the tab into the URL's own ?tab= query param
  // (replace:true so clicking through tabs doesn't spam the Back button) —
  // previously tab was pure React state, so a hard reload always reset back
  // to Overview no matter which tab you were actually on. Landing on the
  // bare /business-dashboard URL (no ?tab=) still correctly defaults to
  // Overview — this only preserves whatever tab is already reflected in
  // the address bar.
  const setTab = (id) => {
    setTabState(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === "overview") next.delete("tab");
        else next.set("tab", id);
        return next;
      },
      { replace: true }
    );
  };
  // Re-asserts the real document title on every tab change, overriding
  // whatever a child page (e.g. SettingsPage.jsx) set with its own
  // useDocumentTitle while it was mounted — that hook has no unmount
  // cleanup, so without this the browser tab kept showing "Settings —
  // WorkBridge" even after navigating back to Overview. React fires child
  // effects before parent effects on the same commit, so this always runs
  // after any child's title effect and wins.
  useDocumentTitle(`${TAB_TITLES[tab] ?? "Overview"} — WorkBridge`);
  // Tab state here is local, not URL-driven the same way WorkerDashboard's
  // route param is — a navigate("/business-dashboard", { state: { tab:
  // "support" } }) (see SupportFab.jsx) lands on the SAME route, so the
  // component doesn't remount and the useState initializer above only ever
  // runs once. This re-syncs on every subsequent navigation that carries a
  // tab in state or search params, routing through setTab (not setTabState)
  // so either arrival path also gets written into the URL for reload-safety.
  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (BUSINESS_TAB_IDS.has(requestedTab)) setTab(requestedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab]);
  // Set right before switching to the Negotiations tab (see
  // BusinessProjects.jsx's "Open Chat in Negotiations" button) so the right
  // thread is already focused when BusinessNegotiationHub mounts — Projects
  // no longer embeds its own chat, per the permanent-chat-history upgrade.
  const [negotiationFocusId, setNegotiationFocusId] = useState(null);
  const [negotiationThreadFocusId, setNegotiationThreadFocusId] = useState(null);
  // MASTER_ECONOMY_PLAN.md's business-side Ledger reuses the same
  // xp/current_level/bridge_tokens columns as the worker track (no
  // separate schema exists yet — see migrations/012_gamification_foundation.sql's
  // own comment) — "Corporate Credits"/"Corporate Tier" here are just the
  // business-facing label on top of the same real, currently-zero-until-
  // earned columns, not a fabricated number.
  const { tier: corporateTier } = getTierData(currentUser?.current_level ?? 1);
  const greeting = getGreeting();

  const handlePostJob = () => {
    if (!isVerified) {
      onVerify();
    } else {
      setTab("post");
    }
  };

  // BusinessPostJob now posts an OPEN job directly (no forced worker
  // selection) — land on Projects, where the new post shows up right away.
  const handleJobPosted = () => {
    setTab("projects");
  };

  return (
    <DashboardLayout
      sidebar={
        <BusinessSidebar
          tab={tab}
          onTabChange={setTab}
          onPostJob={handlePostJob}
          onVerify={onVerify}
          onLogout={onLogout}
          isVerified={isVerified}
        />
      }
    >
      <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-900">
        <div className={`flex-1 ${tab === "negotiations" ? "overflow-hidden" : "wb-scroll-clean overflow-y-auto overflow-x-hidden"}`}>
          {/* Negotiations keeps its own exclusive full-height layout (its
              own sticky internal header/list panes assume they own the
              whole flex-1 area) — no header rendered above it here. */}
          {tab === "negotiations" ? null : tab === "overview" ? (
            /* Warm Greeting — now the first thing INSIDE the scrollable area,
               not a pinned sibling above it, so it scrolls away with the
               rest of the page like the rest of the site instead of sitting
               fixed at the top forever. One row: identity on the left,
               every status indicator (escrow badge, bell, verified, credits/
               tier) on the right — no separate second row anymore. */
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 p-5 md:p-6">
              <div className="flex min-w-0 items-center gap-3">
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className={`h-12 w-12 flex-shrink-0 rounded-full object-cover shadow-lg ${verifiedRingClass(shouldShowFrame(isVerified, currentUser), "md", "glass")}`}
                  />
                ) : (
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold text-white shadow-lg ${verifiedRingClass(shouldShowFrame(isVerified, currentUser), "md", "glass")} ${
                      isVerified ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    {getInitials(currentUser?.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                    {greeting.text}, {currentUser?.name?.split(" ")[0] ?? "there"}!
                  </h1>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    Here's what's happening with your Projects today.
                  </p>
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {isVerified ? (
                  <span
                    title="Secured funds release only after you approve the work."
                    className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400 sm:inline-flex"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Funds Secured
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onVerify}
                    className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-[#FF6B35] transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 sm:inline-flex"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Verify to start hiring →
                  </button>
                )}

                <span className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-sm ${
                  isVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  {isVerified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  {isVerified ? "Verified" : "Unverified"}
                </span>

                {/* relative z-30 — backdrop-blur alone creates a stacking
                    context for this pill's own children (the tooltip
                    popover included), but without an explicit position this
                    whole box still paints in normal document flow. Any
                    later `position: relative` section further down the
                    page (e.g. BusinessOverview.jsx's own sections) then
                    wins the paint order regardless of DOM order, burying
                    the popover under it. Making this pill itself
                    positioned with a real z-index is what actually fixes
                    that, not raising the popover's own z-index further. */}
                <div className="relative z-30 hidden items-center gap-3 rounded-2xl border border-white/20 bg-[#0F172A]/90 px-4 py-2 shadow-sm backdrop-blur-md sm:flex">
                  <button
                    type="button"
                    onClick={() => setTab("perks")}
                    title="Go to the Perks Shop"
                    className="flex items-center gap-1.5 text-sm font-bold text-white transition-colors hover:text-amber-300"
                  >
                    <Coins className="h-4 w-4 text-amber-400" />
                    {currentUser?.bridge_tokens ?? 0}
                    <span className="hidden font-normal text-slate-300 md:inline">Credits</span>
                  </button>
                  <EconomyInfoTooltip title="How Corporate Credits work">
                    <p>Corporate Credits are your spendable balance — use them in the Perks Shop on hiring visibility boosts.</p>
                    <p className="mt-2">You earn <strong>+15 Credits</strong> automatically every time a project you posted completes with no dispute. Your Enterprise Tier below is separate — based on your total real spend, not Credits.</p>
                  </EconomyInfoTooltip>
                  <span className="h-4 w-px bg-white/20" />
                  <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <Building2 className="h-4 w-4 text-[#FF6B35]" />
                    {corporateTier}
                    <span className="hidden font-normal text-slate-300 md:inline">Tier</span>
                  </span>
                </div>

                {/* Notification Bell — always the last element on the far
                    right, never sandwiched between badges. */}
                <NotificationBell />
              </div>
            </div>
          ) : (
            /* Slim Contextual Header — same "scrolls away with the page"
               treatment as the greeting above, for the same reason. */
            <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800 md:px-8">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {TAB_TITLES[tab] ?? "Dashboard"}
              </h1>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className={`hidden items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-sm sm:inline-flex ${
                  isVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  {isVerified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  {isVerified ? "Verified" : "Unverified"}
                </span>
                <NotificationBell />
              </div>
            </div>
          )}

          {tab === "overview" && (
            <BusinessOverview
              onPostJob={handlePostJob}
              onViewProjects={() => setTab("projects")}
              isVerified={isVerified}
            />
          )}
          {tab === "post" && (
            <BusinessPostJob onVerify={onVerify} isVerified={isVerified} onJobPosted={handleJobPosted} />
          )}
          {tab === "workers" && (
            <BusinessWorkers
              onViewProjects={() => setTab("projects")}
              isVerified={isVerified}
              onVerify={onVerify}
              onMessageWorker={(threadId) => {
                setNegotiationThreadFocusId(threadId);
                setTab("negotiations");
              }}
            />
          )}
          {tab === "projects" && (
            <BusinessProjects
              onOpenChat={(projectId) => {
                setNegotiationFocusId(projectId);
                setTab("negotiations");
              }}
            />
          )}
          {tab === "negotiations" && (
            <BusinessNegotiationHub
              initialProjectId={negotiationFocusId}
              initialThreadId={negotiationThreadFocusId}
              onFindTalent={() => setTab("workers")}
              onViewContractTerms={() => setTab("projects")}
            />
          )}
          {tab === "company" && <BusinessCompany />}
          {tab === "perks" && <BusinessPerksShop />}
          {tab === "payments" && <BusinessPayments isVerified={isVerified} />}
          {tab === "settings" && <SettingsPage />}
        </div>
      </div>

      <OnboardingWizard />
    </DashboardLayout>
  );
}
