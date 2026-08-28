import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { apiFetch, ApiError } from "../lib/apiClient";
import { useAuth } from "../context/AuthContext";

// Deliberately its own standalone page — not a mode of AuthPage.jsx, not
// linked from /auth, /admin-login, or anywhere else in the public UI. Only
// reachable by whoever has this exact URL. Creates a real admin account
// with zero permissions (Tier 1 — see auth.controller.js's registerAdmin);
// a Super Admin has to deliberately promote them via Team Access afterward.
export default function AdminSignupPage() {
  const navigate = useNavigate();
  const { authenticate } = useAuth();
  const [step, setStep] = useState("form"); // form | otp
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/auth/register-admin", { method: "POST", body: { name: name.trim(), email: email.trim().toLowerCase(), password } });
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this account — try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token, user } = await apiFetch("/api/auth/verify-otp", { method: "POST", body: { email: email.trim().toLowerCase(), otp } });
      authenticate(token, user);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't work — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1128] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-8 shadow-2xl dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Admin Team Signup</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">Tier 1 — a Super Admin promotes you afterward.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Full Name</span>
              <input
                value={name} onChange={(e) => setName(e.target.value)} required disabled={busy}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Email</span>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Password</span>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={busy}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Minimum 8 characters"
              />
            </label>
            <button
              type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Enter the 6-digit code sent to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>.</p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              required
              disabled={busy}
              placeholder="000000"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center text-lg font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit" disabled={busy || otp.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
