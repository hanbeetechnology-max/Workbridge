import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Banknote, CheckCircle2, Loader2, Receipt } from "lucide-react";
import { listPendingReleases } from "../../lib/adminApi";
import { completeProject } from "../../lib/projectsApi";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// The human-in-the-loop step behind "Approve & Release" — a business's
// click only requests a release (FILES_SUBMITTED -> PENDING_RELEASE, see
// requestRelease in projects.controller.js); nothing here is a mock queue,
// this is the one real action that actually moves money (PENDING_RELEASE ->
// COMPLETED via the same completeProject endpoint the business used to call
// directly, now admin-only).
export default function AdminFundReleasesTab() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [released, setReleased] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  // One deliberate extra click before a real, irreversible payout —
  // same pattern as AdminDisputesTab's refund/release confirm.
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    listPendingReleases()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load pending releases."))
      .finally(() => setLoading(false));
  }, []);

  const handleRelease = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await completeProject(id);
      setReleased((prev) => ({ ...prev, [id]: true }));
      setConfirmingId(null);
    } catch (err) {
      setActionError(err.message || "Could not release funds for this project.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Fund Releases
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {items.length} release{items.length === 1 ? "" : "s"} requested by a business, waiting on WorkBridge to pay the worker out of escrow.
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
          No releases waiting — every requested payout has been actioned.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => {
            const done = released[p.id];
            return (
              <div key={p.id} className="rounded-xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded bg-white/50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      {p.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-display mt-1.5 font-semibold text-slate-900 dark:text-white">
                      {p.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Requested {new Date(p.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-display text-2xl font-semibold text-[#0A1128] dark:text-white">
                      {formatINR(p.budget)}
                    </div>
                    <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Held in Escrow</div>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Worker:</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.worker_name}</span>
                  </div>
                  <span className="text-slate-200 dark:text-slate-700">·</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Business:</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.business_name}</span>
                  </div>
                </div>

                {done ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Released to {p.worker_name}
                  </div>
                ) : confirmingId === p.id ? (
                  <div className="mt-4 space-y-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                      Confirm: release {formatINR(p.budget)} to {p.worker_name} — this moves real money and can't be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRelease(p.id)}
                        disabled={busyId === p.id}
                        className="flex items-center gap-1.5 rounded-lg bg-[#FF6B35] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#e85a28] disabled:opacity-60"
                      >
                        {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                        Confirm Release
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={busyId === p.id}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate(`/invoice?id=${p.id}`)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/70 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      View Invoice
                    </button>
                    <button
                      onClick={() => setConfirmingId(p.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      Release Funds to Worker
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
