import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Building2, Check, CheckCircle2, FileText, Loader2, RotateCcw,
  ShieldCheck, TrendingUp,
} from "lucide-react";
import { listProjects } from "../../lib/projectsApi";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/apiClient";
import VerificationFeesTable from "../shared/VerificationFeesTable";
import ComingSoonOverlay from "../shared/ComingSoonOverlay";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

const SUB_TABS = [
  { id: "invoices", label: "Invoices & Escrow" },
  { id: "subscription", label: "Subscription Plans" },
  { id: "trust", label: "Trust & Verification" },
];

// ── Invoices & Escrow ───────────────────────────────────────────────────────
// Same real per-project timeline events BusinessOverview.jsx's "Payment
// History" widget reads (no separate ledger endpoint exists — a business has
// no wallet_balance in this schema, only workers do), plus a real refund row
// for any project that had funds secured before it was cancelled. This is
// the full ledger; the Overview widget stays a quick-glance preview of it.
const LEDGER_META = {
  secured: { icon: ShieldCheck, label: "Funds in Escrow", tone: "blue" },
  delivered: { icon: CheckCircle2, label: "Released", tone: "emerald" },
  refunded: { icon: RotateCcw, label: "Refunded", tone: "slate" },
};

const TONE_ICON = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const TONE_PILL = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function InvoicesTab({ projects, loading, loadError }) {
  const rows = useMemo(() => {
    const out = [];
    for (const p of projects) {
      const budget = Number(p.budget);
      const timeline = p.timeline ?? [];
      const hadFundsSecured = timeline.some((e) => e.status === "FUNDS_SECURED");
      for (const event of timeline) {
        if (event.status === "FUNDS_SECURED") {
          out.push({ id: `${p.id}-secured`, projectId: p.id, type: "secured", project: p.title, worker: p.worker_name, amount: budget, at: event.at });
        }
        if (event.status === "COMPLETED") {
          // Same amount as the "Funds in Escrow" row above — the Business
          // never sees a fee-reduced figure; that split only exists on the
          // Worker's side of the ledger.
          out.push({ id: `${p.id}-delivered`, projectId: p.id, type: "delivered", project: p.title, worker: p.worker_name, amount: budget, at: event.at });
        }
        if (event.status === "CANCELLED" && hadFundsSecured) {
          out.push({ id: `${p.id}-refunded`, projectId: p.id, type: "refunded", project: p.title, worker: p.worker_name, amount: budget, at: event.at });
        }
      }
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [projects]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
      </div>
    );
  }
  if (loadError) {
    return <p className="py-10 text-center text-sm text-red-500 dark:text-red-400">{loadError}</p>;
  }
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No payment activity yet.</p>;
  }

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {rows.map((r) => {
        const meta = LEDGER_META[r.type];
        const Icon = meta.icon;
        return (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap sm:gap-4">
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${TONE_ICON[meta.tone]}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{r.project}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                with {r.worker || "a freelancer"} · {new Date(r.at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_PILL[meta.tone]}`}>
              {meta.label}
            </span>
            <span className="flex-shrink-0 text-sm font-bold text-slate-900 dark:text-white">{formatINR(r.amount)}</span>
            <Link
              to={`/invoice?id=${r.projectId}`}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5" />
              View Invoice
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ── Subscription Plans ───────────────────────────────────────────────────────
// Real tiers/pricing, moved as-is from SettingsPage.jsx's old Billing &
// Subscriptions tab — "Free" stays the one real current-plan state since no
// paid tier can actually be bought yet (every paid button below is honestly
// disabled, not wired to a fabricated "upgrade" that doesn't exist).
const BUSINESS_TIERS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: ShieldCheck,
    perks: ["2 job posts/month", "Standard matching"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    icon: TrendingUp,
    highlight: true,
    perks: ["20 posts/month", "Smart matching", "Dashboard"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 1499,
    yearlyPrice: 14999,
    icon: Building2,
    premium: true,
    perks: ["Unlimited posts", "Bulk hiring", "Dedicated manager"],
  },
];

function formatBusinessTierPrice(tier, isYearly) {
  if (tier.monthlyPrice === 0) return { amount: "₹0", period: "/mo" };
  if (!isYearly) return { amount: `₹${tier.monthlyPrice.toLocaleString("en-IN")}`, period: "/mo" };
  return { amount: `₹${tier.yearlyPrice.toLocaleString("en-IN")}`, period: "/year (2 months free)" };
}

// Same real, controlled Monthly/Yearly toggle as WorkerWallet.jsx's — kept as
// its own copy here rather than a shared import, same precedent as before.
function BillingToggle({ isYearly, onChange }) {
  return (
    <div className="relative inline-flex items-center rounded-full bg-slate-100 p-1 dark:bg-slate-800">
      <motion.span
        className="absolute inset-y-1 left-1 w-24 rounded-full bg-white shadow-sm dark:bg-slate-700"
        animate={{ x: isYearly ? 96 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`relative z-10 w-24 rounded-full py-2 text-sm transition-colors ${
          !isYearly ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`relative z-10 w-24 rounded-full py-2 text-sm transition-colors ${
          isYearly ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        Yearly
      </button>
      <span className="absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#FF6B35]/10 px-2 py-1 text-[11px] font-bold text-[#FF6B35]">
        2 Months Free
      </span>
    </div>
  );
}

function SubscriptionTab() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Current Plan</p>
          <p className="font-display mt-1 text-2xl font-black text-[#0A1128] dark:text-white">
            Free
          </p>
        </div>
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </span>
      </div>

      <div className="flex justify-center">
        <BillingToggle isYearly={isYearly} onChange={setIsYearly} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {BUSINESS_TIERS.map((tier) => {
          const Icon = tier.icon;
          const { amount, period } = formatBusinessTierPrice(tier, isYearly);
          const cardCls = tier.premium
            ? "bg-[#0F172A] text-white border border-white/10 shadow-lg shadow-slate-900/20"
            : tier.highlight
              ? "bg-white border-2 border-[#FF6B35] shadow-md shadow-orange-500/10 dark:bg-slate-900"
              : "bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800";

          return (
            <div key={tier.id} className={`relative flex flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 ${cardCls}`}>
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FF6B35] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  Most Popular
                </span>
              )}
              <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tier.premium ? "bg-white/10 text-[#FF6B35]" : "bg-slate-100 text-[#1B3FAB] dark:bg-slate-800 dark:text-blue-400"}`}>
                <Icon className="h-4 w-4" />
              </span>

              <p className={`text-xs font-bold uppercase tracking-wide ${tier.premium ? "text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                {tier.name}
              </p>
              <p className="mt-1.5 flex items-baseline gap-1">
                <span className={`font-display text-2xl font-black ${tier.premium ? "" : "text-[#0A1128] dark:text-white"}`}>
                  {amount}
                </span>
                <span className={`text-xs font-semibold ${tier.premium ? "text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>{period}</span>
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-xs leading-5">
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                        tier.premium ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className={tier.premium ? "text-slate-300" : "text-slate-600 dark:text-slate-300"}>{perk}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled
                className={`mt-6 w-full cursor-not-allowed rounded-xl py-2.5 text-xs font-bold ${
                  tier.premium
                    ? "bg-white/10 text-slate-300"
                    : tier.id === "free"
                      ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      : "border border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                }`}
              >
                {tier.id === "free" ? "Current Plan" : "Coming soon"}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        Paid plans aren't live yet — this is a preview of what's coming.
      </p>
    </div>
  );
}

// ── Trust & Verification ─────────────────────────────────────────────────────
// The actual "Get Business Verified" action already lives in the sidebar
// (BusinessSidebar.jsx) and the Growth Hub (BusinessOverview.jsx) — both
// route to the real /verify wizard. This tab doesn't repeat that button
// (a duplicate CTA for the same real flow, right next to VerificationFeesTable's
// own honestly-disabled preview button for the identical tier, would just
// read as two different answers to "how do I verify"); it shows status plus
// the same real fee table used elsewhere.
function TrustTab({ isVerified }) {
  return (
    <div className="space-y-6">
      <div
        className={`flex items-center gap-4 rounded-2xl border p-6 ${
          isVerified
            ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"
        }`}
      >
        <span
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
            isVerified ? "bg-emerald-500 text-white" : "bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500"
          }`}
        >
          {isVerified ? <CheckCircle2 className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
        </span>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {isVerified ? "Your business is Verified" : "Not verified yet"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isVerified
              ? "Your company carries the Verified badge across WorkBridge — freelancers can trust every brief you publish."
              : 'Use "Get Business Verified" in the sidebar to start — the badges below build on top of that.'}
          </p>
        </div>
      </div>

      <VerificationFeesTable />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BusinessPayments({ isVerified }) {
  useDocumentTitle("Billing & Payments — WorkBridge");
  const location = useLocation();
  const [subTab, setSubTab] = useState(
    SUB_TABS.some((t) => t.id === location.state?.paymentsTab) ? location.state.paymentsTab : "invoices"
  );
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listProjects({ role: "business" })
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your payment history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 shadow-md sm:p-8">
        <h1 className="font-display text-xl font-extrabold text-white">
          Billing & Payments
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Every invoice, subscription plan, and verification payment for your business, in one place.
        </p>
      </div>

      <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
        {SUB_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-colors sm:text-sm ${
              subTab === id
                ? "bg-white text-[#0A1128] shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "invoices" && <InvoicesTab projects={projects} loading={loading} loadError={loadError} />}
      {subTab === "subscription" && (
        <ComingSoonOverlay
          title="Subscription Plans — Coming Soon"
          message="Paid plans need real payment processing, which isn't live yet. This will open up once it is."
        >
          <SubscriptionTab />
        </ComingSoonOverlay>
      )}
      {subTab === "trust" && (
        <ComingSoonOverlay
          title="Trust & Verification — Coming Soon"
          message="These paid trust badges need real payment processing, which isn't live yet. Your business verification itself is unaffected — that's still real and free."
        >
          <TrustTab isVerified={isVerified} />
        </ComingSoonOverlay>
      )}
    </div>
  );
}
