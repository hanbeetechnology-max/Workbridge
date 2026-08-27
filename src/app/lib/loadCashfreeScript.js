const CHECKOUT_SCRIPT_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";

let scriptLoadingPromise = null;

export function loadCashfreeScript() {
  if (window.Cashfree) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = resolve;
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("Could not load the payment gateway — check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return scriptLoadingPromise;
}

// TEST... App IDs are Cashfree's own sandbox prefix (see backend's
// cashfree.service.js mustGetConfig) — the frontend doesn't have the App
// ID at all (only the backend does), so this reads Vite's own build-mode
// flag instead. Set VITE_CASHFREE_MODE=production once live keys are
// active in Render's env.
export function getCashfreeMode() {
  return import.meta.env.VITE_CASHFREE_MODE === "production" ? "production" : "sandbox";
}
