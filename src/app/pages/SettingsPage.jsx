import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  Headphones,
  Loader2,
  Lock,
  PowerOff,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { updateOwnProfile } from "../lib/profilesApi";
import { changePassword, deactivateAccount } from "../lib/authApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getInitials } from "../utils/formValidation";
import { ApiError } from "../lib/apiClient";
import { getPushStatus, subscribeToPush, unsubscribeFromPush } from "../lib/pushNotifications";
import { updateNotificationPrefs } from "../lib/authApi";
import SupportChat from "../components/shared/SupportChat";
import ThemeToggle from "../components/shared/ThemeToggle";
import AvatarCropModal from "../components/shared/AvatarCropModal";

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;

const TABS = [
  { id: "general", label: "General Profile", icon: User },
  { id: "security", label: "Security & Auth", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "support", label: "Support", icon: Headphones },
  { id: "danger", label: "Deactivate Account", icon: PowerOff },
];

function SectionCard({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      {children}
    </div>
  );
}

function GeneralProfileTab() {
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarCropFile, setAvatarCropFile] = useState(null);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const updated = await updateOwnProfile({ name: name.trim(), phone: phone.trim() || undefined });
      updateCurrentUser(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image is too large — please choose one under 1.5MB.");
      return;
    }

    setAvatarCropFile(file);
  };

  const handleCropConfirm = async (dataUrl) => {
    setAvatarUploading(true);
    try {
      const updated = await updateOwnProfile({ avatarUrl: dataUrl });
      updateCurrentUser(updated);
      setAvatarCropFile(null);
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Could not upload photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Business has no dedicated profile URL — "Company" is an internal tab of
  // BusinessDashboard (see its BUSINESS_TAB_IDS/location.state.tab
  // convention, same one SupportFab.jsx uses), not a route of its own. A
  // plain navigate("/business/company") 404s into the marketing landing
  // page since that path was never registered in App.jsx.
  const goToFullProfile = () => {
    if (currentUser?.role === "business") {
      navigate("/business-dashboard", { state: { tab: "company" } });
    } else {
      navigate("/worker/profile");
    }
  };

  return (
    <div className="space-y-6">
    <SectionCard>
      <div>
        <p className="text-sm font-bold text-[#0A1128] dark:text-white">Appearance</p>
        <p className="mt-1 text-xs text-slate-400">Choose how WorkBridge looks on this device.</p>
      </div>
      <div className="mt-4">
        <ThemeToggle />
      </div>
    </SectionCard>
    <SectionCard>
      <div className="mb-6 flex items-center gap-4">
        <label className="relative flex-shrink-0 cursor-pointer">
          {currentUser?.avatar_url ? (
            <img src={currentUser.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1B3FAB] text-lg font-bold text-white">
              {getInitials(currentUser?.name)}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> : <Camera className="h-3 w-3 text-slate-500" />}
          </span>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={avatarUploading} />
        </label>
        <div>
          <p className="text-sm font-bold text-[#0A1128] dark:text-white">Profile photo</p>
          <p className="text-xs text-slate-400">JPG or PNG, under 1.5MB.</p>
          {avatarError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{avatarError}</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit number"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Saved.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={goToFullProfile}
            className="text-xs font-bold text-[#1B3FAB] hover:underline dark:text-blue-400"
          >
            Edit bio, skills &amp; more on your full profile →
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#0A1128] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1a2547] disabled:opacity-60 dark:bg-white dark:text-[#0A1128] dark:hover:bg-slate-200"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </button>
        </div>
      </form>
    </SectionCard>

    {avatarCropFile && (
      <AvatarCropModal
        file={avatarCropFile}
        saving={avatarUploading}
        onCancel={() => setAvatarCropFile(null)}
        onConfirm={handleCropConfirm}
      />
    )}
    </div>
  );
}

function SecurityTab() {
  const { currentUser } = useAuth();
  const hasUsablePassword = currentUser?.has_usable_password !== false;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword({ currentPassword: hasUsablePassword ? currentPassword : undefined, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 ${currentUser?.email_verified ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Email {currentUser?.email_verified ? "verified" : "not verified"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <p className="mb-1 text-sm font-bold text-[#0A1128] dark:text-white">
          {hasUsablePassword ? "Change Password" : "Set a Password"}
        </p>
        {!hasUsablePassword && (
          <p className="mb-4 text-xs text-slate-400">
            You signed up with Google, so there's no password to enter yet — set one below to also be able to log in
            with email + password.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasUsablePassword && (
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          )}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Password updated.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (hasUsablePassword && !currentPassword) || !newPassword}
            className="rounded-xl bg-[#0A1128] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1a2547] disabled:opacity-60 dark:bg-white dark:text-[#0A1128] dark:hover:bg-slate-200"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : hasUsablePassword ? "Update password" : "Set password"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}

// "unsupported" (no Push API — Safari <16.4, most in-app browsers),
// "not-configured" (backend has no VAPID keys set), "denied" (blocked at
// the browser level — only fixable from the browser's own site settings),
// "subscribed", "unsubscribed", or "checking" while getPushStatus resolves.
const PUSH_STATUS_COPY = {
  checking: { label: "Checking…", dot: "bg-slate-300", tone: "text-slate-400 bg-slate-50 border-slate-200 dark:text-slate-500 dark:bg-slate-800 dark:border-slate-700" },
  unsupported: { label: "Not supported on this browser", dot: "bg-slate-300", tone: "text-slate-400 bg-slate-50 border-slate-200 dark:text-slate-500 dark:bg-slate-800 dark:border-slate-700" },
  "not-configured": { label: "Not available yet", dot: "bg-slate-300", tone: "text-slate-400 bg-slate-50 border-slate-200 dark:text-slate-500 dark:bg-slate-800 dark:border-slate-700" },
  denied: { label: "Blocked in browser settings", dot: "bg-red-500", tone: "text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/40" },
  subscribed: { label: "Enabled on this device", dot: "bg-emerald-500", tone: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/40" },
  unsubscribed: { label: "Off on this device", dot: "bg-slate-300", tone: "text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700" },
};

const NOTIFICATION_CATEGORIES = [
  { key: "chat", label: "Chat Messages", description: "New messages in project chats and negotiations." },
  { key: "projects", label: "Project Updates", description: "Applications, invites, and status changes on your projects." },
  { key: "payments", label: "Payments", description: "Funds secured, released, or a payout landing in your wallet." },
];

function CategoryToggleRow({ label, description, checked, onToggle, busy }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={busy}
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-[#FF6B35]" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        {/* Explicit left-1 base (not "auto" — see the push-notification
            toggle above for why) + translate-x-5 for checked: 4px base +
            20px shift = 24px left edge, +16px thumb width = 40px right
            edge, a clean 4px margin inside the 44px (w-11) track, matching
            the unchecked state's 4px left margin. */}
        <span
          className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function NotificationsTab() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [prefs, setPrefs] = useState(currentUser?.notification_prefs ?? { chat: true, projects: true, payments: true });
  const [savingKey, setSavingKey] = useState(null);
  const [status, setStatus] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handlePrefToggle = async (key) => {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    setSavingKey(key);
    try {
      const updated = await updateNotificationPrefs({ [key]: next });
      updateCurrentUser(updated);
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next }));
    } finally {
      setSavingKey(null);
    }
  };

  const refreshStatus = () => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
  };

  useEffect(refreshStatus, []);

  const handleToggle = async () => {
    setBusy(true);
    setError("");
    try {
      if (status === "subscribed") {
        await unsubscribeFromPush();
      } else {
        const granted = await subscribeToPush();
        if (!granted) {
          setStatus("denied");
          return;
        }
      }
      refreshStatus();
    } catch (err) {
      setError(err.message || "Could not update your notification settings.");
    } finally {
      setBusy(false);
    }
  };

  const canToggle = status === "subscribed" || status === "unsubscribed";
  const isOn = status === "subscribed";
  const copy = PUSH_STATUS_COPY[status] ?? PUSH_STATUS_COPY.checking;

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 text-[#FF6B35] ring-1 ring-orange-100 dark:from-orange-500/10 dark:to-amber-500/10 dark:ring-orange-500/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0A1128] dark:text-white">Notifications</h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Get a real notification on this device for new messages, invites, applications, and project updates —
                even when WorkBridge isn't open in a tab.
              </p>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${copy.tone}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${copy.dot} ${status === "subscribed" ? "animate-pulse" : ""}`} />
                {copy.label}
              </span>
              {error && <p className="mt-2 text-xs font-semibold text-red-500 dark:text-red-400">{error}</p>}
            </div>
          </div>
          {canToggle && (
            <button
              onClick={handleToggle}
              disabled={busy}
              role="switch"
              aria-checked={isOn}
              aria-label="Toggle push notifications"
              className={`relative h-8 w-14 flex-shrink-0 rounded-full shadow-inner transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                isOn ? "bg-[#FF6B35]" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              {/* Explicit left-1 (not relying on the browser's "auto" static-
                  position resolution, which in this build lands at an
                  unpredictable non-zero offset) — translate-x is then a pure,
                  deterministic additional shift on top of that fixed 4px
                  base, so the checked-state math is exact: 4px base + 24px
                  shift = 28px left edge, +24px thumb width = 52px right edge,
                  a clean 4px margin inside the 56px (w-14) track — same 4px
                  margin the unchecked state already has on the left. */}
              <span
                className={`absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ${
                  isOn ? "translate-x-6" : "translate-x-0"
                }`}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                ) : (
                  <Bell className={`h-3 w-3 ${isOn ? "text-[#FF6B35]" : "text-slate-300"}`} />
                )}
              </span>
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-sm font-bold text-[#0A1128] dark:text-white">What you get notified about</p>
        <p className="mt-1 text-xs text-slate-400">Applies to this device's notifications above, and to your in-app notification history.</p>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {NOTIFICATION_CATEGORIES.map(({ key, label, description }) => (
            <CategoryToggleRow
              key={key}
              label={label}
              description={description}
              checked={prefs[key] !== false}
              busy={savingKey === key}
              onToggle={() => handlePrefToggle(key)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function DangerZoneTab() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleDeactivate = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await deactivateAccount(confirmation.trim());
      logout();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not deactivate your account.");
      setSubmitting(false);
    }
  };

  return (
    <SectionCard>
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
        <p className="text-sm font-bold text-red-700 dark:text-red-400">Deactivate My Account</p>
        <p className="mt-1.5 text-xs leading-relaxed text-red-600 dark:text-red-400/80">
          Your account will be immediately signed out and blocked from signing back in. This is reversible —
          contact support if you change your mind. This does not permanently delete your data.
        </p>
        <form onSubmit={handleDeactivate} className="mt-4 space-y-3">
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder='Type "DEACTIVATE" to confirm'
            className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-red-900/40 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-600 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={confirmation.trim() !== "DEACTIVATE" || submitting}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Deactivate my account
          </button>
        </form>
      </div>
    </SectionCard>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Settings — WorkBridge");
  const location = useLocation();
  const { currentUser } = useAuth();
  // settingsTab lets a caller (SupportFab.jsx) deep-link straight to a
  // specific tab here — e.g. navigate("/worker/settings", { state: {
  // settingsTab: "support" } }). The effect below re-syncs on every
  // subsequent navigation carrying it, since a navigate() to a route this
  // component is already mounted on doesn't remount it (the useState
  // initializer only runs once) — same pattern as BusinessDashboard.jsx's
  // own outer-tab sync.
  const [activeTab, setActiveTab] = useState(location.state?.settingsTab ?? "general");

  useEffect(() => {
    if (location.state?.settingsTab) setActiveTab(location.state.settingsTab);
  }, [location.state]);

  return (
    // h-full + its own overflow-y-auto — DashboardLayout's children slot is
    // deliberately overflow-hidden (see its own comment) and expects every
    // tab panel to own its scroll against that bounded-height ancestor, same
    // as WorkerJobFeed/WorkerNegotiationInbox/etc. already do. This page
    // never had that, so content past the fold was simply unreachable.
    <div className="wb-scroll-clean h-full w-full overflow-y-auto px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-[#0A1128] dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Settings
        </h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="flex-shrink-0 md:w-1/4">
          <nav className="wb-scroll-clean flex gap-1.5 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors md:w-full ${
                  activeTab === id
                    ? "bg-[#0A1128] text-white shadow-sm dark:bg-white dark:text-[#0A1128]"
                    : "text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
          {activeTab === "general" && <GeneralProfileTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "support" && (
            // SupportChat's internals rely on `h-full` cascading from an
            // ancestor with a definite height (it previously lived inside
            // DashboardLayout's viewport-filling flex chain) — this card has
            // no fixed height of its own, so without this wrapper the chat
            // feed/composer would collapse to a sliver instead of a real
            // chat window.
            <div className="-m-6 h-[640px] sm:-m-8 sm:h-[640px]">
              <SupportChat />
            </div>
          )}
          {activeTab === "danger" && <DangerZoneTab />}
        </div>
      </div>
    </div>
  );
}
