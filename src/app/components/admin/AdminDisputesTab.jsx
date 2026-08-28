import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowUpRight, CheckCircle2, Loader2, Receipt, Scale, Zap } from "lucide-react";
import { listDisputes, resolveDispute } from "../../lib/adminApi";
import { PROJECT_STATUS_META } from "../../utils/projectStatus";
import ImageLightbox from "../shared/ImageLightbox";
import { getSocket } from "../../lib/socketClient";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function EvidenceRow({ label, items, onPreview }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}:</span>
      <div className="flex gap-1.5">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onPreview(item.dataUrl)}
            className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 transition hover:opacity-80 dark:border-slate-700"
          >
            <img src={item.dataUrl} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminDisputesTab() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resolved, setResolved] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  // Confirming a real, irreversible money movement — { id, resolution } —
  // same "one extra deliberate click" shape as AdminVerificationsTab's
  // reject-confirm, just for both actions here since both move real money.
  const [confirming, setConfirming] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [splitWorkerAmount, setSplitWorkerAmount] = useState("");
  const [splitBusinessAmount, setSplitBusinessAmount] = useState("");
  const [previewSrc, setPreviewSrc] = useState(null);

  const load = () => {
    listDisputes()
      .then(setItems)
      .catch((err) => setLoadError(err.message || "Could not load disputes."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Live refresh while this tab is open — the out-of-band alert (email to
  // every admin) is what covers "nobody has the panel open right now" (see
  // events.js's emitDisputeRaised); this is just the same live-badge
  // pattern AdminSupportTab.jsx already uses so a new dispute shows up
  // without a manual refresh if staff happen to already be here.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const handleEvent = (event) => {
      if (event.type === "DISPUTE_RAISED") load();
    };
    socket.on("project:event", handleEvent);
    return () => socket.off("project:event", handleEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (id, resolution) => {
    if (resolution === "split" && !(Number(splitWorkerAmount) > 0 || Number(splitBusinessAmount) > 0)) {
      setActionError("Enter at least one amount greater than 0 for a split resolution.");
      return;
    }
    setBusyId(id);
    setActionError("");
    try {
      await resolveDispute(
        id,
        resolution,
        resolutionNote.trim() || undefined,
        resolution === "split" ? Number(splitWorkerAmount) || 0 : undefined,
        resolution === "split" ? Number(splitBusinessAmount) || 0 : undefined
      );
      setResolved((prev) => ({ ...prev, [id]: resolution }));
      setConfirming(null);
      setResolutionNote("");
      setSplitWorkerAmount("");
      setSplitBusinessAmount("");
    } catch (err) {
      setActionError(err.message || "Could not resolve this dispute.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">Dispute Resolution</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{items.length} active dispute{items.length === 1 ? "" : "s"} — funds frozen until resolved</p>
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
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          No active disputes.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => {
            const decision = resolved[d.id];
            return (
              <div key={d.id} className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/70 p-5 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                      {d.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-display mt-1.5 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                      {d.title}
                      {d.has_fast_track && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                          <Zap className="h-3 w-3" />
                          Fast-Tracked
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      {d.dispute_reason ? (
                        <>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {d.dispute_raised_by_role === "worker" ? d.worker_name : d.dispute_raised_by_role === "business" ? d.business_name : "Someone"}:
                          </span>{" "}
                          "{d.dispute_reason}"
                        </>
                      ) : (
                        "No reason recorded — review the activity timeline below."
                      )}
                    </p>
                    <EvidenceRow label="Evidence" items={d.dispute_evidence} onPreview={setPreviewSrc} />
                    {d.dispute_rebuttal && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Response from {d.dispute_rebuttal_by === d.worker_id ? d.worker_name : d.business_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">"{d.dispute_rebuttal}"</p>
                        <EvidenceRow label="Evidence" items={d.dispute_rebuttal_evidence} onPreview={setPreviewSrc} />
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-2xl font-semibold text-rose-600 dark:text-rose-400">
                      {formatINR(d.budget)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">In Dispute</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm mb-4 flex-wrap">
                  <div className="flex items-center gap-1.5"><span className="text-slate-400 dark:text-slate-500 text-xs">Worker:</span><span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{d.worker_name}</span></div>
                  <span className="text-slate-200 dark:text-slate-700">·</span>
                  <div className="flex items-center gap-1.5"><span className="text-slate-400 dark:text-slate-500 text-xs">Business:</span><span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{d.business_name}</span></div>
                </div>

                {/* Real activity timeline (project.timeline), not fabricated events */}
                {d.timeline?.length > 0 && (
                  <div className="ml-3 mt-4 flex flex-col gap-3 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
                    {d.timeline.map((event, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-slate-400 dark:bg-slate-600 shadow-sm" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{PROJECT_STATUS_META[event.status]?.label ?? event.status}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(event.at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {decision ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mt-4">
                    <CheckCircle2 className="w-4 h-4" />
                    {decision === "refund" ? "Refunded to business" : decision === "split" ? "Split resolution applied" : "Released to Worker"}
                  </div>
                ) : confirming?.id === d.id ? (
                  <div className="mt-4 space-y-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                      {confirming.resolution === "refund"
                        ? `Confirm: refund ${formatINR(d.budget)} to the business — this moves real money and can't be undone.`
                        : confirming.resolution === "release"
                          ? "Confirm: release the payout to the Worker — this moves real money and can't be undone."
                          : `Split resolution — enter what each side gets (can total less than ${formatINR(d.budget)}; the rest stays with WorkBridge as a facilitation fee).`}
                    </p>
                    {confirming.resolution === "split" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Worker gets</label>
                          <input
                            type="number" min="0" max={d.budget} step="1"
                            value={splitWorkerAmount}
                            onChange={(e) => setSplitWorkerAmount(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-amber-900/40 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Business refund</label>
                          <input
                            type="number" min="0" max={d.budget} step="1"
                            value={splitBusinessAmount}
                            onChange={(e) => setSplitBusinessAmount(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-amber-900/40 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    )}
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Resolution note (optional) — recorded in the platform audit log"
                      rows={2}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40 dark:border-amber-900/40 dark:bg-slate-900 dark:text-slate-200"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(d.id, confirming.resolution)}
                        disabled={busyId === d.id}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-60 ${
                          confirming.resolution === "release" ? "bg-[#FF6B35] hover:bg-[#e85a28]" : confirming.resolution === "split" ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-600 hover:bg-slate-700"
                        }`}
                      >
                        {busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Confirm {confirming.resolution === "refund" ? "Refund" : confirming.resolution === "split" ? "Split" : "Release"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirming(null);
                          setResolutionNote("");
                          setSplitWorkerAmount("");
                          setSplitBusinessAmount("");
                        }}
                        disabled={busyId === d.id}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 flex-wrap mt-4">
                    <button
                      onClick={() => navigate(`/invoice?id=${d.id}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/50 border border-white/60 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 transition-colors dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Receipt className="w-3.5 h-3.5" />View Invoice
                    </button>
                    <button
                      onClick={() => setConfirming({ id: d.id, resolution: "refund" })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Refund Business
                    </button>
                    <button
                      onClick={() => setConfirming({ id: d.id, resolution: "split" })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors dark:border-violet-900/40 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      Split Resolution
                    </button>
                    <button
                      onClick={() => setConfirming({ id: d.id, resolution: "release" })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#FF6B35] hover:bg-[#e85a28] transition-colors active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Force Release to Worker
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </div>
  );
}
