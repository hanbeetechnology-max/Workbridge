import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Headphones, Loader2, Send } from "lucide-react";
import {
  getThreadMessagesForAdmin,
  listThreadsForAdmin,
  sendAdminMessage,
  setThreadStatus,
} from "../../lib/supportApi";
import { getSocket } from "../../lib/socketClient";
import { getInitials } from "../../utils/formValidation";
import { ApiError } from "../../lib/apiClient";

function formatTime(ts) {
  return new Date(ts).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ThreadList({ threads, selectedId, onSelect }) {
  return (
    <aside className="flex h-full w-[320px] flex-shrink-0 flex-col overflow-hidden border-r border-white/60 bg-white/40 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-white/60 px-5 py-4 dark:border-slate-800">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Customer Care</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Support Inbox</h1>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400">
            {threads.filter((t) => t.status === "OPEN").length} Open
          </span>
        </div>
      </div>
      <div className="wb-scroll-clean min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {threads.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">No conversations yet.</div>
        ) : (
          threads.map((t) => {
            const selected = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                className={`mb-2 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  selected ? "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800" : "border-transparent hover:bg-white/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1B3FAB] text-xs font-bold text-white">
                  {getInitials(t.user_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.user_name}</p>
                    {t.status === "OPEN" && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="truncate text-xs capitalize text-slate-400 dark:text-slate-500">{t.user_role}</p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{t.last_message ?? "No messages yet"}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function ConversationPanel({ thread, messages, onSend, sending, sendError, draft, setDraft, onResolveToggle, resolving }) {
  const feedRef = useRef(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900">
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B3FAB] text-sm font-bold text-white">
            {getInitials(thread.user_name)}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{thread.user_name}</p>
            <p className="text-xs capitalize text-slate-400 dark:text-slate-500">{thread.user_role} account</p>
          </div>
        </div>
        {/* This used to be a small outlined pill that was easy to miss
            entirely — a real reported issue (an admin sat on an open ticket
            for 3 hours because they couldn't spot it). A resolved thread's
            reopen action stays low-key (it's a rare correction, not the
            primary flow); an OPEN thread's resolve action is now a large,
            solid, impossible-to-miss button with a subtle pulse so it reads
            as "there's still an action needed here" at a glance. */}
        <button
          type="button"
          onClick={onResolveToggle}
          disabled={resolving}
          className={`flex flex-shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 ${
            thread.status === "RESOLVED"
              ? "border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              : "animate-pulse bg-emerald-600 text-white shadow-emerald-600/30 hover:animate-none hover:bg-emerald-700"
          }`}
        >
          {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {thread.status === "RESOLVED" ? "Reopen Conversation" : "Resolve Ticket"}
        </button>
      </header>

      {thread.status !== "RESOLVED" && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-amber-100 bg-amber-50 px-6 py-2.5 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          This conversation is still open. Once you've helped them, click "Resolve Ticket" above.
        </div>
      )}

      <div ref={feedRef} className="wb-scroll-clean min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Headphones className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No messages yet in this conversation.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_role === "admin";
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[70%] flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                  {!isMine && (
                    <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {message.sender_name}
                    </span>
                  )}
                  <div
                    className={`rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      isMine
                        ? "rounded-br-lg bg-[#1B3FAB] text-white"
                        : "rounded-bl-lg border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {message.body}
                  </div>
                  <span className="px-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{formatTime(message.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sendError && (
        <div className="flex flex-shrink-0 items-start gap-2 border-t border-red-100 bg-red-50 px-6 py-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{sendError}</span>
        </div>
      )}

      <form onSubmit={onSend} className="flex-shrink-0 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-[#1B3FAB] focus-within:ring-4 focus-within:ring-[#1B3FAB]/10 dark:border-slate-700 dark:bg-slate-800 focus-within:dark:border-[#FF6B35]">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Reply as WorkBridge Support..."
            className="min-h-[42px] flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow-sm shadow-orange-200 transition hover:bg-[#e85d27] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send reply"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </main>
  );
}

// Real-time Customer Care inbox — every user's support conversation, newest
// activity first (listThreadsForAdmin), with a live conversation panel
// mirroring SupportChat.jsx's worker/business-facing counterpart.
export default function AdminSupportTab() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [resolving, setResolving] = useState(false);

  const loadThreads = () =>
    listThreadsForAdmin()
      .then((data) => {
        setThreads(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load support threads."));

  useEffect(() => {
    loadThreads().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = (id) => {
    if (!id) return;
    getThreadMessagesForAdmin(id)
      .then((data) => setMessages(data.messages))
      .catch(() => setMessages([]));
  };

  useEffect(() => {
    loadMessages(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleEvent = (event) => {
      if (event.type !== "SUPPORT_MESSAGE_CREATED") return;
      loadThreads();
      if (event.threadId === selectedId) loadMessages(event.threadId);
    };

    socket.on("project:event", handleEvent);
    return () => socket.off("project:event", handleEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedId) ?? null, [threads, selectedId]);

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;
    setSendError("");
    setSending(true);
    try {
      await sendAdminMessage(selectedId, body);
      setDraft("");
      loadMessages(selectedId);
      loadThreads();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Could not send that reply.");
    } finally {
      setSending(false);
    }
  };

  const handleResolveToggle = async () => {
    if (!selectedThread) return;
    setResolving(true);
    try {
      const nextStatus = selectedThread.status === "RESOLVED" ? "OPEN" : "RESOLVED";
      await setThreadStatus(selectedThread.id, nextStatus);
      loadThreads();
    } catch {
      // Non-critical — thread status just stays as-is if this fails.
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300 dark:text-slate-700" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-7">
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ThreadList threads={threads} selectedId={selectedId} onSelect={setSelectedId} />
      {selectedThread ? (
        <ConversationPanel
          thread={selectedThread}
          messages={messages}
          onSend={handleSend}
          sending={sending}
          sendError={sendError}
          draft={draft}
          setDraft={setDraft}
          onResolveToggle={handleResolveToggle}
          resolving={resolving}
        />
      ) : (
        <div className="flex h-full flex-1 items-center justify-center bg-white dark:bg-slate-900">
          <div className="text-center">
            <Headphones className="mx-auto h-11 w-11 text-slate-300 dark:text-slate-700" />
            <p className="mt-4 text-sm font-semibold text-slate-400 dark:text-slate-500">
              No conversations yet — they'll show up here in real time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
