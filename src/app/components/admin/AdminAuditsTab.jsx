import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { listPendingAudits, resolveAudit } from "../../lib/adminApi";

// The real queue behind a worker's "Skill Bridge Profile Audit" perk
// purchase (see WorkerTokenShop.jsx / perks.controller.js) — purchasing it
// IS the request, no separate submission step. Resolving it writes a real
// admin_note the worker sees on their own profile (WorkerProfile.jsx).
export default function AdminAuditsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resolvedIds, setResolvedIds] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [notes, setNotes] = useState({});

  useEffect(() => {
    listPendingAudits()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load audit requests."))
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id) => {
    const note = (notes[id] ?? "").trim();
    if (!note) {
      setActionError("Write a short note for the worker before resolving.");
      return;
    }
    setBusyId(id);
    setActionError("");
    try {
      await resolveAudit(id, { note });
      setResolvedIds((prev) => ({ ...prev, [id]: true }));
    } catch (err) {
      setActionError(err.message || "Could not resolve this audit request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Profile Audits
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {items.length} resume/portfolio audit{items.length === 1 ? "" : "s"} awaiting a written review.
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
          No audit requests waiting — every purchased review has been written up.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => {
            const resolved = resolvedIds[r.id];
            return (
              <div key={r.id} className="rounded-xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded bg-white/50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      {r.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-display mt-1.5 font-semibold text-slate-900 dark:text-white">
                      {r.worker_name}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {r.worker_title || "No title set"} · Requested{" "}
                      {new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 flex-shrink-0 text-violet-400" />
                </div>

                {resolved ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Review sent to the worker
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <textarea
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Write the resume/portfolio feedback the worker will see…"
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <button
                      onClick={() => handleResolve(r.id)}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60 dark:border-violet-900/40 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
                    >
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Mark Reviewed
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
