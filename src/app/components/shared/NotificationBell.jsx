import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Loader2, X } from "lucide-react";
import { listNotifications, markNotificationsRead } from "../../lib/notificationsApi";
import { getSocket } from "../../lib/socketClient";

function timeAgo(dateString) {
  const ms = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// The real notification history behind the bell — sourced from
// notifications table rows the backend writes alongside every push send
// (realtime/events.js's fireNotification), same events already driving
// this app's toasts. Self-contained: fetches its own data, so dropping
// <NotificationBell /> into any dashboard header is the whole integration.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    listNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        // Non-critical widget — a failed fetch just leaves the bell quiet.
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  // Every real-time event this app fires (project status changes,
  // payments, candidate updates, support replies) now also lands a
  // notifications row server-side — rather than duplicate that type
  // mapping here, just re-fetch on any event so the badge/list can never
  // drift out of sync with what the server actually persisted.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.on("project:event", refresh);
    return () => socket.off("project:event", refresh);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (unreadCount > 0) {
      setUnreadCount(0);
      markNotificationsRead().catch(() => {
        // Worst case the badge is briefly wrong again next refresh — not
        // worth surfacing an error for a read-receipt.
      });
    }
  };

  const handleClickNotification = (notification) => {
    setOpen(false);
    if (notification.url) navigate(notification.url);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed right-0 top-0 z-[91] flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Notifications</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="wb-scroll-clean min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-700" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                    <Bell className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                    <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Nothing yet</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Real updates — payments, project status, messages — show up here as they happen.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClickNotification(n)}
                          className={`block w-full px-5 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            !n.is_read ? "bg-orange-50/50 dark:bg-orange-500/10" : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</p>
                            {!n.is_read && <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#FF6B35]" />}
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{n.message}</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          </>
        )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
