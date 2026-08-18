const TIER_STYLES = {
  Micro: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Standard: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Professional: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  Enterprise: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

export default function TierBadge({ tier }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TIER_STYLES[tier] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
      {tier}
    </span>
  );
}
