import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  MessageSquareOff,
  MessagesSquare,
  PhoneOff,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  listBlockedAttempts,
  resolveBlockedAttempt,
  listMonitoredBusinesses,
  listWorkersForBusiness,
  moderateUser,
} from "../../lib/adminApi";
import { listMessages } from "../../lib/messagesApi";
import { ApiError } from "../../lib/apiClient";

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ name, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-700",
    blue: "bg-[#1B3FAB]",
  };
  return (
    <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${tones[tone]}`}>
      {initials(name)}
    </div>
  );
}

// View 2: Message Monitor — the "Cascading Workspace." Business -> Worker ->
// read-only chat thread + moderation actions, three columns deep, so support
// can drill into exactly one conversation and act on it without a search box
// standing between them and the transcript.
function MessageMonitor() {
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workersError, setWorkersError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [lastAction, setLastAction] = useState(null); // "banned" | "unbanned" | "warned" | "points_deducted"

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? null;
  const selectedWorker = workers.find((w) => w.project_id === selectedProjectId) ?? null;

  useEffect(() => {
    listMonitoredBusinesses()
      .then(setBusinesses)
      .catch((err) => setBusinessesError(err instanceof ApiError ? err.message : "Could not load businesses."))
      .finally(() => setBusinessesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBusinessId) {
      setWorkers([]);
      setSelectedProjectId(null);
      return;
    }
    setWorkersLoading(true);
    setWorkersError("");
    setSelectedProjectId(null);
    listWorkersForBusiness(selectedBusinessId)
      .then(setWorkers)
      .catch((err) => setWorkersError(err instanceof ApiError ? err.message : "Could not load workers."))
      .finally(() => setWorkersLoading(false));
  }, [selectedBusinessId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setThread([]);
      return;
    }
    setThreadLoading(true);
    setThreadError("");
    setLastAction(null);
    listMessages(selectedProjectId)
      .then(setThread)
      .catch((err) => setThreadError(err instanceof ApiError ? err.message : "Could not load this conversation."))
      .finally(() => setThreadLoading(false));
  }, [selectedProjectId]);

  // is_active defaults to true at the DB level, so a null/undefined value
  // here (e.g. an older row before that column existed) reads as active.
  const workerIsBanned = selectedWorker?.worker_is_active === false;
  // The Dual-Ban Moderation Engine's soft tier — is_chat_banned defaults to
  // false, so a missing value reads as "chat allowed."
  const workerIsChatBanned = selectedWorker?.worker_is_chat_banned === true;

  const runAction = async (action, extra) => {
    if (!selectedWorker || acting) return;
    setActing(true);
    setActionError("");
    try {
      await moderateUser(selectedWorker.worker_id, action, { ...extra, projectId: selectedProjectId });
      setLastAction(
        {
          ban: "banned",
          unban: "unbanned",
          ban_chat: "chat_banned",
          unban_chat: "chat_unbanned",
          warn: "warned",
          deduct_points: "points_deducted",
        }[action]
      );
      if (action === "ban_chat" || action === "unban_chat") {
        const nowChatBanned = action === "ban_chat";
        setWorkers((prev) =>
          prev.map((w) => (w.worker_id === selectedWorker.worker_id ? { ...w, worker_is_chat_banned: nowChatBanned } : w))
        );
      }
      if (action === "warn") {
        listMessages(selectedProjectId).then(setThread).catch(() => {});
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not complete that action.");
    } finally {
      setActing(false);
    }
  };

  const handleWarn = () => {
    if (!window.confirm(`Send a formal warning to ${selectedWorker.worker_name}?`)) return;
    runAction("warn");
  };

  const handleDeduct = () => {
    const input = window.prompt(`Deduct how many behavior score points from ${selectedWorker.worker_name}?`, "50");
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter a positive number of points to deduct.");
      return;
    }
    runAction("deduct_points", { points: amount });
  };

  // The Dual-Ban Moderation Engine's soft tier — locks their chat composer
  // only. Login, submissions, and escrow payouts are all untouched, so a
  // business's funds never get trapped mid-project over a chat-only
  // violation. No confirm() dialog, unlike the permanent ban above — this
  // is meant to be a low-friction, reversible first response.
  const handleBanChat = () => {
    if (workerIsChatBanned || acting) return;
    runAction("ban_chat");
  };

  const handleUnbanChat = () => {
    if (!workerIsChatBanned || acting) return;
    runAction("unban_chat");
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Column 1: Monitored Businesses (25%) ──────────────────────── */}
      <div className="w-1/4 h-full border-r border-slate-100 bg-white/50 flex flex-col dark:border-slate-800 dark:bg-slate-900/50">
        <div className="p-5 border-b border-slate-100 flex-shrink-0 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <MessagesSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Trust &amp; Safety</span>
          </div>
          <h2 className="text-base font-extrabold text-[#0A1128] dark:text-white font-display">
            Monitored Businesses
          </h2>
        </div>
        <div className="wb-scroll-clean flex-1 overflow-y-auto">
          {businessesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-700" />
            </div>
          ) : businessesError ? (
            <div className="p-4 text-xs text-red-600 dark:text-red-400">{businessesError}</div>
          ) : businesses.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-400 dark:text-slate-500">No businesses with hires yet.</div>
          ) : (
            businesses.map((b) => {
              const isSelected = b.id === selectedBusinessId;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBusinessId(b.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 transition-colors dark:border-slate-800/60 ${
                    isSelected ? "border-l-4 border-l-blue-500 bg-slate-100 pl-3 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Avatar name={b.business_name} tone="blue" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0A1128] dark:text-white truncate">{b.business_name}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {b.hires} Hire{b.hires === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Column 2: Hired Workers (25%) ──────────────────────────────── */}
      <div className="w-1/4 h-full border-r border-slate-100 bg-white/30 flex flex-col dark:border-slate-800 dark:bg-slate-900/30">
        <div className="p-5 border-b border-slate-100 flex-shrink-0 dark:border-slate-800">
          <h2 className="text-base font-extrabold text-[#0A1128] dark:text-white font-display">
            Hired Workers
          </h2>
          {selectedBusiness && <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 truncate">{selectedBusiness.business_name}</p>}
        </div>
        <div className="wb-scroll-clean flex-1 overflow-y-auto">
          {!selectedBusinessId ? (
            <div className="p-5 text-center text-xs text-slate-400 dark:text-slate-500">Select a business to see who they've hired.</div>
          ) : workersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-700" />
            </div>
          ) : workersError ? (
            <div className="p-4 text-xs text-red-600 dark:text-red-400">{workersError}</div>
          ) : workers.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-400 dark:text-slate-500">No hires for this business yet.</div>
          ) : (
            workers.map((w) => {
              const isSelected = w.project_id === selectedProjectId;
              return (
                <button
                  key={w.project_id}
                  onClick={() => setSelectedProjectId(w.project_id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 transition-colors dark:border-slate-800/60 ${
                    isSelected ? "border-l-4 border-l-blue-500 bg-slate-100 pl-3 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Avatar name={w.worker_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-[#0A1128] dark:text-white truncate">{w.worker_name}</p>
                      {w.worker_is_active === false ? (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">BANNED</span>
                      ) : (
                        w.worker_is_chat_banned === true && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">CHAT BANNED</span>
                        )
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{w.project_title}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Column 3: Moderation Terminal (50%) ─────────────────────────── */}
      <div className="w-1/2 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
        {!selectedWorker ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Select a conversation to monitor</p>
            </div>
          </div>
        ) : (
          <>
            {/* Sticky top bar */}
            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={selectedWorker.worker_name} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold text-[#0A1128] dark:text-white truncate">{selectedWorker.worker_name}</p>
                    {workerIsBanned && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">BANNED</span>
                    )}
                    {!workerIsBanned && workerIsChatBanned && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">CHAT BANNED</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{selectedWorker.project_title}</p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={handleWarn}
                  disabled={acting}
                  title="Warn"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40 dark:hover:bg-amber-500/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Warn
                </button>
                <button
                  onClick={handleDeduct}
                  disabled={acting}
                  title="Deduct points"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-60 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-900/40 dark:hover:bg-orange-500/20"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Deduct
                </button>
                {workerIsChatBanned ? (
                  <button
                    onClick={handleUnbanChat}
                    disabled={acting}
                    title="Restore chat privileges"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-60 dark:text-amber-400 dark:hover:bg-amber-500/10"
                  >
                    <MessageSquareOff className="w-3.5 h-3.5" />
                    Unban Chat
                  </button>
                ) : (
                  <button
                    onClick={handleBanChat}
                    disabled={acting}
                    title="Locks their chat composer only — submissions and payouts are unaffected"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-60 dark:text-amber-400 dark:hover:bg-amber-500/10"
                  >
                    <MessageSquareOff className="w-3.5 h-3.5" />
                    Ban Chat
                  </button>
                )}
                {workerIsBanned && (
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900/40" title="Full account bans now live on the main Users page">
                    <Ban className="w-3.5 h-3.5" />
                    Banned — manage on Users page
                  </span>
                )}
              </div>
            </div>

            {(actionError || lastAction) && (
              <div className="flex-shrink-0 px-6 pt-3">
                {actionError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
                )}
                {!actionError && lastAction && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {
                      {
                        banned: "User banned — signed out immediately.",
                        unbanned: "User unbanned.",
                        chat_banned: "Chat privileges suspended — deliverables and payouts are unaffected.",
                        chat_unbanned: "Chat privileges restored.",
                        warned: "Warning posted — both sides will see it in this project's chat.",
                        points_deducted: "Behavior score points deducted.",
                      }[lastAction]
                    }
                  </div>
                )}
              </div>
            )}

            {/* Read-only chat feed — a vault, not a composer */}
            <div className="wb-scroll-clean flex-1 overflow-y-auto px-6 py-5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
              {threadLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-700" />
                </div>
              ) : threadError ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{threadError}</span>
                </div>
              ) : thread.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No messages on this project yet.</div>
              ) : (
                <div className="space-y-3">
                  {thread.map((m) => {
                    const isWorker = m.sender_id === selectedWorker.worker_id;
                    return (
                      <div key={m.id} className={`flex ${isWorker ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isWorker ? "bg-blue-100 text-[#0A1128] dark:bg-blue-500/20 dark:text-white" : "bg-white text-[#0A1128] border border-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                          }`}
                        >
                          <p className="text-sm break-words">{m.body}</p>
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{formatTime(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Real Security Monitor — every row is a blocked_message_attempts row (the
// only record of a contact-info send that got hard-blocked; the message
// itself was never stored anywhere). No fake severity ranking here — that
// was decorative in the mock version and there's no real signal to compute
// it from yet, so this is a flat pending queue.
export default function AdminSecurityTab() {
  const [view, setView] = useState("attempts"); // "attempts" | "messages"
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [displayAttempt, setDisplayAttempt] = useState(null);
  const [editedBody, setEditedBody] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const selected = attempts.find((a) => a.id === selectedId) ?? null;

  // Keeps the last-viewed case's content mounted while the slave panel
  // fades out, so it doesn't blank out mid-transition.
  useEffect(() => {
    if (selected) {
      setDisplayAttempt(selected);
      setEditedBody(selected.attempted_text);
      setResolveError("");
    }
  }, [selected]);

  useEffect(() => {
    listBlockedAttempts()
      .then(setAttempts)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load Security Monitor."))
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async (action) => {
    if (!displayAttempt || resolving) return;
    setResolving(true);
    setResolveError("");
    try {
      await resolveBlockedAttempt(displayAttempt.id, action, { editedBody });
      setAttempts((prev) => prev.filter((a) => a.id !== displayAttempt.id));
      setSelectedId(null);
    } catch (err) {
      setResolveError(err instanceof ApiError ? err.message : "Could not resolve this case.");
    } finally {
      setResolving(false);
    }
  };

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80">
      <button
        onClick={() => setView("attempts")}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
          view === "attempts" ? "bg-[#0A1128] text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        Blocked Attempts
      </button>
      <button
        onClick={() => setView("messages")}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
          view === "messages" ? "bg-[#0A1128] text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        Message Monitor
      </button>
    </div>
  );

  // Only the Blocked Attempts layout (below) has empty top-right space for
  // an absolutely-positioned toggle — the Message Monitor's own sticky
  // moderation bar lives there instead, so that view gets the toggle in a
  // normal-flow header row instead, never overlapping its Warn/Deduct/Ban/
  // Unban buttons.
  const toggleBar = <div className="absolute top-4 right-6 z-20">{viewToggle}</div>;

  if (view === "messages") {
    return (
      <div className="flex flex-col w-full h-full overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-end px-6 py-3 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          {viewToggle}
        </div>
        <div className="flex-1 min-h-0">
          <MessageMonitor />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative flex h-full items-center justify-center">
        {toggleBar}
        <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-700" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative flex h-full items-center justify-center p-7">
        {toggleBar}
        <div className="flex max-w-md items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden w-full h-full flex">
      {toggleBar}
      {/* ── View 1: Case Queue ───────────────────────────────────────── */}
      <div className="wb-scroll-clean w-full md:w-1/2 lg:w-1/3 h-full absolute left-0 top-0 border-r border-white/60 bg-white/60 backdrop-blur-xl overflow-y-auto dark:border-slate-800 dark:bg-slate-900/60">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Trust &amp; Safety</span>
          </div>
          <h1 className="text-lg font-extrabold text-[#0A1128] dark:text-white font-display">
            Security Monitor
          </h1>
          <p className="mt-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {attempts.length} blocked contact-info attempt{attempts.length === 1 ? "" : "s"} pending review
          </p>
        </div>
        {attempts.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
            Nothing to review — no blocked attempts right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {attempts.map((attempt) => {
              const isSelected = selectedId === attempt.id;
              return (
                <button
                  key={attempt.id}
                  onClick={() => setSelectedId(attempt.id)}
                  className={`relative w-full text-left pl-5 pr-5 py-4 transition-colors ${
                    isSelected ? "bg-[#F4F6FF] dark:bg-blue-500/10" : "hover:bg-white/40 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-bold text-[#0A1128] dark:text-white text-sm truncate">{attempt.sender_name}</p>
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">{attempt.sender_role}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {attempt.business_name} · {attempt.project_title}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(attempt.created_at)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── View 2: Case File ── opacity fade, not a slide, per the earlier
          fix — panel entrance shouldn't feel like a cheap slide-in. ── */}
      <div
        className={`wb-scroll-clean absolute top-0 right-0 z-10 w-full md:w-1/2 lg:w-2/3 h-full bg-white/70 backdrop-blur-xl rounded-l-3xl border-l border-white/70 shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.1)] overflow-y-auto transition-opacity duration-200 ease-in-out dark:bg-slate-900/70 dark:border-slate-800 ${
          selected ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {displayAttempt && (
          <div>
            <div className="h-1.5 bg-red-600" />
            <div className="p-7">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Queue
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Case File</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900/40">
                    PENDING REVIEW
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#0A1128] dark:text-white font-display">
                  {displayAttempt.project_title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Worker: <span className="font-semibold text-slate-700 dark:text-slate-300">{displayAttempt.worker_name ?? "—"}</span>
                  {" · "}
                  Business: <span className="font-semibold text-slate-700 dark:text-slate-300">{displayAttempt.business_name}</span>
                  {" · "}
                  Sent by: <span className="font-semibold text-slate-700 dark:text-slate-300">{displayAttempt.sender_name}</span>
                </p>
              </div>

              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Blocked Message</p>
              <div className="rounded-2xl border border-dashed border-red-400 bg-red-50 p-4 mb-6 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex items-center gap-1.5 mb-2 text-red-600 dark:text-red-400 font-bold text-xs">
                  <PhoneOff className="w-3.5 h-3.5" />
                  Contact-info leak detected — never delivered to{" "}
                  {displayAttempt.sender_id === displayAttempt.worker_id
                    ? displayAttempt.business_name
                    : (displayAttempt.worker_name ?? "the other participant")}
                </div>
                <p className="font-mono text-sm text-red-800 dark:text-red-300 break-words">{displayAttempt.attempted_text}</p>
              </div>

              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Redacted version to send instead (optional)
              </p>
              <textarea
                rows={3}
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                placeholder="Remove the phone number/email, keep the rest of the message"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 mb-6 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 focus:dark:border-[#FF6B35] dark:focus:ring-blue-500/10"
              />

              {resolveError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{resolveError}</span>
                </div>
              )}

              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Choose a Resolution</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleResolve("redact_and_send")}
                  disabled={resolving}
                  className="flex items-center justify-center gap-2 px-5 py-4 bg-[#FF6B35] text-white rounded-2xl text-sm font-black shadow-[0_4px_14px_0_rgba(255,107,53,0.35)] hover:bg-[#e55a2b] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60"
                >
                  {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Redact &amp; Send
                </button>
                <button
                  onClick={() => handleResolve("ban")}
                  disabled={resolving}
                  className="flex items-center justify-center gap-2 px-5 py-4 bg-white/50 border-2 border-red-600 text-red-600 rounded-2xl text-sm font-black hover:bg-red-600 hover:text-white transition-all duration-200 disabled:opacity-60 dark:bg-slate-800/50 dark:text-red-400"
                >
                  <Ban className="w-4 h-4" />
                  Ban User
                </button>
                <button
                  onClick={() => handleResolve("warn")}
                  disabled={resolving}
                  className="flex items-center justify-center gap-2 px-5 py-4 bg-white/50 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-white/70 transition-colors disabled:opacity-60 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Send Formal Warning
                </button>
                <button
                  onClick={() => handleResolve("dismiss")}
                  disabled={resolving}
                  className="flex items-center justify-center gap-2 px-5 py-4 bg-white/50 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-white/70 transition-colors disabled:opacity-60 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  False Alarm (Dismiss)
                </button>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <Send className="w-3 h-3" />
                Ban is real and takes effect immediately. Warning/Dismiss are logged only — there's no delivery mechanism yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
