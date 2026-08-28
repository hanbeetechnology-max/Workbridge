import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { createCheckoutOrder } from "../../lib/paymentsApi";
import { getSocket } from "../../lib/socketClient";
import { ApiError } from "../../lib/apiClient";
import { loadCashfreeScript, getCashfreeMode } from "../../lib/loadCashfreeScript";

// Real Cashfree Checkout — the primary funding path (EscrowFundingDrawer
// stays as the manual bank-transfer fallback). Same trust boundary as the
// CashFree version this replaced: opening the checkout modal and it
// closing without an error is NOT proof of payment — Cashfree has no
// client-side signature to verify the way CashFree's Checkout handler
// callback did, so this component is even more strictly webhook-only now.
// The project only actually becomes FUNDS_SECURED when the server-to-
// server webhook fires (cashfreeWebhook.controller.js) and this component
// hears the resulting STATUS_CHANGED socket event.
export default function CashfreeCheckoutTrigger({ project, amount, onSecured }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | awaiting | confirmed
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (phase !== "awaiting") return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (event.projectId !== project.id) return;
      if (event.type === "STATUS_CHANGED" && event.status === "FUNDS_SECURED") {
        setPhase("confirmed");
        toast.success("Payment confirmed — funds are secured.");
        onSecured?.();
      }
    };

    socket.on("project:event", handleProjectEvent);
    // A slow/misconfigured webhook shouldn't leave the business staring at
    // a spinner forever — after 30s, hand back an explanation instead of
    // silently hanging (the payment itself may have already succeeded at
    // this point; only our own confirmation is delayed).
    timeoutRef.current = window.setTimeout(() => {
      toast.info("Still confirming your payment — this can take a minute. Refresh shortly if it doesn't update.");
    }, 30000);

    return () => {
      socket.off("project:event", handleProjectEvent);
      window.clearTimeout(timeoutRef.current);
    };
  }, [phase, project.id, onSecured]);

  const handlePay = async () => {
    setPhase("loading");
    try {
      await loadCashfreeScript();
      const order = await createCheckoutOrder(project.id);
      if (!order.paymentSessionId) throw new Error("Could not start checkout — no payment session returned.");

      const cashfree = window.Cashfree({ mode: getCashfreeMode() });
      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });

      if (result?.error) {
        // User closed the modal or the attempt errored client-side — not
        // necessarily a real failed payment (see file header); just reset
        // to idle so they can retry. A payment that DID actually go
        // through server-side still gets picked up by the webhook
        // regardless of what this branch does.
        if (result.error.message) toast.info(result.error.message);
        setPhase("idle");
        return;
      }

      setPhase("awaiting");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : err.message || "Could not start checkout.");
      setPhase("idle");
    }
  };

  if (phase === "awaiting") {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-4 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Confirming your payment…
      </div>
    );
  }

  return (
    <button
      onClick={handlePay}
      disabled={phase === "loading"}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-4 text-base font-bold text-white shadow-[0_4px_14px_0_rgba(255,107,53,0.39)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e55a2b] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {phase === "loading" ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Starting checkout…
        </>
      ) : (
        <>
          Pay {amount} &amp; Secure Funds
          <Zap className="h-5 w-5" />
        </>
      )}
    </button>
  );
}
