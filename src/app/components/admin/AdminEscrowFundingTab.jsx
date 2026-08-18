import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { listPendingEscrowFunding, resolveEscrowFunding } from "../../lib/adminApi";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// The real verification queue behind a business's "Fund Escrow" submission
// (see EscrowFundingDrawer.jsx / fundEscrow in projects.controller.js) — the
// project is already sitting in PENDING_FUNDS, but no FUNDS_SECURED ledger
// row exists yet. "Verify & Secure Funds" writes that real row; "Reject"
// sends the project back to ACCEPTED so the business can resubmit with a
// corrected transfer — nothing here is decorative, both hit the same
// resolveEscrowFunding endpoint.
export default function AdminEscrowFundingTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resolved, setResolved] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    listPendingEscrowFunding()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load escrow funding requests."))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await resolveEscrowFunding(id, { approved: true });
      setResolved((prev) => ({ ...prev, [id]: "APPROVED" }));
    } catch (err) {
      setActionError(err.message || "Could not verify this transfer.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await resolveEscrowFunding(id, { approved: false, note: rejectNote.trim() || undefined });
      setResolved((prev) => ({ ...prev, [id]: "REJECTED" }));
      setRejectingId(null);
      setRejectNote("");
    } catch (err) {
      setActionError(err.message || "Could not reject this request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Escrow Funding
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {items.length} transfer{items.length === 1 ? "" : "s"} awaiting verification — projects stay in Pending Funds until confirmed.
        </p>
      </div>

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35] dark:border-slate-700" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          No escrow funding requests waiting — every submitted transfer has been verified or rejected.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => {
            const outcome = resolved[r.id];
            const isRejecting = rejectingId === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded bg-white/50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      {r.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-display mt-1.5 font-semibold text-slate-900 dark:text-white">
                      {r.project_title}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {r.business_name} · Submitted{" "}
                      {new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-display text-2xl font-semibold text-[#0A1128] dark:text-white">
                      {formatINR(r.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Awaiting Verification</div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200">UTR / Transaction ID:</span> {r.utr_reference}
                  </div>
                  <a
                    href={r.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#1B3FAB] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
                  >
                    View payment screenshot
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  </a>
                </div>

                {outcome ? (
                  <div className={`flex items-center gap-2 text-sm font-semibold ${outcome === "APPROVED" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {outcome === "APPROVED" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {outcome === "APPROVED" ? "Verified — funds secured" : "Rejected — project reverted to Accepted"}
                  </div>
                ) : isRejecting ? (
                  <div className="space-y-2.5">
                    <input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason (e.g. UTR doesn't match) — the business can see this"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-red-900/40"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                      >
                        {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setRejectingId(r.id)}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(r.id)}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      Verify &amp; Secure Funds
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
