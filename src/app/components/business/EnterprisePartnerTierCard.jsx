import { useEffect, useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { getBusinessTier } from "../../lib/gamificationApi";
import { ApiError } from "../../lib/apiClient";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// Enterprise Partner Tier — a business-only track, entirely separate from
// the worker XP/Level system. Tiered by real total spend (money actually
// committed to escrow), never XP — businesses don't grind for points, they
// get recognized for the volume they've actually put through the platform.
const TIER_STYLES = {
  Bronze: { card: "bg-gradient-to-br from-orange-50 to-white border-orange-200 dark:from-orange-950/20 dark:to-slate-900 dark:border-orange-900/40", badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400", icon: "text-orange-500" },
  Silver: { card: "bg-gradient-to-br from-slate-50 to-white border-slate-300 dark:from-slate-800/40 dark:to-slate-900 dark:border-slate-700", badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300", icon: "text-slate-500 dark:text-slate-400" },
  Gold: { card: "bg-gradient-to-br from-amber-50 to-white border-amber-300 dark:from-amber-950/20 dark:to-slate-900 dark:border-amber-900/40", badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400", icon: "text-amber-500" },
};

export default function EnterprisePartnerTierCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBusinessTier()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        // Non-critical widget — a load failure just hides the card rather
        // than blocking the rest of the dashboard with an error banner.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-5 flex items-center justify-center rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  if (!status) return null;

  const style = TIER_STYLES[status.tier] ?? TIER_STYLES.Bronze;

  return (
    // p-4 / h-10 icon box — matches the compact Growth Hub ad cards' own
    // scale right below it, on request, instead of the taller p-6 this
    // card used to carry.
    <div className={`mb-5 rounded-2xl border p-4 shadow-sm ${style.card}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800 ${style.icon}`}>
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Enterprise Partner Tier</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${style.badge}`}>
                {status.tier}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{formatINR(status.totalSpend)} total spend</span>
            </div>
          </div>
        </div>

        {status.tier === "Gold" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
            Gold tier: priority support and dedicated account access
            <span className="ml-1.5 font-semibold text-amber-600/80 dark:text-amber-500/80">(preview — not applied yet)</span>
          </div>
        ) : status.nextTier ? (
          <div className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatINR(status.nextThreshold - status.totalSpend)} more to reach{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{status.nextTier}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
