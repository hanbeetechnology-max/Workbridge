import { useState } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, Info, Lock, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Drawer, DrawerContent } from "../ui/drawer";
import { fundEscrow } from "../../lib/projectsApi";
import { ApiError } from "../../lib/apiClient";

const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;

// Real WorkBridge escrow bank account, once one exists — set to null here
// on purpose (not fabricated-but-realistic-looking placeholder digits,
// which reads exactly like a phishing page and risks real money going to
// a fake account). While this is null, the drawer shows an honest "not
// configured yet, use CashFree Checkout instead" state below rather than
// display fake account details as if they were real.
const ESCROW_ACCOUNT = null;
// Example of what to set once WorkBridge's real account exists:
// const ESCROW_ACCOUNT = { accountName: "Hanbee Technologies Private Limited", accountNumber: "...", ifsc: "...", upiId: "..." };

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail (permissions/insecure context) — no crash,
      // the value is still visible and selectable, just not auto-copied.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// Manual bank-transfer escrow funding — the real fix for ACCEPTED ->
// FUNDS_SECURED previously being an instant, unverified click (see
// fundEscrow in projects.controller.js). Submitting here does NOT secure
// funds itself; it only submits real proof (UTR + screenshot) for
// WorkBridge staff to verify from the Admin Panel's Escrow Funding tab —
// same human-in-the-loop shape as withdrawals. No fake timers: the loading
// state reflects the real request, not a simulated delay.
export default function EscrowFundingDrawer({ project, onClose, onFunded }) {
  const [utrReference, setUtrReference] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const open = Boolean(project);

  const reset = () => {
    setUtrReference("");
    setScreenshotUrl("");
    setScreenshotName("");
    setUploadError("");
    setSubmitError("");
    setSubmitted(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleFile = (file) => {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image (screenshot) file.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setUploadError("Screenshot is too large — please choose one under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result);
      setScreenshotName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!project || submitting) return;
    if (!utrReference.trim()) {
      setSubmitError("Enter the UPI or payment reference number from your transfer.");
      return;
    }
    if (!screenshotUrl) {
      setSubmitError("Upload a screenshot of your payment confirmation.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await fundEscrow(project.id, { utrReference: utrReference.trim(), screenshotUrl });
      setSubmitted(true);
      onFunded?.(result.project);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not submit for verification — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!project) return null;

  const budget = Number(project.budget) || 0;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      direction="right"
    >
      <DrawerContent className="w-full bg-white dark:bg-slate-900 sm:max-w-md">
        <div className="flex h-full flex-col">
          <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5">
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              Fund via Bank Transfer
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Direct bank transfer — no card or gateway fees added on top</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <Lock className="h-3 w-3" />
              Verified by Staff
            </span>
          </div>

          <div className="wb-scroll-clean flex-1 overflow-y-auto px-6 py-5">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">Submitted for verification</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  WorkBridge staff will confirm your transfer shortly — the project moves to Funds Secured once verified.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Amount to Fund</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">₹{budget.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {ESCROW_ACCOUNT ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="mb-1 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#FF6B35]" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">WorkBridge Secured Funds Account</p>
                    </div>
                    <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
                      Transfer the exact amount above from your business bank account.
                    </p>
                    <CopyField label="Account Name" value={ESCROW_ACCOUNT.accountName} />
                    <CopyField label="Account Number" value={ESCROW_ACCOUNT.accountNumber} />
                    <CopyField label="IFSC" value={ESCROW_ACCOUNT.ifsc} />
                    <CopyField label="UPI ID" value={ESCROW_ACCOUNT.upiId} />
                  </div>
                ) : (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Bank transfer details aren't set up yet — for instant, automatically verified funding, close
                      this and use <span className="font-semibold text-slate-700 dark:text-slate-300">Pay via CashFree</span> instead.
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Confirm Your Transfer</p>

                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    UPI / Payment Reference Number
                  </label>
                  <input
                    value={utrReference}
                    onChange={(e) => setUtrReference(e.target.value)}
                    placeholder="e.g. 402913847562 (shown in your UPI app after paying)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30"
                  />

                  <label className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Upload Payment Screenshot
                  </label>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-8 text-center transition hover:border-[#FF6B35] hover:bg-orange-50/40 dark:hover:bg-orange-500/10">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    {screenshotUrl ? (
                      <>
                        <img src={screenshotUrl} alt="Payment screenshot preview" className="max-h-28 rounded-lg object-contain" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{screenshotName}</p>
                        <span className="text-[11px] font-bold text-[#FF6B35]">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Drop a screenshot here, or click to browse</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">PNG or JPG, under 3MB</p>
                      </>
                    )}
                  </label>
                  {uploadError && <p className="mt-1.5 text-xs font-semibold text-red-500">{uploadError}</p>}
                </div>

                {submitError && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {!submitted && (
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-4 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting…" : "Submit for Admin Verification"}
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
