import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Smartphone,
  User,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import brandLogo from "../assets/logo.png";
import { adminAuthSchema, authSchema, signupSchema, forgotPasswordSchema } from "../utils/formValidation";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { nameFilter, phoneFilter } from "../utils/inputGuards";

const USER_CONFIG = {
  worker: { label: "Worker", Icon: Briefcase, bg: "bg-[#FF6B2C]", shadow: "shadow-[#FF6B2C]/30" },
  business: { label: "Business", Icon: Building2, bg: "bg-[#1B3FAB]", shadow: "shadow-[#1B3FAB]/30" },
  admin: { label: "Admin", Icon: Shield, bg: "bg-slate-700", shadow: "shadow-slate-500/20" },
};

const BRAND_FEATURES = [
  { Icon: Lock, text: "Protected funds released strictly on your approval" },
  { Icon: Zap, text: "Instant automated payout upon milestone sign-off" },
  { Icon: Shield, text: "Be a specialists with verified track records" },
  { Icon: Award, text: "Elite performance tiers reflecting proven quality" },
];

// Signup-only checklist — shown instead of BRAND_FEATURES while creating an
// account, same "here's what you get" pattern as a job board's registration
// page. Grounded in what actually exists today (real job feed, real Secured
// Funds flow, real badges) — no invented perks. "Secured Funds" not
// "escrow" — that word is reserved for the legal pages (Terms/Privacy/
// Refund), never product-facing copy.
const REGISTER_BENEFITS = {
  worker: [
    "Build a real profile businesses can find and hire you from",
    "Apply to open jobs the moment they're posted",
    "Get paid once your work is approved — funds are secured upfront",
  ],
  business: [
    "Post real jobs and browse verified Worker profiles",
    "Secure project funds upfront — pay only when you approve the work",
    "Track every project from application to payout in one place",
  ],
};

const OTP_LENGTH = 6;
const AUTH_INPUT_CLASS = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#1B3FAB] focus:bg-white focus:ring-4 focus:ring-[#1B3FAB]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800";

// Only set in real deployments that have created a Google OAuth client —
// see .env.example. Every Google-Sign-In bit below is a no-op when this is
// empty, same pattern Sentry/PostHog already use for optional integrations.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export default function AuthPage({ userType, onSuccess, onBack }) {
  const isAdmin = userType === "admin";
  const cfg = USER_CONFIG[userType] ?? USER_CONFIG.worker;
  const [authStep, setAuthStep] = useState("input");
  const [authMode, setAuthMode] = useState("signin");
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const otpInputs = useRef([]);
  const verifyingRef = useRef(false);
  const { authenticate } = useAuth();
  const { resolvedTheme } = useTheme();

  // Every entry point below (mount, switching signin/signup, Forgot
  // Password, "back to sign in", "edit account details") used to hand-roll
  // this same ~8-line reset. Two of those five copies had quietly drifted
  // to forget setShowPassword, and a third forgot all three password-
  // visibility flags — so a revealed password from one flow could still
  // read as "shown" after jumping to another. One definition now, so
  // every call site resets identically.
  const resetAuthState = () => {
    setAuthStep("input");
    setPendingCredentials(null);
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setInfoMessage("");
    setFormError("");
    setResendCountdown(0);
    setShowPassword(false);
    setNewPassword("");
    setShowNewPassword(false);
  };

  const activeSchema = isAdmin
    ? adminAuthSchema
    : authMode === "signup"
      ? signupSchema
      : authMode === "forgot"
        ? forgotPasswordSchema
        : authSchema;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(activeSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", agreedToTerms: false },
  });
  const agreedToTerms = watch("agreedToTerms");

  useEffect(() => {
    resetAuthState();
    setAuthMode("signin");
    reset({ fullName: "", email: "", phone: "", password: "", agreedToTerms: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, reset, userType]);

  useEffect(() => {
    if (authStep === "otp") {
      const focusTimer = window.setTimeout(() => otpInputs.current[0]?.focus(), 80);
      return () => window.clearTimeout(focusTimer);
    }
    return undefined;
  }, [authStep]);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCountdown((count) => Math.max(0, count - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  // Loads Google's own script once, only if a client ID is actually
  // configured — an unconfigured deployment never touches google.com at
  // all. A second AuthPage instance mounting later (e.g. switching from
  // /auth/worker to /auth/business) reuses the same tag instead of
  // injecting it twice.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) setGoogleScriptReady(true);
      else existing.addEventListener("load", () => setGoogleScriptReady(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => setGoogleScriptReady(true), { once: true });
    document.head.appendChild(script);
  }, []);

  // The ID token Google Identity Services hands back after the user picks
  // an account — verified server-side in POST /api/auth/google, never
  // trusted here. `role: userType` only matters if this is a brand-new
  // account; an existing user's real role always wins server-side.
  const handleGoogleCredential = async (response) => {
    setGoogleSubmitting(true);
    setFormError("");
    try {
      const { token, user } = await apiFetch("/api/auth/google", {
        method: "POST",
        body: { credential: response.credential, role: userType },
      });
      authenticate(token, user);
      onSuccess(user);
    } catch (error) {
      setFormError(error.message ?? "Could not sign in with Google. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  // Renders Google's own button into googleButtonRef once the script is
  // ready — skipped entirely for admin (no Google sign-in for staff
  // accounts) and while mid-OTP or on the forgot-password screen, where a
  // second "log in another way" option doesn't make sense.
  useEffect(() => {
    if (!googleScriptReady || isAdmin || authStep !== "input" || authMode === "forgot") return;
    if (!googleButtonRef.current || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: "standard",
      // Google's own button is a hosted iframe — it never picks up our
      // Tailwind dark: classes, so it has to be told which of Google's two
      // themes to draw explicitly. resolvedTheme (ThemeContext) in the
      // dependency array is what makes this actually re-render the button
      // when the user toggles theme mid-session, not just on first paint.
      theme: resolvedTheme === "dark" ? "filled_black" : "outline",
      size: "large",
      shape: "pill",
      width: 336,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleScriptReady, isAdmin, authStep, authMode, userType, resolvedTheme]);

  const changeMode = (mode) => {
    if (mode === authMode) return;
    resetAuthState();
    setAuthMode(mode);
    reset({ fullName: "", email: "", phone: "", password: "", agreedToTerms: false });
  };

  // "Forgot password?" drops into its own mode rather than signin/signup —
  // same input -> otp two-step shape, but the otp step here ends in setting
  // a new password instead of just proving the email is real.
  const startForgotPassword = () => {
    resetAuthState();
    setAuthMode("forgot");
    reset({ fullName: "", email: "", phone: "", password: "", agreedToTerms: false });
  };

  const backToSignIn = () => {
    resetAuthState();
    setAuthMode("signin");
    reset({ fullName: "", email: "", phone: "", password: "", agreedToTerms: false });
  };

  // Sign-in is password-only now — no OTP step at all. Works identically
  // for worker/business/admin; the server resolves the real role from the
  // DB row regardless of which entry point was clicked.
  const submitLogin = async ({ email, password }) => {
    setSendingOtp(true);
    setFormError("");
    try {
      const { token, user } = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
      });
      authenticate(token, user);
      onSuccess(user);
    } catch (error) {
      setFormError(error.message ?? "Could not sign in. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Sign-up creates the account (email_verified: false) and sends the OTP
  // in one call — the OTP step below is the only place it's ever used.
  const submitRegister = async (values) => {
    setSendingOtp(true);
    setFormError("");
    try {
      const email = values.email.trim().toLowerCase();
      const result = await apiFetch("/api/auth/register", {
        method: "POST",
        body: { role: userType, name: values.fullName.trim(), email, phone: values.phone, password: values.password },
      });
      setPendingCredentials({ email });
      setOtp(Array(OTP_LENGTH).fill(""));
      setAuthStep("otp");
      setResendCountdown(result?.resendAfterSeconds ?? 60);
      setInfoMessage("Your secure code is on its way.");
    } catch (error) {
      setFormError(error.message ?? "Could not create your account. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Forgot-password's "send code" step reuses the same
  // input -> otp shape as registration, but always shows the same generic
  // success message (the backend never reveals whether the email exists).
  const submitForgotPassword = async ({ email }) => {
    setSendingOtp(true);
    setFormError("");
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const result = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: { email: trimmedEmail },
      });
      setPendingCredentials({ email: trimmedEmail });
      setOtp(Array(OTP_LENGTH).fill(""));
      setNewPassword("");
      setAuthStep("otp");
      setResendCountdown(result?.resendAfterSeconds ?? 60);
      setInfoMessage("If an account exists for this email, a reset code is on its way.");
    } catch (error) {
      setFormError(error.message ?? "Could not send a reset code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const onUserContinue = (values) => {
    if (authMode === "forgot") {
      submitForgotPassword(values);
    } else if (isAdmin || authMode === "signin") {
      submitLogin(values);
    } else {
      submitRegister(values);
    }
  };

  const verifyCode = async (code) => {
    if (verifyingRef.current || code.length !== OTP_LENGTH || !pendingCredentials) return;
    verifyingRef.current = true;
    setVerifyingOtp(true);
    setOtpError("");
    setInfoMessage("");

    try {
      const { token, user } = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: { email: pendingCredentials.email, otp: code },
      });
      authenticate(token, user);
      onSuccess(user);
    } catch (error) {
      setOtpError(error.message ?? "That code is invalid or expired. Please try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      window.setTimeout(() => otpInputs.current[0]?.focus(), 0);
    } finally {
      verifyingRef.current = false;
      setVerifyingOtp(false);
    }
  };

  // Forgot-password's otp step also needs a new password, so it can't
  // auto-submit the instant 6 digits are typed the way verifyCode does —
  // it's wired to the "Reset Password" button instead.
  const submitResetPassword = async () => {
    if (verifyingRef.current || !pendingCredentials) return;
    if (!otp.every(Boolean)) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    if (newPassword.length < 8) {
      setOtpError("Password must be at least 8 characters.");
      return;
    }
    verifyingRef.current = true;
    setVerifyingOtp(true);
    setOtpError("");
    setInfoMessage("");

    try {
      const { token, user } = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: { email: pendingCredentials.email, otp: otp.join(""), newPassword },
      });
      authenticate(token, user);
      onSuccess(user);
    } catch (error) {
      setOtpError(error.message ?? "That code is invalid or expired. Please try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      window.setTimeout(() => otpInputs.current[0]?.focus(), 0);
    } finally {
      verifyingRef.current = false;
      setVerifyingOtp(false);
    }
  };

  const handleOtpChange = (index, event) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setOtpError("");

    if (digit && index < OTP_LENGTH - 1) otpInputs.current[index + 1]?.focus();
    if (nextOtp.every(Boolean) && authMode !== "forgot") window.queueMicrotask(() => verifyCode(nextOtp.join("")));
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputs.current[index - 1]?.focus();
      return;
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpInputs.current[index + 1]?.focus();
      return;
    }
    if (event.key !== "Backspace") return;
    if (otp[index]) return;
    if (index > 0) {
      event.preventDefault();
      const nextOtp = [...otp];
      nextOtp[index - 1] = "";
      setOtp(nextOtp);
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const nextOtp = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? "");
    setOtp(nextOtp);
    otpInputs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
    if (pasted.length === OTP_LENGTH && authMode !== "forgot") window.queueMicrotask(() => verifyCode(pasted));
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || sendingOtp || !pendingCredentials) return;
    setSendingOtp(true);
    setOtpError("");
    setInfoMessage("");
    try {
      const endpoint = authMode === "forgot" ? "/api/auth/forgot-password" : "/api/auth/resend-otp";
      const result = await apiFetch(endpoint, {
        method: "POST",
        body: { email: pendingCredentials.email },
      });
      setResendCountdown(result?.resendAfterSeconds ?? 60);
      setInfoMessage("A fresh code has been sent.");
    } catch (error) {
      setOtpError(error.message ?? "Could not resend the code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Deliberately does not call reset(form) — "edit account details" means
  // the user wants to fix what they already typed, not have it wiped.
  const editDetails = () => {
    resetAuthState();
  };

  const isOtpComplete = otp.every(Boolean);

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-5/12 flex-col overflow-hidden bg-[#0A1128] p-10 md:flex">
        <button
          type="button"
          onClick={onBack}
          className="z-10 mb-14 flex w-fit items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back to home
        </button>

        <div className="z-10 flex max-w-sm flex-1 flex-col justify-center">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg shadow-[#FF6B2C]/20">
              <img src={brandLogo} alt="" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-display text-xl font-extrabold text-white">
              WorkBridge
            </span>
          </div>

          <motion.h1
            key={`${authMode}-${isAdmin}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mb-4 text-3xl font-extrabold leading-tight text-white"
          >
            {isAdmin ? (
              "Secure admin access"
            ) : (
              <>
                {authMode === "signin" ? `Welcome Back, ${cfg.label}` : "Set Up Your"}<br />
                <span className="text-[#FF6B2C]">
                  {authMode === "signin" ? "Let’s Get You Back to Work" : "WorkBridge Account"}
                </span>
              </>
            )}
          </motion.h1>
          <p className="mb-10 text-sm leading-relaxed text-slate-400">
            {userType === "worker" && "High-value contracts, verified businesses, and automated milestone settlements."}
            {userType === "business" && "Hire  talent with 100% protected payments—funds are released strictly upon your milestone sign-off."}
            {userType === "admin" && "Manage verifications, resolve disputes, and keep the platform running safely."}
          </p>

          {!isAdmin && authMode === "signup" ? (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">On signing up, you can</p>
              <div className="space-y-3">
                {REGISTER_BENEFITS[userType].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {BRAND_FEATURES.map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                    <Icon className="h-3.5 w-3.5 text-[#FF6B2C]" />
                  </div>
                  <span className="text-sm text-slate-300">{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 animate-pulse rounded-full bg-[#FF6B2C]/[0.05]" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-[#1B3FAB]/10" />
      </aside>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#F4F6FF] px-4 py-10 dark:bg-slate-950 sm:p-8">
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 animate-pulse rounded-full bg-[#FF6B2C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-12 h-80 w-80 rounded-full bg-[#1B3FAB]/10 blur-3xl" />

        <button
          type="button"
          onClick={onBack}
          className="absolute left-5 top-5 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg ${cfg.bg} ${cfg.shadow}`}>
              <cfg.Icon className="h-4 w-4" />
              {cfg.label} Account
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            {authStep === "input" && authMode !== "forgot" && (
              <div className={`grid border-b border-slate-200/80 bg-white/40 dark:border-slate-800 dark:bg-slate-900/40 ${isAdmin ? "grid-cols-1" : "grid-cols-2"}`}>
                {isAdmin ? (
                  <div className="relative py-4 text-center text-sm font-bold text-[#1B3FAB] dark:text-blue-400">
                    Admin Sign In
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1B3FAB] dark:bg-blue-400" />
                  </div>
                ) : (
                  <>
                <button
                  type="button"
                  onClick={() => changeMode("signin")}
                  className={`relative py-4 text-sm font-bold transition ${authMode === "signin" ? "text-[#1B3FAB] dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
                >
                  Sign In
                  {authMode === "signin" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1B3FAB] dark:bg-blue-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("signup")}
                  className={`relative py-4 text-sm font-bold transition ${authMode === "signup" ? "text-[#1B3FAB] dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
                >
                  Create Account
                  {authMode === "signup" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1B3FAB] dark:bg-blue-400" />}
                </button>
                  </>
                )}
              </div>
            )}

            <div className="p-6 sm:p-8">
              {authStep === "otp" ? (
                <div className="rounded-2xl border border-white/50 bg-white/40 p-5 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40 sm:p-6">
                  <button
                    type="button"
                    onClick={editDetails}
                    className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1B3FAB] dark:text-slate-400 dark:hover:text-blue-400"
                  >
                    <ArrowLeft className="h-4 w-4" /> {authMode === "forgot" ? "Use a different email" : "Edit account details"}
                  </button>

                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E9] text-[#FF6B2C] shadow-sm dark:bg-orange-500/10">
                      <Shield className="h-7 w-7" />
                    </div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1B3FAB] dark:text-blue-400">
                      {authMode === "forgot" ? "Account recovery" : "Identity check"}
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-[#0A1128] dark:text-white">
                      {authMode === "forgot" ? "Reset your password" : "Verify it's you"}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      Enter the 6-digit code sent to<br />
                      <span className="font-semibold text-slate-800 dark:text-white">{pendingCredentials?.email}</span>
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-6 gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => { otpInputs.current[index] = element; }}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        aria-label={`OTP digit ${index + 1}`}
                        maxLength={1}
                        disabled={verifyingOtp}
                        className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white/80 text-center text-xl font-black text-[#0A1128] shadow-sm outline-none transition focus:-translate-y-0.5 focus:border-[#FF6B2C] focus:ring-4 focus:ring-[#FF6B2C]/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white sm:h-14 sm:text-2xl"
                      />
                    ))}
                  </div>

                  {authMode === "forgot" && (
                    <div className="mt-4">
                      <Field label="New password" error={newPassword && newPassword.length < 8 ? "Password must be at least 8 characters" : ""} Icon={Lock}>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Minimum 8 characters"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            disabled={verifyingOtp}
                            className={`${AUTH_INPUT_CLASS} pr-12`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((visible) => !visible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </Field>
                    </div>
                  )}

                  <div aria-live="polite" className="mt-4 min-h-10 text-center">
                    {verifyingOtp && <p className="text-sm font-semibold text-[#1B3FAB] dark:text-blue-400">{authMode === "forgot" ? "Resetting your password…" : "Verifying your code…"}</p>}
                    {!verifyingOtp && otpError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{otpError}</p>}
                    {!verifyingOtp && !otpError && infoMessage && <p className="text-sm text-emerald-700 dark:text-emerald-400">{infoMessage}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => (authMode === "forgot" ? submitResetPassword() : verifyCode(otp.join("")))}
                    disabled={!isOtpComplete || verifyingOtp || (authMode === "forgot" && newPassword.length < 8)}
                    className="mt-2 w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B35]/20 transition-all hover:bg-[#e55a2b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {authMode === "forgot"
                      ? verifyingOtp ? "Resetting…" : "Reset Password"
                      : verifyingOtp ? "Verifying…" : "Verify & Continue"}
                  </button>

                  <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
                    Didn&apos;t receive it?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCountdown > 0 || sendingOtp}
                      className="font-bold text-[#FF6B2C] transition hover:text-[#e65b22] disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                    >
                      {sendingOtp
                        ? "Sending…"
                        : resendCountdown > 0
                          ? `Resend in 0:${String(resendCountdown).padStart(2, "0")}`
                          : "Resend Code"}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
                    The code expires in {authMode === "forgot" ? "15" : "10"} minutes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6 text-center">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1B3FAB] dark:text-blue-400">
                      {authMode === "forgot"
                        ? "Account recovery"
                        : isAdmin
                          ? "Protected area"
                          : authMode === "signup"
                            ? "Secure email verification"
                            : "Password sign-in"}
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-[#0A1128] dark:text-white">
                      {authMode === "forgot" ? "Reset your password" : isAdmin ? "Admin sign in" : authMode === "signin" ? "Welcome back" : "Join WorkBridge"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {authMode === "forgot"
                        ? "Enter your account email and we'll send you a reset code."
                        : isAdmin
                          ? "Use your internally provisioned admin account."
                          : authMode === "signin"
                            ? "Enter your email and password to continue."
                            : `Create your ${cfg.label.toLowerCase()} account — we'll email you a code to verify it.`}
                    </p>
                  </div>

                  {formError && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Google's own button renders into this div once its
                      script loads — empty and invisible when
                      VITE_GOOGLE_CLIENT_ID isn't set, not a placeholder
                      that looks live but does nothing. */}
                  {!isAdmin && authMode !== "forgot" && GOOGLE_CLIENT_ID && (
                    <div className="mb-5">
                      <div className="relative flex min-h-11 items-center justify-center overflow-hidden rounded-full">
                        <div ref={googleButtonRef} className="flex w-full items-center justify-center" />
                        {/* Google's button is its own hosted iframe — it can't be
                            programmatically disabled, so a transparent blocker
                            sits on top of it in signup mode until the Terms
                            checkbox is checked, same requirement as the email
                            form below enforces via signupSchema. */}
                        {authMode === "signup" && !agreedToTerms && (
                          <button
                            type="button"
                            aria-label="Agree to the Terms & Conditions and Privacy Policy first"
                            onClick={() => setFormError("Please agree to the Terms & Conditions and Privacy Policy before continuing.")}
                            className="absolute inset-0 cursor-not-allowed"
                          />
                        )}
                      </div>
                      {googleSubmitting && (
                        <p className="mt-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Signing you in…</p>
                      )}
                      <div className="mt-5 flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">or continue with email</span>
                        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onUserContinue)} className="space-y-4">
                    {authMode === "forgot" && (
                      <button
                        type="button"
                        onClick={backToSignIn}
                        className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1B3FAB] dark:text-slate-400 dark:hover:text-blue-400"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to sign in
                      </button>
                    )}

                    {!isAdmin && authMode === "signup" && (
                      <Field label="Full name" error={errors.fullName?.message} Icon={User}>
                        <input
                          type="text"
                          autoComplete="name"
                          placeholder="Your full name"
                          {...register("fullName")}
                          onChange={(e) => setValue("fullName", nameFilter(e.target.value), { shouldValidate: true })}
                          className={AUTH_INPUT_CLASS}
                        />
                      </Field>
                    )}

                    <Field label="Email" error={errors.email?.message} Icon={Mail}>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...register("email", { setValueAs: (value) => value.trim().toLowerCase() })}
                        className={AUTH_INPUT_CLASS}
                      />
                    </Field>

                    {/* Signup only — sign-in authenticates by email + password alone.
                        Phone used to also be collected (as "optional") on sign-in, but
                        the backend required it to match when present, so typing any
                        phone number that wasn't the one on file broke login with a
                        generic "invalid credentials" error. */}
                    {!isAdmin && authMode === "signup" && (
                      <Field label="Mobile number" error={errors.phone?.message} Icon={Smartphone}>
                        <div className="flex gap-2">
                          <span className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">+91</span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            maxLength={10}
                            placeholder="XXXXXXXXXX"
                            {...register("phone", { setValueAs: (value) => value.replace(/\D/g, "") })}
                            onChange={(e) => setValue("phone", phoneFilter(e.target.value), { shouldValidate: true })}
                            className={AUTH_INPUT_CLASS}
                          />
                        </div>
                      </Field>
                    )}

                    {authMode !== "forgot" && (
                      <Field label="Password" error={errors.password?.message} Icon={Lock}>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete={isAdmin || authMode === "signin" ? "current-password" : "new-password"}
                            placeholder="Minimum 8 characters"
                            {...register("password")}
                            className={`${AUTH_INPUT_CLASS} pr-12`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </Field>
                    )}

                    {authMode === "signin" && (
                      <div className="-mt-2 text-right">
                        <button
                          type="button"
                          onClick={startForgotPassword}
                          className="text-xs font-semibold text-[#1B3FAB] transition hover:text-[#163596] dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {!isAdmin && authMode === "signup" && (
                      <div>
                        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          <input
                            type="checkbox"
                            {...register("agreedToTerms")}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-[#FF6B35] outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-slate-600 dark:bg-slate-800"
                          />
                          <span>
                            I agree to WorkBridge's{" "}
                            <Link to="/terms" target="_blank" className="font-semibold text-[#1B3FAB] hover:underline dark:text-blue-400">
                              Terms &amp; Conditions
                            </Link>{" "}
                            and{" "}
                            <Link to="/privacy" target="_blank" className="font-semibold text-[#1B3FAB] hover:underline dark:text-blue-400">
                              Privacy Policy
                            </Link>
                            .
                          </span>
                        </label>
                        {errors.agreedToTerms && (
                          <p className="mt-1.5 pl-6 text-xs font-semibold text-red-500 dark:text-red-400">{errors.agreedToTerms.message}</p>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={sendingOtp}
                      className="mt-2 w-full rounded-xl bg-[#FF6B35] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B35]/20 transition-all hover:bg-[#e55a2b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingOtp
                        ? "One moment…"
                        : authMode === "forgot"
                          ? "Send Reset Code"
                          : isAdmin || authMode === "signin"
                            ? "Sign In"
                            : "Create account"}
                    </button>

                    {!isAdmin && authMode === "signup" && (
                      <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400 dark:text-slate-500">
                        <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        We'll email you a 6-digit code to verify your address
                      </div>
                    )}

                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, error, Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> {label}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-500 dark:text-red-400">{error}</span>}
    </label>
  );
}
