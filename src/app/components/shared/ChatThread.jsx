import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Paperclip,
  Send,
  ShieldOff,
  Upload,
  X,
} from "lucide-react";
import {
  listThreadMessages,
  sendThreadImageMessage,
  sendThreadLinkMessage,
  sendThreadMessage,
} from "../../lib/threadsApi";
import { ApiError } from "../../lib/apiClient";
import { getSocket } from "../../lib/socketClient";
import { useAuth } from "../../context/AuthContext";
import ImageLightbox from "./ImageLightbox";
import brandLogo from "../../assets/logo.png";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// A soft client-side mirror of the backend's contactFilter.js — purely for
// instant feedback before the round trip; the server is still the one
// source of truth (see messages.controller.js's sendMessage), so a message
// that slips past this can never slip past the API. Keep this logic
// identical to contactFilter.js if either changes.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const SPELLED_EMAIL_PATTERN = /[a-zA-Z0-9._%-]+\s+at\s+[a-zA-Z0-9.-]+\s+dot\s+(com|in|org|net|co|io)\b/i;

const DIGIT_WORDS = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};
function spellOutDigitsToNumerals(text) {
  return text.replace(/[A-Za-z]+/g, (word) => DIGIT_WORDS[word.toLowerCase()] ?? word);
}

const MAX_NOISE_GAP = 5;
const MIN_DIGIT_RUN = 10;
function hasEvasiveDigitRun(text) {
  let runLength = 0;
  let gap = "";
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") {
      const gapContinuesRun =
        gap === "" || gap === " " || (gap.length <= MAX_NOISE_GAP && !/[\s,;]/.test(gap));
      runLength = gapContinuesRun ? runLength + 1 : 1;
      gap = "";
      if (runLength >= MIN_DIGIT_RUN) return true;
    } else {
      gap += ch;
    }
  }
  return false;
}

function looksLikeContactInfo(text) {
  if (!text) return false;
  if (EMAIL_PATTERN.test(text) || SPELLED_EMAIL_PATTERN.test(text)) return true;
  return hasEvasiveDigitRun(spellOutDigitsToNumerals(text));
}

function isInternalLink(url) {
  return url.toLowerCase().includes("workbridge");
}

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

// A merged thread can easily span several days (weeks, for a long-running
// relationship) — showing only clock time on every bubble made a
// perfectly-in-order conversation look scrambled, since "05:04 PM" then
// "06:51 PM" then "03:45 PM" reads as out of sequence unless you know the
// third one is the next day. WhatsApp-style day dividers fix that.
function isSameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateDivider(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, now)) return "Today";
  if (isSameCalendarDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function DateDivider({ label }) {
  return (
    <div className="flex items-center justify-center py-1">
      <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-700/70 dark:text-slate-400">{label}</span>
    </div>
  );
}

// An attachment bubble wraps a submission that's still going through the
// same Trust Checker moderation every other shared file does — a pending/
// rejected one is only ever rendered for the person who sent it (the
// listMessages visibility filter already hides it from the other side
// entirely), and per an earlier privacy decision there's no "Approved"
// badge either — that would tell both sides admin is watching their
// shared content, which they haven't necessarily agreed to know about.
function AttachmentBubble({ message, isMine, onPreview }) {
  const isPending = message.submission_status === "PENDING_REVIEW";
  const isRejected = message.submission_status === "REJECTED";

  return (
    <div className={`max-w-[78%] rounded-2xl border p-3 ${isMine ? "border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-500/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
      {message.submission_type === "link" ? (
        <a
          href={message.submission_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#1B3FAB] dark:text-blue-400 hover:underline"
        >
          {isInternalLink(message.submission_url) ? (
            <img src={brandLogo} alt="WorkBridge" className="h-3.5 w-3.5 flex-shrink-0 object-contain" />
          ) : (
            <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          {detectProvider(message.submission_url)}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onPreview(message.submission_image_data)}
          aria-label="View full image"
          className="h-20 w-20 overflow-hidden rounded-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/40"
        >
          <img src={message.submission_image_data} alt={message.submission_caption ?? "Shared image"} className="h-full w-full object-cover" />
        </button>
      )}
      {message.submission_caption && <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{message.submission_caption}</p>}
      {isPending && (
        <p className="mt-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">Pending review — only you can see this until it's cleared.</p>
      )}
      {isRejected && (
        <p className="mt-1.5 text-[11px] font-bold text-rose-500 dark:text-rose-400">
          Rejected{message.submission_rejection_reason ? `: ${message.submission_rejection_reason}` : ""}
        </p>
      )}
    </div>
  );
}

// An admin warning (Security Monitor's "Warn" action) — a real, permanent
// message, but rendered as a centered system banner rather than a bubble
// attributed to either participant, since neither side "sent" it.
function SystemNoticeRow({ message }) {
  const time = new Date(message.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex justify-center">
      <div className="flex max-w-[85%] items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center dark:border-red-900/40 dark:bg-red-950/30">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Admin Notice</p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-300">{message.body}</p>
          <span className="mt-1.5 block text-[11px] font-semibold text-red-400 dark:text-red-500">{time}</span>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message, isMine, onPreview }) {
  const time = new Date(message.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  if (message.is_system_notice) return <SystemNoticeRow message={message} />;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[78%] flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {message.submission_id ? (
          <AttachmentBubble message={message} isMine={isMine} onPreview={onPreview} />
        ) : (
          <div
            className={`rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
              isMine ? "rounded-br-lg bg-[#1B3FAB] text-white" : "rounded-bl-lg border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            {message.body}
          </div>
        )}
        <span className="px-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{time}</span>
      </div>
    </div>
  );
}

// Walks the chronological message list once and threads a day divider in
// wherever the calendar date changes — messages themselves are never
// reordered or re-grouped, this only inserts markers between them.
function renderMessageRows(messages, currentUserId, onPreview) {
  const rows = [];
  let lastDay = null;
  for (const message of messages) {
    const day = new Date(message.created_at);
    if (!lastDay || !isSameCalendarDay(day, lastDay)) {
      rows.push(<DateDivider key={`divider-${message.id}`} label={formatDateDivider(day)} />);
      lastDay = day;
    }
    rows.push(
      <MessageRow key={message.id} message={message} isMine={message.sender_id === currentUserId} onPreview={onPreview} />
    );
  }
  return rows;
}

// The real, persisted chat — one continuous thread per (business, worker)
// pair spanning every project they've ever done together, replacing the
// fake seeded conversations that used to live as local-only state inside
// WorkerNegotiationInbox.jsx and BusinessNegotiationHub.jsx (and, before
// that, an earlier one-thread-per-project model). Deliberately headerless —
// call sites keep their own existing header (job details / contract-terms
// button etc.) and just render this for the feed + composer. The one thing
// that still gates the composer is a real, mutual, WhatsApp-style block —
// not project status — enforced server-side too (messages.controller.js's
// assertNotBlocked), so this can't be bypassed by hitting the API directly.
//
// activeProjects (non-closed projects with this counterparty) drives the
// attachment project-picker — a deliverable always belongs to exactly one
// real project, and with several live projects sharing one merged
// conversation that can no longer be inferred from context, so it's asked
// for explicitly. projectIds (every project, active or closed) is only used
// to recognize realtime events from the older per-project routes (an admin
// warning, a redacted-and-sent message) that don't carry this thread's id.
// blockStatus/blockActionBusy/onBlock/onUnblock are owned by the parent
// now (WorkerNegotiationInbox.jsx's ChatPanel / BusinessNegotiationHub.jsx's
// FocusHub) — they render the actual Block/Unblock control in their own
// header row, right next to the Verified/Escrow badges, instead of it
// sitting in its own separate bar underneath. ChatThread still reads
// blockStatus to gate the composer, it just no longer owns or fetches it.
export default function ChatThread({
  threadId,
  otherUserId,
  activeProjects = [],
  projectIds = [],
  blockStatus = { blockedByMe: false, blockedMe: false },
  blockActionBusy = false,
  onBlock,
  onUnblock,
}) {
  const { currentUser, isImpersonating } = useAuth();
  // The Dual-Ban Moderation Engine's soft tier — locks only this side's own
  // composer (server-enforced too, messages.controller.js's
  // assertNotChatBanned); it never affects reading history, deliverables,
  // or payouts, so the rest of ChatThread stays fully usable.
  const isChatBanned = currentUser?.is_chat_banned === true;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachMode, setAttachMode] = useState("link");
  const [attachProjectId, setAttachProjectId] = useState(activeProjects[0]?.id ?? "");
  const [attachUrl, setAttachUrl] = useState("");
  const [attachCaption, setAttachCaption] = useState("");
  const [attachImageFile, setAttachImageFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const feedRef = useRef(null);
  const isInitialScrollRef = useRef(true);

  // Keeps the attachment picker pointed at a real, currently-active project
  // whenever the thread switches (or a project's status moves it in/out of
  // activeProjects) instead of silently holding onto a stale id.
  useEffect(() => {
    setAttachProjectId((current) =>
      activeProjects.some((p) => p.id === current) ? current : activeProjects[0]?.id ?? ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, activeProjects.map((p) => p.id).join(",")]);


  const load = () => {
    listThreadMessages(threadId)
      .then(setMessages)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load messages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    isInitialScrollRef.current = true;
    setLoading(true);
    setLoadError("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (event.type !== "MESSAGE_CREATED" && event.type !== "SUBMISSION_REVIEWED") return;
      // A message sent through the merged thread route carries threadId
      // directly. One created through an admin action on the older
      // per-project routes (a Security Monitor warning, a redacted-and-sent
      // message) carries projectId instead — still relevant here if that
      // project belongs to this same thread.
      const matchesThread = event.threadId === threadId;
      const matchesProject = event.projectId && projectIds.includes(event.projectId);
      if (matchesThread || matchesProject) load();
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, projectIds.join(",")]);

  useEffect(() => {
    if (!feedRef.current || messages.length === 0) return;
    feedRef.current.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: isInitialScrollRef.current ? "auto" : "smooth",
    });
    isInitialScrollRef.current = false;
  }, [threadId, messages.length]);

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (looksLikeContactInfo(body)) {
      setSendError("Sharing phone numbers or email addresses in chat isn't allowed — keep contact details off WorkBridge.");
      return;
    }
    setSendError("");
    setSending(true);
    try {
      await sendThreadMessage(threadId, body);
      setDraft("");
      load();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Could not send that message.");
    } finally {
      setSending(false);
    }
  };

  const handleImagePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setSendError("");
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setSendError("Image is too large (max 8MB) — use a link (Google Drive, Dropbox, etc.) for bigger files.");
      return;
    }
    setAttachImageFile(file);
  };

  const handleSendAttachment = async () => {
    setSendError("");
    if (!attachProjectId) {
      setSendError("Choose which project this is for first.");
      return;
    }
    if (looksLikeContactInfo(attachCaption)) {
      setSendError("Sharing phone numbers or email addresses in chat isn't allowed — keep contact details off WorkBridge.");
      return;
    }
    setSending(true);
    try {
      if (attachMode === "link") {
        if (!attachUrl.trim()) {
          setSendError("Paste a link first.");
          setSending(false);
          return;
        }
        await sendThreadLinkMessage({
          threadId,
          projectId: attachProjectId,
          url: attachUrl.trim(),
          caption: attachCaption.trim() || undefined,
        });
        setAttachUrl("");
      } else {
        if (!attachImageFile) {
          setSendError("Choose an image first.");
          setSending(false);
          return;
        }
        const imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(attachImageFile);
        });
        await sendThreadImageMessage({
          threadId,
          projectId: attachProjectId,
          imageData,
          caption: attachCaption.trim() || undefined,
        });
        setAttachImageFile(null);
      }
      setAttachCaption("");
      setAttachOpen(false);
      load();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Could not share that.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={feedRef} className="wb-scroll-clean min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB]" />
          </div>
        ) : loadError ? (
          <p className="py-4 text-center text-xs text-red-500">{loadError}</p>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">No messages yet — say hello.</p>
        ) : (
          renderMessageRows(messages, currentUser?.id, setPreviewSrc)
        )}
      </div>

      {attachOpen && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-white p-1 w-fit border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              {[
                { id: "link", label: "Link", icon: Link2 },
                { id: "image", label: "Image", icon: ImageIcon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAttachMode(id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    attachMode === id ? "bg-[#1B3FAB] text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAttachOpen(false)}
              aria-label="Close attachment panel"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeProjects.length > 1 && (
            <select
              value={attachProjectId}
              onChange={(e) => setAttachProjectId(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/20"
            >
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  For: {project.title}
                </option>
              ))}
            </select>
          )}

          {attachMode === "link" ? (
            <input
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
              placeholder="https://drive.google.com/… or any file link"
              className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
            />
          ) : (
            <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
              <Upload className="h-4 w-4 flex-shrink-0" />
              {attachImageFile ? attachImageFile.name : "Choose an image (max 8MB)"}
              <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            </label>
          )}

          <div className="flex gap-2">
            <input
              value={attachCaption}
              onChange={(e) => setAttachCaption(e.target.value)}
              placeholder="Optional note"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={handleSendAttachment}
              disabled={sending}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-bold text-white hover:bg-[#E55E1F] disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Share
            </button>
          </div>
        </div>
      )}

      {sendError && (
        <div className="flex flex-shrink-0 items-start gap-2 border-t border-red-100 bg-red-50 px-5 py-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{sendError}</span>
        </div>
      )}

      {isChatBanned ? (
        <div className="flex flex-shrink-0 items-start gap-2 border-t border-amber-200 bg-amber-50 px-5 py-4 text-left dark:border-amber-900/40 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Your chat privileges have been temporarily suspended due to a policy violation. You can still submit
            active deliverables to receive payment.
          </p>
        </div>
      ) : blockStatus.blockedMe ? (
        <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500">
          You can't message this user.
        </div>
      ) : blockStatus.blockedByMe ? (
        <div className="flex flex-shrink-0 flex-col items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">You blocked this user — unblock to send a message.</p>
          <button
            type="button"
            onClick={onUnblock}
            disabled={blockActionBusy || isImpersonating}
            title={isImpersonating ? "Disabled in Impersonation Mode" : undefined}
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            {isImpersonating ? "Disabled in Impersonation Mode" : "Unblock"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-[#1B3FAB] focus-within:ring-4 focus-within:ring-[#1B3FAB]/10 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-blue-500/10">
            <button
              type="button"
              onClick={() => setAttachOpen((open) => !open)}
              disabled={activeProjects.length === 0}
              aria-label="Attach a file"
              title={activeProjects.length === 0 ? "No active project to attach a deliverable to" : "Attach a file"}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
                attachOpen ? "bg-[#1B3FAB] text-white" : "text-slate-400 hover:bg-white hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setSendError(""); }}
              placeholder="Write a message..."
              className="min-h-[42px] flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow-sm shadow-orange-200 transition hover:bg-[#e85d27] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </div>
  );
}
