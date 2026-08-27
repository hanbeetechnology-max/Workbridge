const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptLoadingPromise = null;

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
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