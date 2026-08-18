import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { listProjects } from "../../lib/projectsApi";
import { PROJECT_STATUS_META } from "../../utils/projectStatus";
import { ApiError } from "../../lib/apiClient";

const TONE_CLASSES = {
  slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400",
  red: "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400",
};

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

// Every invite ever sent, and what happened to it — accepted, declined
// (CANCELLED), still pending, or further along the FSM. Reuses the same
// GET /api/projects an admin already gets an unfiltered view from (no
// ?role= means "everything" once the caller's role is admin — see
// projects.controller.js's listProjects).
export default function AdminInvitationsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    listProjects({ pageSize: 100 })
      .then(setItems)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load invitations."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
          Invitations
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Every invite sent on the platform, and what happened to it — accepted, declined, or still pending.
        </p>
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          No invitations have been sent yet.
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/70 overflow-hidden shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 px-3">
              <thead>
                <tr className="bg-[#F4F6FF] dark:bg-slate-800">
                  {["Business", "Worker", "Project", "Budget", "Status", "Sent", "Last Updated"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((project) => {
                  const meta = PROJECT_STATUS_META[project.status];
                  const badgeTone = TONE_CLASSES[meta?.tone] ?? TONE_CLASSES.slate;
                  return (
                    <tr key={project.id} className="bg-white/50 shadow-sm border border-white/60 rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/70 hover:shadow-md dark:bg-slate-900/50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                      <td className="px-5 py-4 rounded-l-xl text-sm font-semibold text-slate-800 dark:text-slate-200">{project.business_name}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{project.worker_name}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[220px] truncate">{project.title}</td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-slate-900 dark:text-white">{formatINR(project.budget)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${badgeTone}`}>
                          {meta?.label ?? project.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{formatDate(project.created_at)}</td>
                      <td className="px-5 py-4 rounded-r-xl text-xs text-slate-500 dark:text-slate-400">{formatDate(project.updated_at)}</td>
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
