import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ShieldCheck, AlertTriangle, CheckCircle2, Receipt } from "lucide-react";
import { listTransactions } from "../../lib/adminApi";

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
