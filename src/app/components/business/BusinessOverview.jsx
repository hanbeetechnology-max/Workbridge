import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  AlertCircle, ArrowRight, BadgeCheck, Briefcase, Calendar, CheckCircle2, Lock,
  Plus, Receipt, Shield, ShieldCheck, TrendingUp, UserCheck, Zap,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import EnterprisePartnerTierCard from "./EnterprisePartnerTierCard";
import { listProjects } from "../../lib/projectsApi";
import { getInitials } from "../../utils/formValidation";
import { PROJECT_STATUS_FLOW } from "../../utils/projectStatus";
import { verifiedRingClass } from "../../utils/verification";
import { ApiError } from "../../lib/apiClient";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

// Recharts' default tooltip is a plain white box that clashes with the rest
// of this card's glass/premium look — this replaces it with the same dark
// glassmorphism treatment (blurred slate, soft shadow) the rest of the
// dashboard's overlays use.
function SpendingTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const secured = payload.find((p) => p.dataKey === "secured")?.value ?? 0;
  const delivered = payload.find((p) => p.dataKey === "delivered")?.value ?? 0;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
      <p className="mb-1.5 text-xs font-bold text-white">{label}</p>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
        <span className="h-2 w-2 flex-shrink-0 rounded-sm bg-[#5b7fe8]" /> Secured: {formatINR(secured)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-purple-300">
        <span className="h-2 w-2 flex-shrink-0 rounded-sm bg-purple-400" /> Delivered: {formatINR(delivered)}
      </p>
    </div>
  );
}

// Was missing INVITED and PENDING_RELEASE — a business with several
// invites out (Rehire, or a direct invite from Find Workers) saw "0 Active
// Projects" here while the Active Projects page's own "Ongoing" tab
// correctly counted them, since that tab's definition is simply "not OPEN,
// not COMPLETED, not CANCELLED" (BusinessProjects.jsx's ongoingProjects).
// Matching that same definition here so the two pages agree.
const ACTIVE_STATUSES = new Set(["INVITED", "ACCEPTED", "PENDING_FUNDS", "FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED", "PENDING_RELEASE", "DISPUTED"]);
// PENDING_FUNDS deliberately excluded — the transfer is only submitted for
// verification at that point, not yet confirmed as real held funds.
const FUNDS_HELD_STATUSES = new Set(["FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED"]);

// ── Micro sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color, darkColor }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const r = max - min || 1;
  // Bigger canvas + more padding than before — at 64x26 with 1.5px strokes
  // the line read as a thin, faint scratch rather than a legible chart.
  const W = 76, H = 32, PAD = 4;
  const points = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * W,
    H - ((v - min) / r) * (H - PAD * 2) - PAD,
  ]);
  const pts = points.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  const dc = darkColor || color;

  // A dot on the most recent point anchors the eye on "where the trend is
  // right now" — without it the line has no clear endpoint to read from.
  const renderLayer = (c, layerClass) => (
    <g className={layerClass}>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={c + "33"} stroke="none" />
      <polyline points={pts} fill="none" stroke={c} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={c} />
    </g>
  );

  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      {/* Raw hex colors can't carry a `dark:` variant, so the line is drawn
          twice — a light-mode pass and a brighter dark-mode pass — and CSS
          toggles which one is visible, instead of the line staying navy-on-navy. */}
      {renderLayer(color, "dark:hidden")}
      {renderLayer(dc, "hidden dark:block")}
    </svg>
  );
}

// ── Filter chip bar ───────────────────────────────────────────────────────────
function Chips({ options, active, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            active === key
              ? "bg-[#1B3FAB] text-white shadow-sm"
              : "bg-slate-100 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          }`}
        >
          {label}
          {count !== undefined && (
            <span className={`text-[10px] px-1.5 rounded-full font-bold ${
              active === key ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600 dark:text-slate-400 dark:bg-slate-700"
            }`}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BusinessOverview({ onPostJob, onViewProjects, isVerified }) {
  const navigate = useNavigate();
  // Billing & Subscriptions moved out of Settings into its own Billing &
  // Payments page (BusinessPayments.jsx) — each CTA below jumps straight to
  // the sub-tab that actually answers it, instead of always landing on the
  // page's default Invoices & Escrow tab.
  const goToPayments = (paymentsTab) => navigate("/business-dashboard", { state: { tab: "payments", paymentsTab } });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [txFilter, setTxFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    listProjects({ role: "business" })
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your projects.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // "Active Projects" here means live, non-terminal work — completed ones
  // have their own History section on the Projects page, not this widget.
  const activeProjects = useMemo(() => projects.filter((p) => ACTIVE_STATUSES.has(p.status)), [projects]);
  const heldProjects = useMemo(() => activeProjects.filter((p) => FUNDS_HELD_STATUSES.has(p.status)), [activeProjects]);
  const completedProjects = useMemo(() => projects.filter((p) => p.status === "COMPLETED"), [projects]);

  const statusGroup = (p) => (p.status === "FILES_SUBMITTED" ? "review" : "active");

  const filteredProjects = projectFilter === "all"
    ? activeProjects
    : activeProjects.filter((p) => statusGroup(p) === projectFilter);

  const securedTotal = heldProjects.reduce((s, p) => s + Number(p.budget), 0);

  // "Delivered" always reflects the full project budget, matching what the
  // Business funded/secured for the same project — the Business never sees
  // a fee-reduced figure (that split only exists on the Worker's side of
  // the ledger).
  const completedSplits = useMemo(
    () =>
      completedProjects.map((p) => {
        const budget = Number(p.budget);
        return { project: p, budget, delivered: budget };
      }),
    [completedProjects]
  );
  const deliveredTotal = completedSplits.reduce((s, c) => s + c.delivered, 0);
  const workersHired = new Set(projects.filter((p) => p.status !== "INVITED").map((p) => p.worker_id)).size;
  const avgBudget = projects.length ? projects.reduce((s, p) => s + Number(p.budget), 0) / projects.length : 0;

  // Payment history feed — flattened from each project's own real `timeline`
  // (recorded server-side on every status change), not a separate ledger
  // endpoint (a business has no wallet_balance in this schema — only
  // workers do — so there's nothing else to read this from).
  const paymentFeed = useMemo(() => {
    const rows = [];
    for (const p of projects) {
      const budget = Number(p.budget);
      for (const event of p.timeline ?? []) {
        if (event.status === "FUNDS_SECURED") {
          rows.push({
            id: `${p.id}-secured`,
            type: "secured",
            desc: `Funds Secured – ${p.title}`,
            worker: p.worker_name,
            amount: budget,
            at: event.at,
          });
        }
        if (event.status === "COMPLETED") {
          // Same amount as the "Funds Secured" row above — the Business
          // never sees a fee-reduced figure, that split only exists on the
          // Worker's side of the ledger.
          rows.push({
            id: `${p.id}-delivered`,
            type: "delivered",
            desc: `Payment Released – ${p.title}`,
            worker: p.worker_name,
            amount: budget,
            at: event.at,
          });
        }
      }
    }
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [projects]);

  const filteredTxn = txFilter === "all" ? paymentFeed : paymentFeed.filter((t) => t.type === txFilter);

  const PROJECT_FILTERS = [
    { key: "all", label: "All", count: activeProjects.length },
    { key: "active", label: "In Progress", count: activeProjects.filter((p) => statusGroup(p) === "active").length },
    { key: "review", label: "In Review", count: activeProjects.filter((p) => statusGroup(p) === "review").length },
  ];
  const TX_FILTERS = [
    { key: "all", label: "All", count: paymentFeed.length },
    { key: "secured", label: "Secured", count: paymentFeed.filter((t) => t.type === "secured").length },
    { key: "delivered", label: "Delivered", count: paymentFeed.filter((t) => t.type === "delivered").length },
  ];

  const TX_META = {
    secured: { icon: Shield, bg: "bg-emerald-50 dark:bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", sign: "–" },
    delivered: { icon: CheckCircle2, bg: "bg-purple-50 dark:bg-purple-500/10", color: "text-purple-600 dark:text-purple-400", badge: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400", sign: "+" },
    fee: { icon: Receipt, bg: "bg-amber-50 dark:bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", sign: "–" },
  };

  // Monthly activity, grouped from the same real feed — sparse/mostly-empty
  // on a new account is expected, not a bug (no fabricated history).
  const monthly = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, m: d.toLocaleDateString("en-IN", { month: "short" }), secured: 0, delivered: 0 });
    }
    for (const row of paymentFeed) {
      const d = new Date(row.at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((mo) => mo.key === key);
      if (!bucket) continue;
      if (row.type === "secured") bucket.secured += row.amount;
      if (row.type === "delivered") bucket.delivered += row.amount;
    }
    return months;
  }, [paymentFeed]);

  const deliveredThisMonth = useMemo(() => {
    const now = new Date();
    return completedSplits
      .filter((c) => {
        const at = c.project.timeline?.find((e) => e.status === "COMPLETED")?.at;
        if (!at) return false;
        const d = new Date(at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, c) => s + c.delivered, 0);
  }, [completedSplits]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-7 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-7 dark:bg-slate-950">
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#e0e9ff] via-[#eef5ff] to-[#e9fff5] p-7 wb-tab-enter dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* absolute (not fixed) — these must scroll away with the page. fixed
          pins them to the viewport instead of this container, so they used
          to bleed through onto whatever content scrolled underneath them,
          reading as a phantom "header" that never went away. */}
      <div className="pointer-events-none absolute -top-24 -left-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#1B3FAB]/25 blur-[110px]" />
      <div className="pointer-events-none absolute top-56 -right-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-emerald-400/20 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-96 w-96 rounded-full bg-purple-400/20 blur-[110px]" />
      <div className="relative w-full">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {/* <h1
                className="text-2xl font-extrabold text-[#0F172A] dark:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Overview
              </h1> */}
              {/* <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </span> */}
            </div>
          </div>
          <button
            onClick={onPostJob}
            className="flex items-center gap-2 px-5 py-3 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#E55E1F] hover:-translate-y-0.5 transition-all duration-200 shadow-md shadow-[#FF6B35]/30"
          >
            {isVerified ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            Post a Job
          </button>
        </div>

        {/* ── KPI Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Active Projects", value: String(activeProjects.length),
              icon: Briefcase, iconBg: "bg-blue-100 dark:bg-blue-500/10", iconColor: "text-[#1B3FAB] dark:text-blue-400", valueColor: "text-[#1B3FAB] dark:text-blue-400",
              cardBg: "bg-blue-50/70 border-blue-100/80 dark:bg-slate-900/60 dark:border-slate-800",
              spark: monthly.map((m) => m.secured), sparkColor: "#1B3FAB", sparkDarkColor: "#60a5fa",
            },
            {
              label: "Funds in Process", value: formatINR(securedTotal), sub: "Secured for active projects",
              subColor: "text-slate-600 dark:text-slate-400", icon: Shield,
              iconBg: "bg-emerald-100 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400", valueColor: "text-emerald-600 dark:text-emerald-400",
              cardBg: "bg-emerald-50/70 border-emerald-100/80 dark:bg-slate-900/60 dark:border-slate-800",
              spark: monthly.map((m) => m.secured), sparkColor: "#10b981", sparkDarkColor: "#34d399",
            },
            {
              label: "Funds Delivered", value: formatINR(deliveredTotal), sub: "Paid to workers all-time",
              subColor: "text-slate-600 dark:text-slate-400", icon: CheckCircle2,
              iconBg: "bg-purple-100 dark:bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400", valueColor: "text-purple-600 dark:text-purple-400",
              cardBg: "bg-purple-50/70 border-purple-100/80 dark:bg-slate-900/60 dark:border-slate-800",
              spark: monthly.map((m) => m.delivered), sparkColor: "#9333ea", sparkDarkColor: "#c084fc",
            },
            {
              label: "Workers Hired", value: String(workersHired), sub: "All-time placements",
              subColor: "text-slate-600 dark:text-slate-400", icon: UserCheck,
              iconBg: "bg-orange-100 dark:bg-orange-500/10", iconColor: "text-[#FF6B35] dark:text-orange-400", valueColor: "text-[#FF6B35] dark:text-orange-400",
              cardBg: "bg-orange-50/70 border-orange-100/80 dark:bg-slate-900/60 dark:border-slate-800",
              spark: monthly.map((m) => m.secured + m.delivered), sparkColor: "#FF6B35", sparkDarkColor: "#fb923c",
            },
          ].map(({ label, value, sub, subColor, icon: Icon, iconBg, iconColor, valueColor, cardBg, spark, sparkColor, sparkDarkColor }, i) => (
            <div
              key={label}
              className={`rounded-2xl border backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] p-5 wb-card-enter ${cardBg}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <Sparkline data={spark} color={sparkColor} darkColor={sparkDarkColor} />
              </div>
              <div
                className={`text-2xl font-extrabold ${valueColor} leading-none mb-1`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {value}
              </div>
              <div className="text-sm font-semibold text-[#0F172A] dark:text-white">{label}</div>
              {sub && (
                <div className={`text-xs mt-0.5 flex items-center gap-1 ${subColor}`}>
                  {i === 0 && <TrendingUp className="w-3 h-3" />}
                  {sub}
                </div>
              )}
            </div>
          ))}
        </div>

        <EnterprisePartnerTierCard />

        {/* Growth Hub — real upsell CTAs pointing at Settings > Billing
            (the actual pricing shown there, same "preview — not live yet"
            honesty as everywhere else money-related on WorkBridge). Same
            soft glassmorphic language as the KPI cards above it (rounded
            corners, translucent blur, thin colored border) — the earlier
            brutalist treatment (hard black border, sharp corners) clashed
            with the rest of the page's visual system instead of reading as
            a deliberate accent. The Verification card hides once isVerified
            is real and true — no point advertising something already owned. */}
        <div className={`mt-6 grid grid-cols-1 gap-4 ${isVerified ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {!isVerified && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-emerald-100/80 bg-emerald-50/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Stand out to top talent</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                    Unlock your Verified Company Frame and build trust.
                  </p>
                </div>
                <button
                  onClick={() => goToPayments("trust")}
                  className="flex-shrink-0 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                >
                  Get Verified — ₹399
                </button>
              </div>
            </motion.div>
          )}

          {/* Full Trust Frame upsell — the real ₹699 "Elite — Gold Standard"
              tier from VerificationFeesTable.jsx (Settings > Billing). Unlike
              the Business Verified card above, this one stays visible even
              after isVerified is true — Full Trust is a further, optional
              purchase on top of plain verification, not a duplicate of it.
              Reuses the same gold ring swatch real Full Trust avatars would
              get (verifiedRingClass) so the preview never drifts from what
              buying it actually unlocks. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
            className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] p-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900"
          >
            <div className="flex items-center gap-4">
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 ${verifiedRingClass(true, "sm", "gold")}`}>
                <BadgeCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Go Gold Verified</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                    Elite
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                  Background check + a glowing Gold Trust Frame.
                </p>
              </div>
              <button
                onClick={() => goToPayments("trust")}
                className="flex-shrink-0 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
              >
                Get Full Trust — ₹699
              </button>
            </div>
          </motion.div>

          {/* Same amber/gold treatment as EnterprisePartnerTierCard.jsx's
              Gold tier, on request — ties this ad visually to the real tier
              card right above it instead of using its own separate color. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] p-4 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm dark:bg-slate-800">
                <Zap className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Need to scale faster?</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                    Premium
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                  Unlimited posts and a dedicated manager on Growth.
                </p>
              </div>
              <button
                onClick={() => toast.info("Subscriptions are coming soon!")}
                className="flex-shrink-0 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
              >
                Upgrade Plan
              </button>
            </div>
          </motion.div>
        </div>

        {/* ── Middle: Projects + Fund Flow ───────────────────────────────── */}
        {/* items-start — same fix as the bottom grid: without it, the
            shorter Funds in Process / Financial Summary column stretched to
            match the Active Projects table's height (or vice versa),
            instead of each card sizing to its own real content.
            lg:pr-24 — SupportFab.jsx is fixed at bottom-24 right-6
            (viewport-relative, ~80px footprint from the right edge). On a
            short/empty-state Overview this grid's own natural height fits
            within the viewport with no scroll possible, so the right
            column's last card can land with its numbers genuinely
            unreadable underneath the button (confirmed via bounding-box
            overlap) — margin/padding *after* the card doesn't help, since
            its position is set by content above it, not below. Reserving
            horizontal clearance on the whole row is the fix that actually
            works regardless of content height or scroll position. */}
        <div className="grid grid-cols-1 items-start gap-5 mt-6 mb-5 lg:grid-cols-3 lg:pr-24">

          {/* Active Projects table */}
          <div
            className="lg:col-span-2 rounded-2xl border border-indigo-100/70 bg-[#F7F9FF]/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900/60 overflow-hidden wb-card-enter"
            style={{ animationDelay: "240ms" }}
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3
                  className="font-bold text-[#0F172A] dark:text-white text-sm"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Active Projects
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{filteredProjects.length} matching</p>
              </div>
              <button
                onClick={onViewProjects}
                className="flex items-center gap-1 text-[#1B3FAB] dark:text-blue-400 text-xs font-semibold hover:underline"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="px-5 py-3 bg-white/30 border-b border-white/50 dark:bg-slate-900/40 dark:border-slate-800">
              <Chips options={PROJECT_FILTERS} active={projectFilter} onChange={setProjectFilter} />
            </div>

            <div className="px-5 py-2.5 grid grid-cols-12 gap-3 border-b border-slate-50 dark:border-slate-800">
              {[
                { label: "PROJECT", cls: "col-span-5" },
                { label: "STATUS", cls: "col-span-3 text-center" },
                { label: "PROGRESS", cls: "col-span-2 text-center" },
                { label: "BUDGET", cls: "col-span-2 text-right" },
              ].map(({ label, cls }) => (
                <span key={label} className={`${cls} text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400`}>
                  {label}
                </span>
              ))}
            </div>

            {/* Capped to roughly 4 visible rows (same 300px cap as Payment
                History below) with a smooth, chrome-free internal scroll —
                showing all 6+ rows uncapped made this card much taller than
                the Funds in Process/Financial Summary column beside it,
                leaving a big empty gap under the shorter column. */}
            <div className="wb-scroll-clean max-h-[300px] divide-y divide-slate-50 overflow-y-auto scroll-smooth dark:divide-slate-800">
              {filteredProjects.length > 0 ? filteredProjects.map((p, i) => (
                <div
                  key={p.id}
                  className="px-5 py-4 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors wb-card-enter"
                  style={{ animationDelay: `${(i + 4) * 50}ms` }}
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar initials={getInitials(p.worker_name)} avatarUrl={p.worker_avatar_url} size="w-8 h-8" text="text-xs" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#0F172A] dark:text-white text-sm truncate">{p.title}</div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{p.worker_name} · {p.deadline ? new Date(p.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      statusGroup(p) === "active"
                        ? "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-900/40"
                        : "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40"
                    }`}>
                      {statusGroup(p) === "active" ? "In Progress" : "In Review"}
                    </span>
                  </div>

                  <div className="col-span-2 flex flex-col items-center gap-1">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF6B35] rounded-full wb-milestone-fill"
                        style={{ width: `${((PROJECT_STATUS_FLOW.indexOf(p.status) + 1) / PROJECT_STATUS_FLOW.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                      {PROJECT_STATUS_FLOW.indexOf(p.status) + 1}/{PROJECT_STATUS_FLOW.length}
                    </span>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white">{formatINR(p.budget)}</span>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-slate-600 dark:text-slate-400 text-sm">
                  No projects match this filter
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Fund Flow */}
          <div className="space-y-4">

            <div
              className="rounded-2xl border border-indigo-100/70 bg-[#F7F9FF]/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900/60 p-5 wb-card-enter"
              style={{ animationDelay: "300ms" }}
            >
              <h3
                className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-4"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Funds in Process
              </h3>
              {heldProjects.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">No funds currently held in escrow.</p>
              ) : (
                <div className="space-y-4">
                  {heldProjects.map((p) => {
                    const amt = Number(p.budget);
                    const pct = securedTotal ? Math.round((amt / securedTotal) * 100) : 0;
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar initials={getInitials(p.worker_name)} avatarUrl={p.worker_avatar_url} size="w-6 h-6" text="text-[9px]" />
                            <span className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">{p.title}</span>
                          </div>
                          <span className="text-xs font-bold text-[#1B3FAB] dark:text-blue-400 flex-shrink-0 ml-2">{formatINR(p.budget)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1B3FAB] rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-slate-600 dark:text-slate-400">{pct}% of total</span>
                          <span className={`text-[10px] font-bold ${
                            statusGroup(p) === "active" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {statusGroup(p) === "active" ? "In Progress" : "In Review"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Secured</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatINR(securedTotal)}</span>
              </div>
            </div>

            <div
              className="rounded-2xl border border-indigo-100/70 bg-[#F7F9FF]/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900/60 p-5 wb-card-enter"
              style={{ animationDelay: "360ms" }}
            >
              <h3
                className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-4"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Financial Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Delivered this month", value: formatINR(deliveredThisMonth), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
                  { label: "Total delivered", value: formatINR(deliveredTotal), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                  { label: "Avg. project budget", value: formatINR(avgBudget), color: "text-[#1B3FAB] dark:text-blue-400", bg: "bg-[#F4F6FF] dark:bg-blue-500/10" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</span>
                    <span className={`text-xs font-bold flex-shrink-0 ${color} ${bg} px-2 py-0.5 rounded-lg`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Transaction History + Spend Chart ───────────────────── */}
        {/* Stretch (grid default) so Spending Overview's card matches
            Payment History's height exactly instead of stopping short at
            its own smaller natural content height. */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">

          <div
            className="rounded-2xl border border-indigo-100/70 bg-[#F7F9FF]/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900/60 overflow-hidden wb-card-enter"
            style={{ animationDelay: "420ms" }}
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3
                className="font-bold text-[#0F172A] dark:text-white text-sm"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Payment History
              </h3>
            </div>

            <div className="px-5 py-3 bg-white/30 border-b border-white/50 dark:bg-slate-900/40 dark:border-slate-800">
              <Chips options={TX_FILTERS} active={txFilter} onChange={setTxFilter} />
            </div>

            <div className="wb-scroll-clean divide-y divide-slate-50 dark:divide-slate-800 max-h-[300px] overflow-y-auto">
              {filteredTxn.length > 0 ? filteredTxn.map((tx) => {
                const meta = TX_META[tx.type];
                const TxIcon = meta.icon;
                return (
                  <div
                    key={tx.id}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`w-9 h-9 ${meta.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <TxIcon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">{tx.desc}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {new Date(tx.at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        {tx.worker && <span className="ml-1.5 text-slate-300">·</span>}
                        {tx.worker && <span className="ml-1.5 font-semibold text-slate-500 dark:text-slate-400">{tx.worker}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`text-sm font-bold ${meta.color}`}>
                        {meta.sign}{formatINR(tx.amount)}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.badge}`}>
                        {tx.type === "delivered" ? "Delivered" : tx.type === "secured" ? "Secured" : "Fee"}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className="px-5 py-10 text-center text-slate-600 dark:text-slate-400 text-sm">
                  No transactions match this filter
                </div>
              )}
            </div>
          </div>

          {/* Monthly Spending Chart */}
          <div
            className="flex flex-col rounded-2xl border border-indigo-100/70 bg-[#F7F9FF]/90 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900/60 p-5 wb-card-enter"
            style={{ animationDelay: "480ms" }}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3
                  className="font-bold text-[#0F172A] dark:text-white text-sm"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Spending Overview
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Monthly fund activity</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-sm bg-[#1B3FAB] flex-shrink-0" /> Secured
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-sm bg-purple-400 flex-shrink-0" /> Delivered
                </span>
              </div>
            </div>

            <div className="relative mt-5 mb-3" style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={3}>
                  <defs>
                    <linearGradient id="securedBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3757d6" />
                      <stop offset="100%" stopColor="#1B3FAB" />
                    </linearGradient>
                    <linearGradient id="deliveredBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d8b4fe" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="m"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<SpendingTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="secured" name="secured" fill="url(#securedBarGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="delivered" name="delivered" fill="url(#deliveredBarGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-auto h-px bg-slate-100 dark:bg-slate-800 my-4" />

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Total Secured", value: formatINR(monthly.reduce((s, m) => s + m.secured, 0)), color: "text-[#1B3FAB] dark:text-blue-400" },
                { label: "Total Delivered", value: formatINR(monthly.reduce((s, m) => s + m.delivered, 0)), color: "text-purple-600 dark:text-purple-400" },
                { label: "Still Held", value: formatINR(securedTotal), color: "text-emerald-600 dark:text-emerald-400" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
                  <p
                    className={`text-sm font-extrabold mt-0.5 ${color}`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
