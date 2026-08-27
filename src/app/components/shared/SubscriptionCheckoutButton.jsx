import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createSubscriptionCheckout, getSubscriptionStatus } from "../../lib/paymentsApi";
import { ApiError } from "../../lib/apiClient";
import { loadCashfreeScript, getCashfreeMode } from "../../lib/loadCashfreeScript";

// Manual pay-per-period subscription checkout — no project involved, so
// unlike CashfreeCheckoutTrigger.jsx (which waits on a project-scoped
// STATUS_CHANGED socket event) this polls GET /subscription-status a few
// times after the checkout modal resolves, since there's no equivalent
// realtime channel for a plain user-level subscription. The modal closing
// without an error is NOT proof of payment — Cashfree has no client-side
// signature to verify — only the polled/confirmed server state (driven by
// the webhook) is treated as the real answer.
export default function SubscriptionCheckoutButton({ tier, billingPeriod, label, className, onConfirmed }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | confirming

  const pollForConfirmation = async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const status = await getSubscriptionStatus();
        if (status.tier === tier) {
          setPhase("idle");
          toast.success(`You're now on the ${tier[0]}${tier.slice(1).toLowerCase()} plan.`);
          onConfirmed?.(status);
          return;
        }
      } catch {
        // keep polling — a transient failure here shouldn't abandon the wait
      }
    }
    setPhase("idle");
    toast.info("Payment received — still confirming with our system. Refresh shortly if your plan doesn't update.");
  };

  const handlePay = async () => {
    setPhase("loading");
    try {
      await loadCashfreeScript();
      const order = await createSubscriptionCheckout({ tier, billingPeriod });
      if (!order.paymentSessionId) throw new Error("Could not start checkout — no payment session returned.");

      const cashfree = window.Cashfree({ mode: getCashfreeMode() });
      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });

      if (result?.error) {
        if (result.error.message) toast.info(result.error.message);
        setPhase("idle");
        return;
      }

      setPhase("confirming");
      pollForConfirmation();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : err.message || "Could not start checkout.");
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={busy}
      className={className}
    >
      {busy ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {phase === "confirming" ? "Confirming…" : "Starting…"}
        </>
      ) : (
        label
      )}
    </button>
  );
}
