import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2, Lock, X, Zap } from "lucide-react";
import { parseAmount } from "../../utils/projectStatus";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

/**
 * The "Secure Vault" — a fast, in-context pay modal that overlays the chat
 * instead of navigating to a separate page (that's what /invoice is for —
 * the formal, downloadable record, viewed *after* the fact). Self-contained:
 * the parent just renders it and handles onSuccess/onClose.
 */
export default function SecureVaultModal({ jobTitle, workerName, amount, onClose, onSuccess }) {
  const [status, setStatus] = useState("idle"); // idle | verifying | success
  const budgetNum = parseAmount(amount);

  const handlePay = () => {
    if (status !== "idle") return;
    setStatus("verifying");
    window.setTimeout(() => setStatus("success"), 1500);
  };

  const handleContinue = () => {
    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-brightness-50">
      <motion.button
        type="button"
        aria-label="Dismiss"
        onClick={status === "idle" ? onClose : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-slate-900/60"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/40 bg-white/90 shadow-2xl backdrop-blur-2xl"
      >
        {status === "idle" && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {status !== "success" ? (
            <motion.div
              key="pay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-7"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A]">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <h2
                  className="mt-4 text-lg font-black text-slate-900"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Secure Payment
                </h2>
              </div>

              {/* Summary card */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Job</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">{jobTitle}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Worker</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{workerName}</p>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Amount</p>
                  <p className="mt-0.5 text-2xl font-black text-slate-900">{formatINR(budgetNum)}</p>
                </div>
              </div>


              <button
                onClick={handlePay}
                disabled={status === "verifying"}
                className={`mt-6 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(255,107,53,0.55)] transition-all duration-300 ${
                  status === "verifying"
                    ? "cursor-not-allowed bg-[#FF6B35]/70"
                    : "bg-[#FF6B35] hover:-translate-y-0.5 hover:bg-[#e55a2b] hover:shadow-xl"
                }`}
              >
                {status === "verifying" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Pay &amp; Secure Funds
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-slate-400">Secure checkout</p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"
              >
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </motion.div>
              <h2 className="mt-5 text-lg font-black text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Funds Secured
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {formatINR(budgetNum)} is held securely. {workerName} has been notified — the job is now active.
              </p>
              <button
                onClick={handleContinue}
                className="mt-6 flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#0F172A] py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                Continue
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
