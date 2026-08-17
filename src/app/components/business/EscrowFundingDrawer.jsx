import { useState } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, Lock, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Drawer, DrawerContent } from "../ui/drawer";
import { fundEscrow } from "../../lib/projectsApi";
import { ApiError } from "../../lib/apiClient";

const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;

// ⚠️ PLACEHOLDER — these are NOT real account details. Replace every value
// below with WorkBridge's actual escrow bank account before any business
// relies on this screen. Shipping fabricated-but-realistic-looking account
// numbers here risks a real business wiring real money to a wrong or
// non-existent account — this constant exists so there's exactly one place
// to fix that, and the on-screen warning below makes it visible to anyone
// testing this flow that it isn't live yet.
const ESCROW_ACCOUNT = {
  accountName: "PLACEHOLDER — not a real account",
  accountNumber: "0000000000",
  ifsc: "PLACEHOLDER0000",
  upiId: "placeholder@workbridge",
};

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
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
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
      setSubmitError("Enter the transaction ID / UTR number from your transfer.");
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
      <DrawerContent className="w-full bg-white sm:max-w-md">
        <div className="flex h-full flex-col">
          <div className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-5">
            <h2 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Fund Escrow &amp; Start Project
            </h2>
            <p className="mt-1 text-sm text-slate-500">Direct bank transfer — no card or gateway fees added on top</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <Lock className="h-3 w-3" />
              Verified by Staff
            </span>
          </div>

          <div className="wb-scroll-clean flex-1 overflow-y-auto px-6 py-5">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="text-base font-bold text-emerald-800">Submitted for verification</p>
                <p className="text-sm text-emerald-700">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Amount to Fund</span>
                    <span className="text-lg font-extrabold text-slate-900">₹{budget.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-slate-900 p-5 text-white shadow-lg">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#FF6B35]" />
                    <p className="text-sm font-bold">WorkBridge Official Escrow Account</p>
                  </div>
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-4 text-amber-200">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    Placeholder account details — WorkBridge staff must replace these with the real escrow
                    account before this is used for a real transfer.
                  </div>
                  <CopyField label="Account Name" value={ESCROW_ACCOUNT.accountName} />
                  <CopyField label="Account Number" value={ESCROW_ACCOUNT.accountNumber} />
                  <CopyField label="IFSC" value={ESCROW_ACCOUNT.ifsc} />
                  <CopyField label="UPI ID" value={ESCROW_ACCOUNT.upiId} />
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-slate-800">Confirm Your Transfer</p>

                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Transaction ID / UTR Number
                  </label>
                  <input
                    value={utrReference}
                    onChange={(e) => setUtrReference(e.target.value)}
                    placeholder="e.g. 402913847562"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30"
                  />

                  <label className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Upload Payment Screenshot
                  </label>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-[#FF6B35] hover:bg-orange-50/40">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    {screenshotUrl ? (
                      <>
                        <img src={screenshotUrl} alt="Payment screenshot preview" className="max-h-28 rounded-lg object-contain" />
                        <p className="text-xs font-semibold text-slate-600">{screenshotName}</p>
                        <span className="text-[11px] font-bold text-[#FF6B35]">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-500">Drop a screenshot here, or click to browse</p>
                        <p className="text-[11px] text-slate-400">PNG or JPG, under 3MB</p>
                      </>
                    )}
                  </label>
                  {uploadError && <p className="mt-1.5 text-xs font-semibold text-red-500">{uploadError}</p>}
                </div>

                {submitError && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {!submitted && (
            <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-4 text-sm font-bold text-white shadow-md transition-transform hover:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
