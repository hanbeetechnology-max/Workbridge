import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ShieldCheck, AlertTriangle, CheckCircle2, Receipt, Landmark, Loader2 } from "lucide-react";
import { listTransactions, listManualPayouts, completeManualPayout } from "../../lib/adminApi";

const STATUS_STYLE = {
  secured: { label: "Secured", icon: ShieldCheck, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-900/40" },
  disputed: { label: "Disputed", icon: AlertTriangle, className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40" },
  released: { label: "Released", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40" },
};

// Every project.status this endpoint can return maps to one of the three
// invoice-lifecycle badges above — WORK_IN_PROGRESS/FILES_SUBMITTED are
// still "secured" from an accounting standpoint (funds held, not released).
const STATUS_KEY = {
  FUNDS_SECURED: "secured",
  WORK_IN_PROGRESS: "secured",
  FILES_SUBMITTED: "secured",
  DISPUTED: "disputed",
  COMPLETED: "released",
};

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

// "Who do I owe money to" — every PAYOUT that fell back to an in-app
// wallet credit because Cashfree Payouts was unavailable/failed at
// completion time, still needing a manual NEFT/RTGS transfer. Sits above
// the main invoice table since it's the one thing here that's actually
// actionable, not just a historical record.
function ManualPayoutsQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  const load = () => {
    listManualPayouts()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load pending manual payouts."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleComplete = async (id) => {
    setBusyId(id);
    try {
      await completeManualPayout(id, notes[id]?.trim() || undefined);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setLoadError(err.message || "Could not mark this payout complete.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading || loadError || items.length === 0) {
    return loadError ? (
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{loadError}</span>
      </div>
    ) : null;
  }

  return (
    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="mb-4 flex items-center gap-2">
        <Landmark className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <h2 className="font-display text-sm font-extrabold text-amber-800 dark:text-amber-300">
          Pending Manual Payouts — {items.length} worker{items.length === 1 ? "" : "s"} owed a real bank transfer
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="flex flex-col gap-3 rounded-lg border border-amber-200/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/30 dark:bg-slate-900">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {it.worker_name} <span className="font-normal text-slate-400">— {formatINR(it.amount)}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {it.project_title ?? "Withdrawal"} {it.business_name ? `· ${it.business_name}` : ""} · {formatDate(it.created_at)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {it.payout_method ?? "No payout method saved"}{it.payout_details ? `: ${it.payout_details}` : ""}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <input
                value={notes[it.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [it.id]: e.target.value }))}
                placeholder="UTR / reference (optional)"
                className="w-40 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                onClick={() => handleComplete(it.id)}
                disabled={busyId === it.id}
                className="flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark Paid"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminTransactionsTab() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    listTransactions()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load transactions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[#0A1128] dark:text-white">
            Transaction History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Every invoice on the platform — the legal trail for dispute resolution and audits.
          </p>
        </div>
      </div>

      <ManualPayoutsQueue />
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35] dark:border-slate-700" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          No transactions yet.
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/70 overflow-hidden shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 px-3">
              <thead>
                <tr className="bg-[#F4F6FF] dark:bg-slate-800">
                  {["Invoice", "Business", "Worker", "Project", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((project) => {
                  const status = STATUS_STYLE[STATUS_KEY[project.status] ?? "secured"];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={project.id} className="bg-white/50 shadow-sm border border-white/60 rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/70 hover:shadow-md dark:bg-slate-900/50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                      <td className="px-5 py-4 rounded-l-xl">
                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">INV-{project.id.slice(0, 8).toUpperCase()}</span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(project.updated_at)}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{project.business_name}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{project.worker_name}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[220px] truncate">{project.title}</td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-slate-900 dark:text-white">{formatINR(project.budget)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 rounded-r-xl">
                        <button
                          onClick={() => navigate(`/invoice?id=${project.id}`)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white/50 border border-white/60 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 transition-colors w-fit dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          View Invoice
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
