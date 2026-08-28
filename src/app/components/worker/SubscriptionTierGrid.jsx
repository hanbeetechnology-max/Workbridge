import { Wallet, Ticket, Crown, ShieldCheck, Check } from "lucide-react";

// Extracted verbatim from the pre-merge WorkerWallet.jsx — the Wallet page
// redesign (Financial Vault + Transactions/Invoices tabs) didn't call for
// this section, so it's relocated here rather than deleted. Note: this is
// a SEPARATE, behavior_score-gated Basic/Pro/Elite concept from
// WorkerSubscriptionsPage.jsx's token-priced Free/Pro/Elite tiers — two
// different subscription designs currently coexist in this app; this file
// doesn't resolve that, just preserves the logic that was here.
const GOOD_STANDING = 600;

const TIERS = [
  {
    id: "basic",
    name: "Basic",
    tagline: "For getting started",
    price: "₹0",
    period: "/forever",
    icon: Wallet,
    features: [
      "Apply to jobs via the skill quiz path",
      "Standard visibility in the job feed",
      "Community support",
    ],
    cta: "Current Plan",
    accent: {
      border: "border-slate-200 dark:border-slate-700",
      card: "bg-white/50 dark:bg-slate-900/50",
      iconBg: "bg-slate-100 dark:bg-slate-800",
      iconColor: "text-slate-500 dark:text-slate-400",
      button: "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500",
      priceColor: "text-slate-900 dark:text-white",
    },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For consistent Workers",
    price: "₹299",
    period: "/mo",
    icon: Ticket,
    badge: "Most Popular",
    features: [
      "5 penalty-free applies / month",
      "Featured badge on proposals",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    accent: {
      border: "border-[#FF6B35]/40",
      card: "bg-gradient-to-br from-orange-50/60 via-white/50 to-white/50 dark:from-orange-500/10 dark:via-slate-900/50 dark:to-slate-900/50",
      iconBg: "bg-[#FF6B35]/10",
      iconColor: "text-[#FF6B35]",
      button: "bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-200 dark:shadow-orange-500/10",
      priceColor: "text-slate-900 dark:text-white",
    },
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Risk-free visibility, Good Standing only",
    price: "₹599",
    period: "/mo",
    icon: Crown,
    features: [
      "First Job Promise — land nothing in 10 applies? Next month's free.",
      "10 penalty-free applies / month",
      "Fully expanded proposals with the glowing Elite badge",
    ],
    cta: "Upgrade to Elite",
    accent: {
      border: "border-amber-300/60 dark:border-amber-500/30",
      card: "bg-gradient-to-br from-amber-50/70 via-white/50 to-white/50 dark:from-amber-500/10 dark:via-slate-900/50 dark:to-slate-900/50",
      iconBg: "bg-gradient-to-br from-amber-400 to-amber-500",
      iconColor: "text-white",
      button: "bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:shadow-xl shadow-lg shadow-amber-200 dark:shadow-amber-500/10",
      priceColor: "text-slate-900 dark:text-white",
    },
    gated: true,
  },
];

export default function SubscriptionTierGrid({ behaviorScore }) {
  const inGoodStanding = behaviorScore >= GOOD_STANDING;
  const scorePct = Math.min(100, (behaviorScore / 1000) * 100);

  return (
    <div className="mt-8 wb-card-enter" style={{ animationDelay: "400ms" }}>
      <div className="mb-5 text-center">
        <h2 className="font-display text-lg font-extrabold text-[#0F172A] dark:text-white">
          WorkBridge Plans
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Boost your visibility as you build trust on the platform.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isElite = tier.id === "elite";
          const eliteLocked = isElite && !inGoodStanding;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border ${tier.accent.border} ${tier.accent.card} backdrop-blur-xl shadow-lg shadow-slate-200/40 p-6`}
            >
              {tier.badge && (
                <span className="absolute right-5 top-5 rounded-full bg-[#FF6B35] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {tier.badge}
                </span>
              )}

              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tier.accent.iconBg} ${tier.accent.iconColor}`}>
                <Icon className="h-5 w-5" />
              </span>

              <h3 className="font-display mt-4 text-lg font-extrabold text-[#0F172A] dark:text-white">
                {tier.name}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tier.tagline}</p>

              <p className={`font-display mt-4 text-3xl font-extrabold ${tier.accent.priceColor}`}>
                {tier.price}
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">{tier.period}</span>
              </p>

              <ul className="mt-5 flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Check className="h-3 w-3" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isElite && (
                <div className="mt-5 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md p-4 dark:border-slate-700/70 dark:bg-slate-800/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <ShieldCheck className={`h-3.5 w-3.5 ${inGoodStanding ? "text-emerald-500" : "text-rose-500"}`} />
                      Score: {behaviorScore} / 1000
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${inGoodStanding ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                      {inGoodStanding ? "Eligible" : "Below 600"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${inGoodStanding ? "bg-emerald-500" : "bg-rose-400"}`}
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                disabled={tier.id === "basic" || eliteLocked}
                className={`mt-6 min-h-[44px] w-full rounded-xl py-3 text-sm font-black transition-all duration-300 hover:-translate-y-0.5 disabled:hover:translate-y-0 ${
                  eliteLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500" : tier.accent.button
                }`}
              >
                {eliteLocked ? "Reach 600 to unlock" : tier.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
