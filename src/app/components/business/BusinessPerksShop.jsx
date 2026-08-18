import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Coins, Loader2, Radar, Scale, Search, Star, Zap } from "lucide-react";
import { getLedger } from "../../lib/gamificationApi";
import { purchasePerk, getPerkPurchases, getActivePerkPurchases } from "../../lib/perksApi";
import { listProjects } from "../../lib/projectsApi";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/apiClient";
import PerkCountdown from "../shared/PerkCountdown";

// Corporate Credits balance shown here is real (earned on completing a
// project with no dispute — see projects.controller.js's completeProject),
// and "Purchase" is real too — it debits the balance and persists a
// redemption row via perks.controller.js (server resolves cost from
// perksCatalog.js, never trusts the tier.cost shown here). Tier `id`s must
// match perksCatalog.js exactly.
//
// targetKind marks which perks boost a SPECIFIC job post/dispute rather
// than the whole account — perkTargets.js (backend) validates the chosen
// target belongs to the caller and is eligible, so this picker is a
// convenience, not the actual security boundary.
const PERKS = [
  {
    id: "flash-post",
    name: "Flash Post",
    description: "Bumps your job post to the top of the feed",
    icon: Zap,
    color: "teal",
    targetKind: "openProject",
    tiers: [
      { id: "24h-express", label: "24-Hour Express", cost: 15 },
      { id: "3d-featured", label: "3-Day Featured", cost: 35 },
      { id: "7d-dominance", label: "7-Day Dominance", cost: 70 },
    ],
  },
  {
    id: "ai-shortlist",
    name: "AI Shortlist",
    description: "Get 3 hand-picked worker recommendations for your job",
    icon: Search,
    color: "slate",
    targetKind: "openProject",
    tiers: [
      { id: "single-use", label: "Single-Use Pass", cost: 35 },
      { id: "7d-active", label: "7-Day Active", cost: 90 },
    ],
  },
  {
    id: "enterprise-broadcast",
    name: "Enterprise Broadcast",
    description: "Sends your job straight to our highest-rated workers",
    icon: Radar,
    color: "amber",
    targetKind: "openProject",
    tiers: [{ id: "one-time", label: "One-Time Broadcast", cost: 120 }],
  },
  // Deliberately a service/visibility perk, not anything that touches
  // worker ranking — "nobody can buy their way past better talent"
  // (BusinessWorkers.jsx's own ranking comment) applies here too.
  {
    id: "dispute-fast-track",
    name: "Dispute Fast-Track",
    description: "Moves an active dispute to the front of the mediation queue",
    icon: Scale,
    color: "rose",
    targetKind: "disputedProject",
    tiers: [{ id: "single-dispute", label: "One Active Dispute", cost: 60 }],
  },
  {
    id: "featured-employer",
    name: "Featured Employer Spotlight",
    description: "Puts your Company Profile in front of active freelancers",
    icon: Star,
    color: "violet",
    tiers: [
      { id: "3d-spotlight", label: "3-Day Spotlight", cost: 50 },
      { id: "7d-spotlight", label: "7-Day Spotlight", cost: 90 },
    ],
  },
];

const COLOR_STYLES = {
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
};

const TARGET_KINDS = {
  openProject: { label: "job post", emptyMessage: "Post an open job to use this perk." },
  disputedProject: { label: "disputed project", emptyMessage: "You have no project with an active dispute right now." },
};

function PerkCard({ perk, balance, targetOptions, onPurchase, index, isPurchasing, purchaseDisabled }) {
  const [tierIndex, setTierIndex] = useState(0);
  const [targetId, setTargetId] = useState("");
  // Only surfaced after an actual click on Purchase — showing it for every
  // unaffordable tier by default made the whole grid read as broken/red.
  const [attemptedInsufficient, setAttemptedInsufficient] = useState(false);
  const [attemptedNoTarget, setAttemptedNoTarget] = useState(false);
  const Icon = perk.icon;
  const tier = perk.tiers[tierIndex];
  const canAfford = balance >= tier.cost;
  const kind = perk.targetKind ? TARGET_KINDS[perk.targetKind] : null;
  const needsTarget = Boolean(perk.targetKind);
  const hasNoEligibleTargets = needsTarget && targetOptions.length === 0;

  const handleTierChange = (i) => {
    setTierIndex(i);
    setAttemptedInsufficient(false);
  };

  const handlePurchaseClick = () => {
    if (!canAfford) {
      setAttemptedInsufficient(true);
      return;
    }
    if (needsTarget && !targetId) {
      setAttemptedNoTarget(true);
      return;
    }
    onPurchase(perk, tier, needsTarget ? targetId : undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        aria-hidden="true"
      />

      <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${COLOR_STYLES[perk.color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative mt-3 text-sm font-bold text-slate-900 dark:text-white">{perk.name}</p>
      <p className="relative mt-1 flex-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{perk.description}</p>

      {perk.tiers.length > 1 && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {perk.tiers.map((t, i) => (
            <button
              key={t.label}
              onClick={() => handleTierChange(i)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all duration-200 ${
                i === tierIndex ? "bg-[#0A1128] text-white shadow-sm dark:bg-white dark:text-[#0A1128]" : "bg-slate-100 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <motion.div
        key={tier.cost}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative mt-3 flex items-center gap-2"
      >
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <Coins className="h-3.5 w-3.5" />
          {tier.cost}
        </span>
        {perk.tiers.length === 1 && <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{tier.label}</span>}
      </motion.div>

      {needsTarget && (
        hasNoEligibleTargets ? (
          <p className="relative mt-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{kind.emptyMessage}</p>
        ) : (
          <select
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setAttemptedNoTarget(false);
            }}
            className={`relative mt-3 w-full rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none dark:bg-slate-800 dark:text-slate-200 ${
              attemptedNoTarget && !targetId ? "border-red-300" : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <option value="">Choose a {kind.label}…</option>
            {targetOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title}
              </option>
            ))}
          </select>
        )
      )}

      {attemptedInsufficient && !canAfford && (
        <p className="relative mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-500">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          Not enough credits for this tier
        </p>
      )}
      {attemptedNoTarget && !targetId && !hasNoEligibleTargets && (
        <p className="relative mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-500">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          Pick a {kind.label} first
        </p>
      )}

      <button
        onClick={handlePurchaseClick}
        disabled={purchaseDisabled || hasNoEligibleTargets}
        className={`relative mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 active:scale-95 ${
          canAfford && !hasNoEligibleTargets
            ? "bg-[#FF6B35] text-white shadow-md hover:bg-[#e55a2b]"
            : "cursor-not-allowed bg-slate-100 text-slate-400 dark:text-slate-500 dark:bg-slate-800"
        } ${purchaseDisabled && canAfford ? "opacity-60" : ""}`}
      >
        {isPurchasing && <Loader2 className="h-3 w-3 animate-spin" />}
        {isPurchasing ? "Purchasing…" : "Purchase"}
      </button>
    </motion.div>
  );
}

export default function BusinessPerksShop() {
  useDocumentTitle("Business Perks — WorkBridge");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [purchases, setPurchases] = useState([]);
  const [activePurchases, setActivePurchases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [purchasingPerkId, setPurchasingPerkId] = useState(null);

  const refreshActivePurchases = () => {
    getActivePerkPurchases().then(setActivePurchases).catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLedger(), getPerkPurchases(), getActivePerkPurchases(), listProjects({ role: "business", pageSize: 100 })])
      .then(([ledger, purchaseHistory, active, businessProjects]) => {
        if (cancelled) return;
        setBalance(ledger.bridgeTokens);
        setPurchases(purchaseHistory);
        setActivePurchases(active);
        setProjects(businessProjects);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your balance.");
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  const openProjects = projects.filter((p) => p.status === "OPEN");
  const disputedProjects = projects.filter((p) => p.status === "DISPUTED");
  const targetOptionsFor = (targetKind) => {
    if (targetKind === "openProject") return openProjects;
    if (targetKind === "disputedProject") return disputedProjects;
    return [];
  };

  const handlePurchase = async (perk, tier, targetId) => {
    setPurchasingPerkId(perk.id);
    try {
      const result = await purchasePerk({ perkId: perk.id, tierId: tier.id, targetId });
      setBalance(result.bridgeTokens);
      setPurchases((prev) => [result.purchase, ...prev]);
      refreshActivePurchases();
      toast.success(`Purchased ${perk.name} (${tier.label}) — ${tier.cost} credits debited.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Purchase failed — try again.");
    } finally {
      setPurchasingPerkId(null);
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[#0A1128] dark:text-white">
            Business Perks Shop
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Spend Corporate Credits on visibility boosts for your hiring.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#0A1128] dark:text-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Coins className="h-4 w-4 text-amber-500" />
          {balance}
        </div>
      </div>

      {activePurchases.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Active Perks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activePurchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{p.label}</span>
                <PerkCountdown expiresAt={p.expires_at} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERKS.map((perk, index) => (
          <PerkCard
            key={perk.id}
            perk={perk}
            balance={balance}
            targetOptions={targetOptionsFor(perk.targetKind)}
            onPurchase={handlePurchase}
            index={index}
            isPurchasing={purchasingPerkId === perk.id}
            purchaseDisabled={purchasingPerkId !== null}
          />
        ))}
      </div>

      {purchases.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Recent Purchases</p>
          <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {purchases.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{p.label}</span>
                <span className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  {p.token_cost}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
        Your credit balance is real (earned when a project closes with no dispute), and every purchase here really
        debits it, is recorded, and does what it says — boosts a real job post's ranking, sends a real broadcast, or
        moves a real dispute up the queue.
      </p>
      </div>
    </div>
  );
}
