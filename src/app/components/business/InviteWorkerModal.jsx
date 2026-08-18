import { useState } from "react";
import { AlertCircle, Loader2, Send, X } from "lucide-react";

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800";

// Unified invite entry point — a business either sends this worker to one of
// their OWN already-public OPEN job board posts (creates a real
// job_candidates row, source=INVITE — the post stays live on the public feed
// in case the worker declines, see job_candidates.controller.js) or drafts a
// brand-new private project on the spot (creates a real project via
// createProject). Two genuinely different backend calls behind one toggle.
// Shared between BusinessWorkers.jsx's "Invite" action and BusinessProjects.jsx's
// "Rehire" action — rehiring is the same real decision (assign to an existing
// open post, or draft a new one) as inviting, just starting from a worker
// you've already worked with instead of the talent directory.
export default function InviteWorkerModal({ worker, openJobs, onClose, onSubmitExisting, onSubmitNew, submitting, error, title: heading }) {
  const [mode, setMode] = useState(openJobs.length > 0 ? "existing" : "new");
  const [selectedProjectId, setSelectedProjectId] = useState(openJobs[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [referenceLink, setReferenceLink] = useState("");

  const canSubmit = mode === "existing" ? Boolean(selectedProjectId) : Boolean(title.trim() && budget);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (mode === "existing") {
      onSubmitExisting(selectedProjectId, message);
    } else {
      onSubmitNew({ title, description, budget, deadline, referenceLinks: referenceLink.trim() ? [referenceLink.trim()] : [] });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200/60 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/95"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{heading ?? `Invite ${worker.name}`}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                mode === "existing" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Select Existing Project
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                mode === "new" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Draft New Project
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === "existing" ? (
            openJobs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You don't have any open job posts right now. Switch to "Draft New Project" above, or post a job first and
                come back to invite {worker.name} to it directly while it's still open.
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Which open job?</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {openJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} — ₹{Number(job.budget).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Note (optional)</span>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Why you think they'd be a great fit for this one"
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </label>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  The job post stays live on the public feed in case {worker.name} says no — it only comes down once someone
                  actually accepts.
                </p>
              </>
            )
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Job Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Landing page redesign"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., I need a 5-page Figma wireframe for a real estate app, including a homepage, listings grid, and contact form."
                  className={`${INPUT_CLASS} resize-none`}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Budget (₹)</span>
                  <input
                    type="number"
                    min="1"
                    max="5000000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="15000"
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Deadline</span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Reference Link (optional)</span>
                <input
                  type="url"
                  value={referenceLink}
                  onChange={(e) => setReferenceLink(e.target.value)}
                  placeholder="https://drive.google.com/… or a video/doc link for context"
                  className={INPUT_CLASS}
                />
                <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">
                  Sent for a quick WorkBridge review before {worker.name} can see it.
                </span>
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:bg-[#E55E1F] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Sending…" : "Send Invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}
