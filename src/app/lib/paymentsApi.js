// Real CashFree Checkout + Route API calls — same apiFetch convention as
// projectsApi.js/walletApi.js.
import { apiFetch } from "./apiClient";

// POST /api/projects/:id/checkout — server computes the amount
// (budget + business_fee_pct), never trusted from the client. Idempotent:
// calling this again on a project that's already PENDING_FUNDS via
// CashFree just hands back the same order instead of erroring.
export function createCheckoutOrder(projectId) {
  return apiFetch(`/api/projects/${projectId}/checkout`, { method: "POST" });
}

// Recomputes the Checkout success-callback's signature server-side. A valid
// signature now grants FUNDS_SECURED / confirms the subscription right away
// (real HMAC proof, not just a client claim) — the server-to-server webhook
// still runs independently afterwards as an idempotent backstop, so
// CashFreeCheckoutTrigger's STATUS_CHANGED wait stays correct either way.
export function verifyPayment({ orderId, paymentId, signature }) {
  return apiFetch("/api/payments/verify", {
    method: "POST",
    body: { orderId, paymentId, signature },
  });
}

export function getRouteAccountStatus() {
  return apiFetch("/api/payments/route-account");
}

// reverifyToken: only required when CHANGING an already-linked account —
// see backend's requireReverify. Omit it for a first-time link.
export function linkRouteAccount({ email, phone, beneficiaryName, legalBusinessName, bankAccountNumber, bankIfsc, reverifyToken }) {
  return apiFetch("/api/payments/route-account", {
    method: "POST",
    body: { email, phone, beneficiaryName, legalBusinessName, bankAccountNumber, bankIfsc },
    headers: reverifyToken ? { "X-Reverify-Token": reverifyToken } : undefined,
  });
}

// A worker's saved default payout destination (bank account+IFSC, or a UPI
// VPA) — used to pay them directly via CashFreeX at project completion,
// without needing the Route linked-account flow above (still blocked
// pending RBI review). payoutMethod: "UPI" | "BANK_TRANSFER"; payoutDetails
// is either the VPA string or "accountNumber · ifsc".
export function getPayoutAccount() {
  return apiFetch("/api/payments/payout-account");
}

// reverifyToken: only required when CHANGING already-saved details — see
// backend's requireReverify. Omit it for a first-time save.
export function savePayoutDetails({ payoutMethod, payoutDetails, reverifyToken }) {
  return apiFetch("/api/payments/payout-account", {
    method: "POST",
    body: { payoutMethod, payoutDetails },
    headers: reverifyToken ? { "X-Reverify-Token": reverifyToken } : undefined,
  });
}

// Manual pay-per-period — a plain one-time Checkout charge per billing
// period, not a recurring auto-charge (see backend's own comment on why:
// auto-charging would need a UPI Autopay/e-mandate, a separate regulated
// flow this app deliberately doesn't take on). tier: "GROWTH"|"ENTERPRISE"
// (business) or "PRO"|"ELITE" (worker); billingPeriod: "MONTHLY"|"YEARLY".
export function createSubscriptionCheckout({ tier, billingPeriod }) {
  return apiFetch("/api/payments/subscription-checkout", {
    method: "POST",
    body: { tier, billingPeriod },
  });
}

export function getSubscriptionStatus() {
  return apiFetch("/api/payments/subscription-status");
}
