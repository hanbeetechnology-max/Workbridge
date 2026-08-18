import {
  BarChart3,
  Briefcase,
  Building2,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import brandLogo from "../../assets/logo.png";
import { getInitials } from "../../utils/formValidation";
import { shouldShowFrame, verifiedRingClass } from "../../utils/verification";

// Support moved into Settings (its own tab there) rather than sitting as a
// top-level item here — the global SupportFab is the fast path to it now.
const NAV = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "post", label: "Post a Job", icon: Plus },
  { id: "workers", label: "Find Workers", icon: Users },
  { id: "projects", label: "Active Projects", icon: Briefcase },
  { id: "negotiations", label: "Chats", icon: MessageSquare },
  { id: "company", label: "Company Profile", icon: Building2 },
  { id: "perks", label: "Perks Shop", icon: Store },
  { id: "payments", label: "Billing & Payments", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function BusinessSidebar({
  tab,
  onTabChange,
  onPostJob,
  onVerify,
  onLogout,
  isVerified,
}) {
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <aside
      className={`relative flex h-screen flex-shrink-0 flex-col bg-[#0F172A] transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-[260px]"
      }`}
    >
      <div
        onClick={() => setIsCollapsed((v) => !v)}
        title="Click to collapse/expand"
        className={`cursor-pointer select-none border-b border-white/5 py-5 ${isCollapsed ? "px-0" : "px-5"}`}
      >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center" : ""}`}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onTabChange("overview");
            }}
            title="Go to Overview"
            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#ffffff]"
          >
            <img src={brandLogo} alt="" className="h-6 w-6 object-contain" />
          </div>
          {!isCollapsed && (
            <span className="font-display truncate font-extrabold text-white">
              WorkBridge
            </span>
          )}
        </div>
      </div>

      <div className={`border-b border-white/5 py-5 ${isCollapsed ? "px-0" : "px-5"}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              className={`h-10 w-10 flex-shrink-0 rounded-lg object-cover ${shouldShowFrame(isVerified, currentUser) ? verifiedRingClass(true, "sm", "glass") : ""}`}
            />
          ) : (
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1B3FAB] text-sm font-bold text-white ${shouldShowFrame(isVerified, currentUser) ? verifiedRingClass(true, "sm", "glass") : ""}`}>
              {getInitials(currentUser?.name)}
            </div>
          )}
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{currentUser?.name || "—"}</div>
              <div className="truncate text-xs text-slate-400">Business Account</div>
            </div>
          )}
        </div>
        {!isCollapsed && currentUser?.verified && (
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
              Verified
            </span>
          </div>
        )}
      </div>

      <nav
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsCollapsed((v) => !v);
        }}
        title="Click empty space to collapse/expand"
        className={`flex-1 cursor-pointer space-y-1 py-4 ${isCollapsed ? "px-2" : "px-4"}`}
      >
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => (id === "post" ? onPostJob() : onTabChange(id))}
              title={isCollapsed ? label : undefined}
              className={`relative flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 ${
                isCollapsed ? "justify-center px-0" : "px-4"
              } ${active ? "text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {active && (
                <motion.span
                  layoutId="business-nav-active"
                  className="absolute inset-0 rounded-lg bg-[#1B3FAB] shadow-md shadow-[#1B3FAB]/30"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className="relative h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="relative">{label}</span>}
              {!isCollapsed && id === "post" && !isVerified && (
                <Lock className="relative ml-auto h-3 w-3 flex-shrink-0 text-slate-600" />
              )}
            </button>
          );
        })}
      </nav>

      <div className={`py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        {isVerified ? (
          <div
            title={isCollapsed ? "Business Verified" : undefined}
            className={`mb-2 flex w-full items-center gap-2 rounded-lg border border-[#10B981]/20 bg-[#10B981]/15 py-2.5 text-xs font-bold text-[#10B981] ${
              isCollapsed ? "justify-center px-0" : "px-4"
            }`}
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && "Business Verified"}
          </div>
        ) : (
          <button
            onClick={onVerify}
            title={isCollapsed ? "Get Business Verified" : undefined}
            className={`mb-2 flex w-full items-center gap-2 rounded-lg border border-[#FF6B35]/20 bg-[#FF6B35]/15 py-2.5 text-xs font-bold text-[#FF6B35] transition-colors hover:bg-[#FF6B35]/25 ${
              isCollapsed ? "justify-center px-0" : "px-4"
            }`}
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && "Get Business Verified"}
          </button>
        )}
        <button
          onClick={onLogout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white ${
            isCollapsed ? "justify-center px-0" : "px-4"
          }`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
