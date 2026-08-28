import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI / QR", sub: "Google Pay, PhonePe, Paytm", icon: QrCode },
  { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay accepted", icon: CreditCard },
];

/**
 * Premium, Stripe/CashFree-style checkout modal. Fully presentational for
 * payment mechanics — parent decides what "success" means via onSuccess.
 */
export default function CheckoutModal({
  open,
  amount = 399,
  description = "Business Verification Fee",
  onClose,
  onSuccess,
}) {
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === "Escape" && !isProcessing) onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isProcessing]);

  if (!open) return null;

  const handlePay = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Simulated 2-second gateway round-trip before confirming success
    window.setTimeout(() => {
      setIsProcessing(false);
      onSuccess?.();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in bg-slate-900/70 p-4 backdrop-blur-md duration-300">
      <div className="w-full max-w-md transform animate-in zoom-in-95 overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="relative border-b border-slate-100 bg-slate-50 p-6 text-center">
          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close checkout"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span
              className="text-sm font-extrabold text-[#0F172A]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              WorkBridge
            </span>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
            <Lock className="h-4 w-4 text-green-600" />
            Secure Checkout
          </div>
        </div>

        {/* ── Amount ─────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 text-center">
          <p
            className="text-3xl font-extrabold text-slate-900"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            ₹{amount.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        {/* ── Payment methods ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 p-6">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            const Icon = method.icon;

            return (
              <button
                key={method.id}
                type="button"
                disabled={isProcessing}
                onClick={() => setSelectedMethod(method.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[#FF6B35] bg-orange-50/40 ring-1 ring-[#FF6B35]"
                    : "border-slate-200 hover:border-slate-300"
                } ${isProcessing ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? "bg-[#FF6B35]/10 text-[#FF6B35]" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{method.label}</p>
                  <p className="text-xs text-slate-500">{method.sub}</p>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#FF6B35]" />
                ) : (
                  <div className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-300" />
                )}
              </button>
            );
          })}

          {/* ── CTA ────────────────────────────────────────────────────── */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePay}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 ${
              isProcessing
                ? "cursor-not-allowed bg-[#FF6B35]/70"
                : "bg-[#FF6B35] hover:-translate-y-0.5 hover:bg-[#e55a2b] hover:shadow-xl"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay ₹{amount.toFixed(2)}
              </>
            )}
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3 w-3" />
            This is a preview of checkout — no live payment gateway yet
          </p>
        </div>
      </div>
    </div>
  );
}
