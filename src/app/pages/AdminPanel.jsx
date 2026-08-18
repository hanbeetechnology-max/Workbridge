import { Suspense, lazy, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart3, Shield, AlertTriangle, ShieldAlert, UserCog, Receipt, Banknote, Landmark, ShieldCheck, Send, LogOut, Image as ImageIcon, Users, Headphones, Sparkles } from "lucide-react";
import SuspenseFallback from "../components/common/SuspenseFallback";
import { useAuth } from "../context/AuthContext";
import brandLogo from "../assets/logo.png";

// Only the active tab's code ever needs to load — this panel previously
// pulled in all 12 tabs' code up front, which is most of why the AdminPanel
// chunk was 486KB. Each entry below is now its own chunk, fetched only when
// that tab is actually opened.
const AdminOverviewTab = lazy(() => import("../components/admin/AdminOverviewTab"));
const AdminUsersTab = lazy(() => import("../components/admin/AdminUsersTab"));
const AdminVerificationsTab = lazy(() => import("../components/admin/AdminVerificationsTab"));
const AdminInvitationsTab = lazy(() => import("../components/admin/AdminInvitationsTab"));
const AdminDisputesTab = lazy(() => import("../components/admin/AdminDisputesTab"));
const AdminFundReleasesTab = lazy(() => import("../components/admin/AdminFundReleasesTab"));
const AdminEscrowFundingTab = lazy(() => import("../components/admin/AdminEscrowFundingTab"));
const AdminAuditsTab = lazy(() => import("../components/admin/AdminAuditsTab"));
const AdminWithdrawalsTab = lazy(() => import("../components/admin/AdminWithdrawalsTab"));
const AdminSecurityTab = lazy(() => import("../components/admin/AdminSecurityTab"));
const AdminTeamTab = lazy(() => import("../components/admin/AdminTeamTab"));
const AdminTransactionsTab = lazy(() => import("../components/admin/AdminTransactionsTab"));
const AdminContentReviewTab = lazy(() => import("../components/admin/AdminContentReviewTab"));
const AdminSupportTab = lazy(() => import("../components/admin/AdminSupportTab"));
import { listVerifications, listDisputes, listPendingReleases, listPendingWithdrawals, listPendingEscrowFunding, listPendingAudits } from "../lib/adminApi";
import { listThreadsForAdmin } from "../lib/supportApi";
import { getInitials } from "../utils/formValidation";

const NAV = [
  { id: "overview", label: "Platform Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "verification", label: "Verification Center", icon: Shield, badgeKey: "verifications" },
  { id: "invitations", label: "Invitations", icon: Send },
  { id: "content", label: "Content Review", icon: ImageIcon },
  { id: "releases", label: "Fund Releases", icon: Banknote, badgeKey: "releases" },
  { id: "escrowFunding", label: "Escrow Funding", icon: ShieldCheck, badgeKey: "escrowFunding" },
  { id: "audits", label: "Profile Audits", icon: Sparkles, badgeKey: "audits" },
  { id: "withdrawals", label: "Withdrawals", icon: Landmark, badgeKey: "withdrawals" },
  { id: "disputes", label: "Dispute Resolution", icon: AlertTriangle, badgeKey: "disputes" },
  { id: "support", label: "Customer Care", icon: Headphones, badgeKey: "support" },
  { id: "transactions", label: "Transaction History", icon: Receipt },
  { id: "security", label: "Security Monitor", icon: ShieldAlert },
  { id: "team", label: "Team Access", icon: UserCog },
];

// Maps each nav id to the tab component that renders it — swap this map to
// add/remove tabs without touching the nav or layout markup below.
const TAB_COMPONENTS = {
  overview: AdminOverviewTab,
  users: AdminUsersTab,
  verification: AdminVerificationsTab,
  invitations: AdminInvitationsTab,
  content: AdminContentReviewTab,
  releases: AdminFundReleasesTab,
  escrowFunding: AdminEscrowFundingTab,
  audits: AdminAuditsTab,
  withdrawals: AdminWithdrawalsTab,
  disputes: AdminDisputesTab,
  support: AdminSupportTab,
  transactions: AdminTransactionsTab,
  security: AdminSecurityTab,
  team: AdminTeamTab,
};

export default function AdminPanel({ onLogout }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  // Real pending counts for the nav badges — fetched once here rather than
  // duplicated inside AdminVerificationsTab/AdminDisputesTab, which fetch
  // their own full lists independently for their actual content.
  const [badgeCounts, setBadgeCounts] = useState({ verifications: 0, disputes: 0, releases: 0, escrowFunding: 0, audits: 0, withdrawals: 0, support: 0 });

  useEffect(() => {
    Promise.all([
      listVerifications(),
      listDisputes(),
      listPendingReleases(),
      listPendingEscrowFunding(),
      listPendingAudits(),
      listPendingWithdrawals(),
      listThreadsForAdmin(),
    ])
      .then(([verifications, disputes, releases, escrowFunding, audits, withdrawals, threads]) => {
        setBadgeCounts({
          verifications: verifications.length,
          disputes: disputes.length,
          releases: releases.length,
          escrowFunding: escrowFunding.length,
          audits: audits.length,
          withdrawals: withdrawals.length,
          support: threads.filter((t) => t.status === "OPEN").length,
        });
      })
      .catch(() => {
        // Non-critical — badges just stay at 0 if this fails.
      });
  }, [activeTab]);

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#fff3ec] dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      {/* ── Ambient background (light, non-white — everything above it is glass) ── */}
      <div className="pointer-events-none fixed -top-40 -left-32 -z-10 h-96 w-96 rounded-full bg-[#1B3FAB]/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-32 -z-10 h-96 w-96 rounded-full bg-[#FF6B35]/10 blur-[120px]" />
      <div className="pointer-events-none fixed top-1/3 right-1/4 -z-10 h-72 w-72 rounded-full bg-purple-400/10 blur-[100px]" />

      {/* ── Sticky glass header ── */}
      <header className="relative z-20 flex-shrink-0 border-b border-white/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl">
        <div className="flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35]">
              <img src={brandLogo} alt="" className="h-5 w-5 object-contain" />
            </div>
            <span className="font-display font-semibold text-slate-900 dark:text-white">
              WorkBridge
            </span>
            <span className="rounded-full border border-white/60 dark:border-slate-700 bg-white/40 dark:bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Admin Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Super Administrator</p>
            </div>
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                {getInitials(currentUser?.name)}
              </div>
            )}
            <button
              onClick={onLogout}
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 dark:border-slate-700 bg-white/30 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-colors hover:bg-white/60 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Pill tab nav ── */}
        <div className="overflow-x-auto px-6 pb-3">
          <div className="flex w-fit gap-1 rounded-xl border border-white/50 dark:border-slate-700 bg-white/30 dark:bg-slate-800/40 p-1 backdrop-blur-md">
            {NAV.map(({ id, label, icon: Icon, badgeKey }) => {
              const active = activeTab === id;
              const count = badgeKey ? badgeCounts[badgeKey] : 0;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  title={count > 0 ? `${count} awaiting action` : undefined}
                  className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-white/70 dark:bg-slate-700/70 text-slate-900 dark:text-white shadow-sm backdrop-blur-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {count > 0 && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                        active ? "bg-[#FF6B35] text-white" : "bg-slate-200/70 dark:bg-slate-600/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Content (fills remaining viewport height — tabs that need h-full get a real ancestor height) ── */}
      <div className="wb-scroll-clean relative z-10 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            <Suspense fallback={<SuspenseFallback label="Loading…" fullScreen={false} />}>
              <ActiveTabComponent onNavigate={setActiveTab} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
