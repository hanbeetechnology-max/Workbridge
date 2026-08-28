import { useState } from "react";
import { AlertTriangle, CornerUpLeft, Loader2, MessageSquareWarning } from "lucide-react";
import { submitDisputeRebuttal } from "../../lib/projectsApi";
import { ApiError } from "../../lib/apiClient";
import ImageLightbox from "./ImageLightbox";
import DisputeEvidenceUpload from "./DisputeEvidenceUpload";

function EvidenceThumbs({ items, onPreview }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onPreview(item.dataUrl)}
          className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 transition hover:opacity-90 dark:border-slate-700"
        >
          <img src={item.dataUrl} alt="Evidence" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

// Shown on both WorkerWorkspace.jsx and BusinessProjects.jsx once a
// project is DISPUTED — the fairness fix: previously the reason only ever
// showed up in the Admin Panel, so whoever got accused had no idea why
// their project froze, and no structured way to respond before an admin
// decided. This is that visibility + the one-shot rebuttal, self-contained
// so both call sites get identical behavior instead of two hand-rolled
// copies drifting apart.
export default function DisputeStatusCard({ project, currentUserId, onUpdated }) {
  const [previewSrc, setPreviewSrc] = useState(null);
  const [rebuttalOpen, setRebuttalOpen] = useState(false);
  const [statement, setStatement] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (project.status !== "DISPUTED" && !project.disputed_at) return null;
  if (!project.dispute_reason) return null; // pre-existing disputed rows from before this feature — nothing to show

  const raiserIsWorker = project.dispute_raised_by === project.worker_id;
  const raiserName = raiserIsWorker ? project.worker_name : project.business_name;
  const isAccused = project.dispute_raised_by !== currentUserId && (project.worker_id === currentUserId || project.business_id === currentUserId);
  const canRebut = project.status === "DISPUTED" && isAccused && !project.dispute_rebuttal_by;
  const rebutterIsWorker = project.dispute_rebuttal_by === project.worker_id;
  const rebutterName = rebutterIsWorker ? project.worker_name : project.business_name;

  const handleSubmit = async () => {
    if (!statement.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const updated = await submitDisputeRebuttal(project.id, statement.trim(), evidence);
      onUpdated?.(updated);
      setRebuttalOpen(false);
      setStatement("");
      setEvidence([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              {project.status === "DISPUTED" ? "This project is disputed — WorkBridge is reviewing it." : "This project was disputed."}
            </p>
            <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">
              <span className="font-semibold">{raiserName ?? "Someone"}:</span> "{project.dispute_reason}"
            </p>
            <EvidenceThumbs items={project.dispute_evidence} onPreview={setPreviewSrc} />
          </div>
        </div>
      </div>

      {project.dispute_rebuttal && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <MessageSquareWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Response from {rebutterName ?? "the other side"}</p>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">"{project.dispute_rebuttal}"</p>
              <EvidenceThumbs items={project.dispute_rebuttal_evidence} onPreview={setPreviewSrc} />
            </div>
          </div>
        </div>
      )}

      {canRebut && !rebuttalOpen && (
        <button
          type="button"
          onClick={() => setRebuttalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#1B3FAB] hover:underline dark:text-blue-400"
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
          Respond to this dispute
        </button>
      )}

      {canRebut && rebuttalOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Your response</p>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Explain your side — WorkBridge staff will weigh both before deciding."
            disabled={submitting}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
          <div className="mt-3">
            <DisputeEvidenceUpload items={evidence} onChange={setEvidence} disabled={submitting} />
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-red-500 dark:text-red-400">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { setRebuttalOpen(false); setError(""); }}
              disabled={submitting}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !statement.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1B3FAB] py-2.5 text-sm font-bold text-white transition hover:bg-[#16327A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Response"}
            </button>
          </div>
        </div>
      )}

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </div>
  );
}
