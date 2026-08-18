import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { listVerifications, reviewVerification } from "../../lib/adminApi";
import { getInitials } from "../../utils/formValidation";
import { ApiError } from "../../lib/apiClient";

export default function AdminVerificationsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("All");
  const [decided, setDecided] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmingRejectId, setConfirmingRejectId] = useState(null);

  useEffect(() => {
    listVerifications()
      .then(setItems)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load the verification queue."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Freelancers") return item.role === "worker";
    return item.role === "business";
  });

  const handleDecision = async (id, approved) => {
    setBusyId(id);
    setActionError("");
    try {
      await reviewVerification(id, approved);
      setDecided((prev) => ({ ...prev, [id]: approved ? "approved" : "rejected" }));
      setConfirmingRejectId(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not record this decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">Verification Center</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{items.length} account{items.length === 1 ? "" : "s"} awaiting verification</p>
        </div>
        <div className="flex gap-2">
          {["All", "Freelancers", "Businesses"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white/50 backdrop-blur-sm border border-white/60 text-slate-600 hover:bg-white/70 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35] dark:border-slate-700" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          Nothing waiting for verification.
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/70 overflow-hidden shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/40 border-b border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
                  {["Name", "Role", "Title", "Phone", "Requested", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {getInitials(item.name)}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.role === "worker" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"}`}>
                        {item.role === "worker" ? "Freelancer" : "Business"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.title || "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.phone ? `+91 ${item.phone}` : "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      {decided[item.id] ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${decided[item.id] === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                          {decided[item.id] === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </span>
                      ) : confirmingRejectId === item.id ? (
                        // Rejecting locks this account out of verification —
                        // one intentional extra click so a fat-finger next to
                        // "Approve" can't silently reject someone.
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reject this account?</span>
                          <button
                            onClick={() => handleDecision(item.id, false)}
                            disabled={busyId === item.id}
                            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingRejectId(null)}
                            disabled={busyId === item.id}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecision(item.id, true)}
                            disabled={busyId === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => setConfirmingRejectId(item.id)}
                            disabled={busyId === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
