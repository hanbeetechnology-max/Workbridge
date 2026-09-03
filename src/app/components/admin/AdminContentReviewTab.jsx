import { useEffect, useState } from "react";
import { AlertCircle, Ban, CheckCircle2, Clock3, ExternalLink, Image as ImageIcon, Link2, Loader2, XCircle } from "lucide-react";
import { listPendingSubmissions, listReviewedSubmissions, listCancelledSubmissions, reviewSubmission } from "../../lib/submissionsApi";
import { ApiError } from "../../lib/apiClient";
import ImageLightbox from "../shared/ImageLightbox";
import brandLogo from "../../assets/logo.png";

function detectProvider(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("drive.google")) return "Google Drive";
    if (host.includes("dropbox")) return "Dropbox";
    if (host.includes("onedrive") || host.includes("1drv")) return "OneDrive";
    if (host.includes("wetransfer")) return "WeTransfer";
    return host;
  } catch {
    return "Link";
  }
}

// A link back to WorkBridge itself gets our own mark instead of the generic
// link glyph — every other host keeps the plain Link2 icon.
function isInternalLink(url) {
  return url.toLowerCase().includes("workbridge");
}

function SubmissionThumb({ item, onPreview }) {
  return item.type === "link" ? (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1B3FAB] dark:bg-blue-500/10 dark:text-blue-400">
      {isInternalLink(item.url) ? (
        <img src={brandLogo} alt="WorkBridge" className="h-5 w-5 object-contain" />
      ) : (
        <Link2 className="h-5 w-5" />
      )}
    </div>
  ) : (
    <button
      type="button"
      onClick={() => onPreview(item.image_data)}
      aria-label="View full image"
      className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/40"
    >
      <img src={item.image_data} alt={item.caption ?? "Submitted image"} className="h-full w-full object-cover" />
    </button>
  );
}

function SubmissionDetails({ item }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-800 dark:text-white text-sm">{item.project_title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submitted by {item.submitted_by_name}</p>
      {item.type === "link" ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#1B3FAB] dark:text-blue-400 hover:underline"
        >
          {detectProvider(item.url)}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ImageIcon className="h-3 w-3" />
          Image
        </span>
      )}
      {item.caption && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">"{item.caption}"</p>}
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        {new Date(item.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  );
}

// The Trust Checker's moderation queue — every link/image either side of a
// project submits lands here first; nothing reaches the counterparty until
// an admin approves it (or a real reason is recorded for rejecting it).
export default function AdminContentReviewTab() {
  // "pending" used to be the only view — once an item was decided it just
  // vanished with no way to confirm what actually happened to it. "reviewed"
  // is a real, persisted history pulled from the backend (not a local-only
  // badge that disappears the moment you refresh or leave the tab).
  const [viewMode, setViewMode] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);

  const load = () => {
    setLoading(true);
    setLoadError("");
    const fetcher =
      viewMode === "pending" ? listPendingSubmissions : viewMode === "cancelled" ? listCancelledSubmissions : listReviewedSubmissions;
    fetcher()
      .then(setItems)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load this list."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [viewMode]);

  const handleApprove = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await reviewSubmission(id, { approved: true });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not approve this submission.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await reviewSubmission(id, { approved: false, rejectionReason: rejectionReason.trim() || undefined });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setRejectingId(null);
      setRejectionReason("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not reject this submission.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
            Content Review
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {viewMode === "pending"
              ? `${items.length} submission${items.length === 1 ? "" : "s"} awaiting review — nothing reaches the other side until approved here.`
              : viewMode === "cancelled"
                ? `${items.length} submission${items.length === 1 ? "" : "s"} left unreviewed because the project was cancelled — nothing to action.`
                : `${items.length} submission${items.length === 1 ? "" : "s"} already decided.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {[
              { id: "pending", label: "Pending" },
              { id: "reviewed", label: "Reviewed" },
              { id: "cancelled", label: "Cancelled" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-white/50 border border-white/60 text-slate-600 rounded-xl text-sm font-semibold hover:bg-white/70 transition-colors dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70"
          >
            Refresh
          </button>
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          {viewMode === "pending"
            ? "Nothing waiting for review."
            : viewMode === "cancelled"
              ? "No unreviewed submissions on cancelled projects."
              : "Nothing has been reviewed yet."}
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/70 overflow-hidden shadow-lg shadow-slate-200/40 dark:bg-slate-900/60 dark:border-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <SubmissionThumb item={item} onPreview={setPreviewSrc} />
                    <SubmissionDetails item={item} />
                  </div>

                  <div className="flex-shrink-0">
                    {viewMode === "reviewed" ? (
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {item.status === "APPROVED" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {item.status === "APPROVED" ? "Approved" : "Rejected"}
                        </span>
                        {item.reviewed_at && (
                          <p className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                            <Clock3 className="h-3 w-3" />
                            {new Date(item.reviewed_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        )}
                        {item.rejection_reason && (
                          <p className="mt-1 max-w-[220px] text-[11px] text-red-500 dark:text-red-400">Reason: {item.rejection_reason}</p>
                        )}
                      </div>
                    ) : viewMode === "cancelled" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Ban className="h-3 w-3" />
                        Project Cancelled
                      </span>
                    ) : rejectingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-red-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-900/60"
                        />
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={busyId === item.id}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {busyId === item.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={busyId === item.id}
                          className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                          title="Approve"
                        >
                          {busyId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setRejectingId(item.id)}
                          disabled={busyId === item.id}
                          className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </div>
  );
}
