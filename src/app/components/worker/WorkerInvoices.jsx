import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, FileText, Loader2 } from "lucide-react";
import { listProjects } from "../../lib/projectsApi";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/apiClient";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// round2 matches the exact payout math projects.controller.js's
// completeProject uses — InvoicePage.jsx (linked from here) uses the same
// formula, so the net shown in this list always matches what's on the
// actual invoice, to the paisa.
function round2(n) {
  return Math.round(n * 100) / 100;
}

// The entry point into the already-existing InvoicePage.jsx
// (/invoice?id=<projectId>) — that page already renders the full
// transaction breakdown + print/PDF export; this is just the list of a
// worker's own completed projects that link into it, since nothing
// worker-facing pointed there before.
export default function WorkerInvoices() {
  useDocumentTitle("Invoices — WorkBridge");
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listProjects({ role: "worker", status: "COMPLETED" })
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your invoices.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-xl font-extrabold text-[#0A1128] dark:text-white">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your earnings statements for every completed project.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <FileText className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No completed projects yet — invoices show up here once one is paid out.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((project) => {
            const budget = Number(project.budget);
            const fee = round2(budget * (Number(project.platform_fee_pct ?? 15) / 100));
            const net = round2(budget - fee);
            return (
              <button
                key={project.id}
                onClick={() => navigate(`/invoice?id=${project.id}`)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0A1128] dark:text-white">{project.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{project.business_name}</p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Completed{" "}
                    {new Date(project.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-[#0A1128] dark:text-white">{formatINR(net)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
