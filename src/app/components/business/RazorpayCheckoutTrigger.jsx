import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { createCheckoutOrder, verifyPayment } from "../../lib/paymentsApi";
import { getSocket } from "../../lib/socketClient";
import { ApiError } from "../../lib/apiClient";
import { loadRazorpayScript } from "../../lib/loadRazorpayScript";

// Real Razorpay Checkout — the primary funding path (EscrowFundingDrawer
// stays as the manual bank-transfer fallback). This component owns the
// full click-to-confirmed lifecycle, but is deliberately conservative
// about what it trusts: the Checkout success `handler` callback is
// UI-optimistic ONLY — it flips to "confirming" and calls /payments/verify
// purely to show the right spinner state, but the project only actually
// becomes FUNDS_SECURED when the server-to-server webhook fires and this
// component hears the resulting STATUS_CHANGED socket event. A payment
// that captures but whose webhook is slow/misconfigured will sit in
// "confirming" rather than falsely claiming success.
export default function RazorpayCheckoutTrigger({ project, amount, businessName, businessEmail, businessPhone, onSecured }) {
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
    // silently hanging (the payment itself already succeeded at this
    // point; only our own confirmation is delayed).
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
      await loadRazorpayScript();
      const order = await createCheckoutOrder(project.id);

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.orderId,
        name: "WorkBridge",
        description: `Secure funds — ${project.title}`,
        prefill: { name: businessName, email: businessEmail, contact: businessPhone },
        theme: { color: "#FF6B35" },
        handler: async (response) => {
          setPhase("awaiting");
          try {
            const { verified } = await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (!verified) {
              // Doesn't roll anything back — the webhook is still the real
              // authority and may still confirm this payment independently;
              // this only affects how fast the UI itself learns about it.
              toast.info("Payment received — confirming with our system…");
            }
          } catch {
            // Same reasoning — verify() is optimistic-only, so its own
            // failure (network blip, etc.) doesn't mean the payment failed.
          }
        },
        modal: {
          ondismiss: () => setPhase((p) => (p === "loading" ? "idle" : p)),
        },
      });

      razorpay.on("payment.failed", () => {
        toast.error("Payment failed — you can try again.");
        setPhase("idle");
      });

      razorpay.open();
      setPhase((p) => (p === "loading" ? "idle" : p));
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
