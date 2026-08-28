import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Ban, CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { listAllUsers, impersonateUser, moderateUser, updateAdminPermissions } from "../../lib/adminApi";
import { getInitials } from "../../utils/formValidation";
import { ApiError, getToken } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

function RoleBadge({ role }) {
  if (role === "business") {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">Business</span>;
  }
  if (role === "worker") {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">Worker</span>;
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Admin</span>;
}

// Support-tier triage — a paying user should be visually obvious in the
// directory at a glance, not something staff have to click into a profile
// to discover. An expired subscription (real subscription_expires_at in
// the past — same lapse rule payments.controller.js's getSubscriptionStatus
// applies) reads as Free here too, so a stale badge never overstates a
// lapsed plan as still active.
const PLAN_STYLES = {
  FREE: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  PRO: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  ELITE: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  GROWTH: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  ENTERPRISE: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
};

function PlanBadge({ tier, expiresAt }) {
  const isExpired = tier && tier !== "FREE" && (!expiresAt || new Date(expiresAt) <= new Date());
  const effectiveTier = isExpired ? "FREE" : tier || "FREE";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${PLAN_STYLES[effectiveTier] ?? PLAN_STYLES.FREE}`}>
      {effectiveTier === "FREE" ? "Free" : effectiveTier[0] + effectiveTier.slice(1).toLowerCase()}
      {isExpired && <span className="font-normal text-[10px] opacity-70">(lapsed)</span>}
    </span>
  );
}

function StatusPill({ ok, trueLabel, falseLabel }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {ok ? trueLabel : falseLabel}
    </span>
  );
}

// Minimal real Support-tier RBAC toggle — see migrations/034_admin_permissions.sql.
// Clicking flips that one flag for this admin account; only a full admin
// (one whose own flags are both still true) can actually succeed, enforced
// server-side in admin.controller.js's updateAdminPermissions.
function PermissionToggle({ label, enabled, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${enabled ? "Revoke" : "Grant"} ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
          : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("All");
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [impersonateError, setImpersonateError] = useState("");
  const [banningId, setBanningId] = useState(null);
  const [banError, setBanError] = useState("");
  const [permissionsUpdatingId, setPermissionsUpdatingId] = useState(null);
  const [permissionsError, setPermissionsError] = useState("");
  const { currentUser, startImpersonation } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    listAllUsers()
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load the user directory."))
      .finally(() => setLoading(false));
  }, []);

  // Real, audited "log in as this user" (see admin.controller.js's
  // impersonateUser) — captures the admin's OWN current token/user before
  // the swap, so "End Session" in ImpersonationBanner.jsx can restore it
  // with no re-login.
  const handleImpersonate = async (target) => {
    if (impersonatingId) return;
    setImpersonatingId(target.id);
    setImpersonateError("");
    try {
      const adminToken = getToken();
      const { token, user } = await impersonateUser(target.id);
      startImpersonation(token, user, adminToken, currentUser);
      navigate(target.role === "worker" ? "/worker" : "/business-dashboard");
    } catch (err) {
      setImpersonateError(err instanceof ApiError ? err.message : "Could not start impersonation.");
      setImpersonatingId(null);
    }
  };

  // Same real moderateUser action the old Message Monitor terminal used
  // (see AdminSecurityTab.jsx) — no projectId needed for ban/unban, so this
  // works standalone from the flat directory instead of requiring a drill-
  // down into a specific business → worker → project chat first.
  const handleBanToggle = async (target) => {
    const nowBanning = target.is_active !== false;
    const verb = nowBanning ? "Ban" : "Unban";
    if (!window.confirm(`${verb} ${target.name}?${nowBanning ? " They will be signed out immediately." : ""}`)) return;
    setBanningId(target.id);
    setBanError("");
    try {
      await moderateUser(target.id, nowBanning ? "ban" : "unban");
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, is_active: !nowBanning } : u)));
    } catch (err) {
      setBanError(err instanceof ApiError ? err.message : "Could not complete that action.");
    } finally {
      setBanningId(null);
    }
  };

  const handlePermissionToggle = async (target, key) => {
    const field = key === "ban" ? "can_ban_users" : "can_release_funds";
    const nextValue = target[field] === false;
    setPermissionsUpdatingId(target.id);
    setPermissionsError("");
    try {
      await updateAdminPermissions(target.id, key === "ban" ? { canBanUsers: nextValue } : { canReleaseFunds: nextValue });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, [field]: nextValue } : u)));
    } catch (err) {
      setPermissionsError(err instanceof ApiError ? err.message : "Could not update permissions.");
    } finally {
      setPermissionsUpdatingId(null);
    }
  };

  const filtered = users.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Workers") return item.role === "worker";
    if (filter === "Businesses") return item.role === "business";
    return item.role === "admin";
  });

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Users</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{users.length} account{users.length === 1 ? "" : "s"} on the platform</p>
        </div>
        <div className="flex gap-2">
          {["All", "Workers", "Businesses", "Admins"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white/50 backdrop-blur-sm border border-white/60 text-slate-600 hover:bg-white/70 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {impersonateError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{impersonateError}</span>
        </div>
      )}

      {banError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{banError}</span>
        </div>
      )}

      {permissionsError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{permissionsError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35]" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          No users match this filter.
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/70 overflow-hidden shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/40 border-b border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
                  {["Name", "Email", "Phone", "Role", "Plan", "Email Verified", "ID Verified", "Status", "Joined", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {getInitials(item.name)}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.email}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.phone ? `+91 ${item.phone}` : "—"}</td>
                    <td className="px-5 py-4"><RoleBadge role={item.role} /></td>
                    <td className="px-5 py-4">
                      {item.role === "admin" ? (
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <PlanBadge tier={item.subscription_tier} expiresAt={item.subscription_expires_at} />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill ok={item.email_verified} trueLabel="Verified" falseLabel="Pending" />
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill ok={item.verified} trueLabel="Verified" falseLabel="Pending" />
                    </td>
                    <td className="px-5 py-4">
                      {item.is_active === false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">BANNED</span>
                      ) : item.is_chat_banned === true ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">CHAT BANNED</span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.role === "admin" ? (
                        item.id !== currentUser?.id && (
                          <div className="flex items-center justify-end gap-1.5">
                            <PermissionToggle
                              label="Ban Rights"
                              enabled={item.can_ban_users !== false}
                              disabled={Boolean(permissionsUpdatingId)}
                              onClick={() => handlePermissionToggle(item, "ban")}
                            />
                            <PermissionToggle
                              label="Fund Release"
                              enabled={item.can_release_funds !== false}
                              disabled={Boolean(permissionsUpdatingId)}
                              onClick={() => handlePermissionToggle(item, "release")}
                            />
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleImpersonate(item)}
                            disabled={Boolean(impersonatingId)}
                            title={`Impersonate ${item.name} — logged and audited`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {impersonatingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            Impersonate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBanToggle(item)}
                            disabled={Boolean(banningId)}
                            title={item.is_active === false ? `Unban ${item.name}` : `Ban ${item.name}`}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                              item.is_active === false
                                ? "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                : "border-red-200 bg-white text-red-600 hover:bg-red-600 hover:text-white"
                            }`}
                          >
                            {banningId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : item.is_active === false ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                            {item.is_active === false ? "Unban" : "Ban"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
