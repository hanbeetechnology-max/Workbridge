import { useState, useEffect } from "react";
import { AlertCircle, Banknote, CheckCircle2, Loader2, Zap, XCircle } from "lucide-react";
import { listPendingWithdrawals, resolveWithdrawal } from "../../lib/adminApi";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// The real cash-out queue behind a worker's "Withdraw Funds" click — their
// wallet_balance is already debited by the time a request lands here (see
// wallet.controller.js's withdraw), but no actual UPI/bank transfer has
// happened. "Mark as Paid" writes the real transactions.WITHDRAWAL row;
// "Reject & Refund" puts the money back in their wallet — nothing here is
// decorative, both buttons hit the same resolveWithdrawal endpoint.
export default function AdminWithdrawalsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resolved, setResolved] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    listPendingWithdrawals()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load withdrawal requests."))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await resolveWithdrawal(id, { approved: true });
      setResolved((prev) => ({ ...prev, [id]: "APPROVED" }));
    } catch (err) {
      setActionError(err.message || "Could not mark this withdrawal as paid.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await resolveWithdrawal(id, { approved: false, note: rejectNote.trim() || undefined });
      setResolved((prev) => ({ ...prev, [id]: "REJECTED" }));
      setRejectingId(null);
      setRejectNote("");
    } catch (err) {
      setActionError(err.message || "Could not reject this withdrawal.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Withdrawals
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {items.length} cash-out request{items.length === 1 ? "" : "s"} — wallet balance already debited, waiting on a real UPI/bank transfer.
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
          No withdrawal requests waiting — every request has been paid or rejected.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((w) => {
            const outcome = resolved[w.id];
            const isRejecting = rejectingId === w.id;
            return (
              <div key={w.id} className="rounded-xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded bg-white/50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      {w.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-display mt-1.5 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                      {w.worker_name}
                      {w.has_fast_track && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                          <Zap className="h-3 w-3" />
                          Fast-Tracked
                        </span>
                      )}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Requested {new Date(w.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-display text-2xl font-semibold text-[#0A1128] dark:text-white">
                      {formatINR(w.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Debited, Awaiting Transfer</div>
                  </div>
                </div>

                <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{w.payout_method === "UPI" ? "UPI" : "Bank Transfer"}:</span> {w.payout_details}
                </div>

                {outcome ? (
                  <div className={`flex items-center gap-2 text-sm font-semibold ${outcome === "APPROVED" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {outcome === "APPROVED" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {outcome === "APPROVED" ? "Marked as paid" : "Rejected — refunded to worker's wallet"}
                  </div>
                ) : isRejecting ? (
                  <div className="space-y-2.5">
                    <input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason (e.g. invalid UPI ID) — shown to the worker"
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
                        onClick={() => handleReject(w.id)}
                        disabled={busyId === w.id}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                      >
                        {busyId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Confirm Rejection &amp; Refund
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setRejectingId(w.id)}
                      disabled={busyId === w.id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject &amp; Refund
                    </button>
                    <button
                      onClick={() => handleApprove(w.id)}
                      disabled={busyId === w.id}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                      {busyId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                      Mark as Paid
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
