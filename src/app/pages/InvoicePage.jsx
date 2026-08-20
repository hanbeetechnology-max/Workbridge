import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Clock, Download, Loader2, Lock, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getProject } from "../lib/projectsApi";
// Only renders once "Fund Escrow" is actually clicked (fundingOpen), never
// on initial page load — lazy-loaded rather than bundled into this route's
// own chunk.
const EscrowFundingDrawer = lazy(() => import("../components/business/EscrowFundingDrawer"));
import SuspenseFallback from "../components/common/SuspenseFallback";
import { PROJECT_STATUS_META } from "../utils/projectStatus";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { trackEvent } from "../lib/analytics";
import { ApiError } from "../lib/apiClient";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

const FUNDS_SECURED_STATUSES = new Set(["FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED", "PENDING_RELEASE", "COMPLETED"]);

export default function InvoicePage() {
  useDocumentTitle("Invoice — WorkBridge");
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("id");

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fundingOpen, setFundingOpen] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setLoadError("No project specified.");
      setLoading(false);
      return;
    }
    getProject(projectId)
      .then(setProject)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load this invoice."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-[#1B3FAB]" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 p-4">
        <div className="flex max-w-md items-start gap-2 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError || "Invoice not found."}</span>
        </div>
      </div>
    );
  }

  const isBusinessViewer = currentUser?.id === project.business_id;
  const isWorkerViewer = currentUser?.id === project.worker_id;
  // Funds can be secured (held in escrow) well before the worker is
  // actually paid — those are two different facts. isSettled only means
  // "money has left the business's side," so the reassurance block below
  // can use it; the "Paid" badge/stamp specifically means the worker has
  // been paid out, which only happens at COMPLETED.
  const isSettled = FUNDS_SECURED_STATUSES.has(project.status);
  const isPaid = project.status === "COMPLETED";
  const isPendingRelease = project.status === "PENDING_RELEASE";
  // round2 (paise precision), matching projects.controller.js's
  // completeProject exactly — the old Math.round (whole-rupee) here could
  // show a fee/net that didn't quite match the real ledger amount.
  const round2 = (n) => Math.round(n * 100) / 100;
  const budget = Number(project.budget);
  const feePct = Number(project.platform_fee_pct ?? 15);
  const platformFee = round2(budget * (feePct / 100));
  const workerReceives = round2(budget - platformFee);

  const handleOpenFunding = () => {
    if (project.status !== "ACCEPTED") return;
    trackEvent("SecureFundsClicked", { amount: budget, projectId: project.id });
    setFundingOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 py-10 px-4 sm:py-16 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-4xl">

        <button
          onClick={() => {
            // navigate(-1) is unreliable here — a deep link, a page reload,
            // or arriving from a notification can all leave browser history
            // with no real "previous page" (or the wrong one, e.g. the
            // marketing landing page from earlier in the tab's history). A
            // fixed, role-aware destination is deterministic regardless of
            // how this page was actually reached.
            if (currentUser?.role === "worker") navigate("/worker/wallet");
            // BusinessDashboard's tabs are local state, not URL routes — the
            // "/business" landing always opens on Overview, so that's the
            // most specific real destination available.
            else if (currentUser?.role === "business") navigate("/business");
            else navigate("/admin");
          }}
          className="mb-4 flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors hover:text-[#0F172A] dark:hover:text-white print:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Deliberately a fixed light "paper" document regardless of app
            theme — same always-light convention as a printed invoice, and
            this card already carries full print: styling for exactly that
            physical-document metaphor. Only the surrounding page chrome
            (background, Back button) adapts to dark mode. */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-double border-slate-200 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] print:border-0 print:shadow-none">

          {/* Official-document watermark — decorative only, sits behind
              every section via negative z-index, never intercepts clicks. */}
          <div
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <span className="font-display -rotate-12 whitespace-nowrap text-8xl font-black text-slate-900 opacity-[0.03] sm:text-9xl">
              WorkBridge
            </span>
          </div>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-10 print:flex-row print:items-start print:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF6B35]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-lg font-extrabold text-[#0F172A]">
                WorkBridge
              </span>
            </div>
            <div className="text-left sm:text-right print:text-right">
              <div className="flex items-center gap-2 sm:justify-end print:justify-end">
                <p className="font-serif text-3xl font-bold tracking-tight text-[#0F172A]">Invoice</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    isPaid ? "bg-emerald-50 text-emerald-700" : isSettled ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isPaid ? "Paid" : PROJECT_STATUS_META[project.status]?.label ?? project.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm text-slate-500">#{project.id.slice(0, 8).toUpperCase()}</p>
              <button
                onClick={() => window.print()}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 print:hidden"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          {/* ── Participant identity ──────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 border-b border-slate-100 p-6 sm:grid-cols-2 sm:p-10 print:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Bill To</p>
              <p className="font-serif text-lg font-bold tracking-tight text-[#0F172A]">{project.business_name}</p>
              <p className="mt-1 text-sm text-slate-500">Project: {project.title}</p>
            </div>
            <div className="sm:text-right print:text-right">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Provider</p>
              <p className="font-serif text-lg font-bold tracking-tight text-[#0F172A]">{project.worker_name}</p>
              {/* This is the WORK deadline, not a payment ETA — release is
                  instant the moment a business approves it (no real payment
                  gateway/settlement delay exists yet). Hidden once paid so
                  it can't read as "money still pending" on a finished,
                  already-paid invoice. */}
              {project.deadline && !isPaid && (
                <p className="mt-1 text-sm text-slate-500">
                  Delivery due: {new Date(project.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* ── Breakdown ──────────────────────────────────────────────── */}
          {/* Deliberately role-gated: a viewer only ever sees the one
              number that applies to them (what they pay, or what they
              receive), never both side by side — showing both would reveal
              the platform fee by subtraction. Admin/other viewers see the
              full picture. */}
          <div className="p-6 sm:p-10">
            <div className="overflow-hidden rounded-xl border border-slate-100">
              {(!isWorkerViewer || isBusinessViewer) && (
                <div className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
                  <span className="text-sm text-slate-600">Amount Paid</span>
                  <span className="whitespace-nowrap font-mono text-sm font-semibold text-slate-900">
                    {formatINR(budget)}
                  </span>
                </div>
              )}
              {(!isBusinessViewer || isWorkerViewer) && (
                <div className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
                  <span className="text-sm text-slate-600">You'll Receive</span>
                  <span className="whitespace-nowrap font-mono text-sm font-semibold text-slate-900">
                    {formatINR(workerReceives)}
                  </span>
                </div>
              )}
            </div>
            {/* mt-10 (not mt-2) — the PAID stamp below needs real clearance
                from the breakdown rows above it. It previously sat close
                enough (mt-2 + a small negative top offset) that print
                rendering — which computes font metrics/DPI slightly
                differently than screen — could push it into the breakdown
                above. More gap here is a real fix, not a tweak. */}
            <div className="relative mt-10 flex items-center justify-between gap-4 border-t-2 border-slate-900 pt-5">
              <span className="font-serif text-base font-bold tracking-tight text-[#0F172A]">
                {isWorkerViewer ? "Total Payout" : "Total Secured by Business"}
              </span>
              <span className="whitespace-nowrap font-mono text-2xl font-black tracking-tight text-[#0F172A] sm:text-3xl">
                {formatINR(isWorkerViewer ? workerReceives : budget)}
              </span>

              {isPaid && (
                <div
                  className="pointer-events-none absolute -top-3 right-0 z-10 -rotate-[13deg] mix-blend-multiply sm:-top-4 sm:right-8 print:-top-3 print:right-8"
                  aria-hidden="true"
                >
                  <div className="rounded-md border-[3px] border-emerald-600/80 px-2.5 py-1 sm:px-3 sm:py-1.5">
                    <div className="rounded border border-emerald-600/80 px-2 py-0.5">
                      <span className="font-display text-base font-black uppercase tracking-[0.3em] text-emerald-600/80 sm:text-xl">
                        Paid
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mx-6 mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 sm:mx-10 sm:mb-10 print:border-slate-200 print:bg-white">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#10B981]" />
            <p className="text-xs font-semibold leading-relaxed text-emerald-800">
              Funds held securely until work is approved.
            </p>
          </div>

          {/* ── Viewer-specific action area ──────────────────────────────
              Business (on an ACCEPTED project): actionable — secure funds.
              Worker / anyone else: read-only status. ── */}
          {isBusinessViewer && project.status === "ACCEPTED" && (
            <div className="border-t border-slate-100 bg-slate-50 p-6 sm:p-10 print:hidden">
              <button
                onClick={handleOpenFunding}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-4 text-base font-bold text-white shadow-[0_4px_14px_0_rgba(255,107,53,0.39)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e55a2b] hover:shadow-xl active:scale-[0.98]"
              >
                Pay {formatINR(budget)} &amp; Secure Funds
                <Zap className="h-5 w-5" />
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="h-3 w-3" />
                Every transfer is checked by WorkBridge staff before it counts as secured
              </p>
            </div>
          )}

          {isBusinessViewer && project.status === "PENDING_FUNDS" && (
            <div className="flex items-center gap-2.5 border-t border-slate-100 bg-amber-50 p-6 sm:p-10 print:hidden">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">
                Your transfer proof has been submitted — WorkBridge staff are verifying it now.
              </p>
            </div>
          )}

          {isBusinessViewer && project.status === "INVITED" && (
            <div className="border-t border-slate-100 bg-slate-50 p-6 text-center sm:p-10">
              <p className="text-sm font-semibold text-slate-500">Waiting for {project.worker_name} to accept this invitation.</p>
            </div>
          )}

          {(isSettled && (isBusinessViewer || isWorkerViewer)) && (
            <div className="border-t border-slate-100 bg-slate-50 p-6 sm:p-10">
              <div
                className={`flex items-center justify-center gap-3 rounded-xl border px-5 py-4 ${
                  isPendingRelease ? "border-amber-200/80 bg-amber-50/60" : "border-emerald-200/80 bg-emerald-50/60"
                }`}
              >
                <ShieldCheck className={`h-5 w-5 flex-shrink-0 ${isPendingRelease ? "text-amber-600" : "text-emerald-600"}`} />
                <div className="text-center">
                  <p className={`text-sm font-bold ${isPendingRelease ? "text-amber-800" : "text-emerald-800"}`}>
                    {isPaid ? "Payment Released" : isPendingRelease ? "Release Requested" : "Funds Secured"}
                  </p>
                  <p className={`text-xs ${isPendingRelease ? "text-amber-700" : "text-emerald-700"}`}>
                    {isPaid
                      ? `${formatINR(workerReceives)} was automatically released to ${project.worker_name}'s wallet — payment successfully cleared.`
                      : isPendingRelease
                        ? `${project.business_name} has requested this release — WorkBridge staff will pay ${project.worker_name} the secured funds shortly.`
                        : `${formatINR(budget)} is held securely by WorkBridge until work is approved.`}
                  </p>
                </div>
              </div>

              {/* Funds release and wallet credit are the same atomic
                  operation today (completeProject has no separate
                  settlement delay) — both rows share the one real
                  timestamp rather than inventing a fake gap between them. */}
              {isPaid && (() => {
                const releasedAt = project.timeline?.find((e) => e.status === "COMPLETED")?.at ?? project.updated_at;
                const formatted = releasedAt
                  ? new Date(releasedAt).toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
                  : "—";
                return (
                  <div className="mx-auto mt-4 max-w-sm space-y-2 border-t border-emerald-200/60 pt-4">
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="font-semibold text-emerald-700">Funds Released</span>
                      <span className="font-mono text-emerald-800">{formatted}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="font-semibold text-emerald-700">Credited to Worker Wallet</span>
                      <span className="font-mono text-emerald-800">{formatted}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Real activity timeline (project.timeline, not a fake audit log) ── */}
          {project.timeline?.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 p-6 sm:p-10 print:hidden">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Activity Timeline</p>
              <div className="space-y-4 border-l-2 border-slate-200 pl-4">
                {project.timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                    <p className="text-xs font-semibold text-slate-700">{PROJECT_STATUS_META[event.status]?.label ?? event.status}</p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(event.at).toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {fundingOpen && (
        <Suspense fallback={<SuspenseFallback fullScreen={false} />}>
          <EscrowFundingDrawer
            project={project}
            onClose={() => setFundingOpen(false)}
            onFunded={(updatedProject) => {
              setProject((prev) => ({ ...prev, ...updatedProject }));
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
