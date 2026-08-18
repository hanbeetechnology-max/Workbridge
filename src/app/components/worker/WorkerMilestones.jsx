import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Check, Loader2, Pin, PinOff } from "lucide-react";
import { getLedger } from "../../lib/gamificationApi";
import { pinBadge } from "../../lib/profilesApi";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { MILESTONES, getRankTier } from "../../lib/milestones";
import RankBadge from "../shared/RankBadge";

// MASTER_ECONOMY_PLAN.md Part 6's Worker Reward Roadmap, verbatim (see
// lib/milestones.js for the actual MILESTONES data, shared with
// RankBadge.jsx's shared rank/shape system). Only the Level/Tier badge
// boundaries (50/100/150/200, via getTierData) and the backend-only fee
// lookup are real today; everything else here (priority boosts, featured
// placement, mentor status, etc.) is still just the design's intent,
// called out explicitly below.
export { MILESTONES };

const TABS = ["All", "Unlocked", "Locked"];

function BadgeMedal({ milestone, achieved, isNext, index, pinned, pinning, onTogglePin }) {
  const rank = getRankTier(milestone.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border p-5 pt-7 text-center transition-all duration-300 ${
        pinned
          ? "border-[#FF6B35] bg-gradient-to-b from-[#2a1608] to-slate-950 shadow-[0_0_0_1px_rgba(255,107,53,0.3)] hover:-translate-y-1"
          : achieved
            ? "border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg hover:-translate-y-1 hover:shadow-2xl"
            : "border-slate-800/60 bg-slate-900/40"
      }`}
    >
      {isNext && (
        <span className="absolute -top-0.5 left-1/2 z-20 -translate-x-1/2 rounded-b-lg bg-[#FF6B35] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
          Next
        </span>
      )}

      {/* Pin-to-profile — exactly ONE badge at a time, unlike a 3-badge
          loadout; clicking the currently-pinned badge unpins it. */}
      {achieved && (
        <button
          type="button"
          onClick={onTogglePin}
          disabled={pinning}
          title={pinned ? "Unpin from profile" : "Show this badge on your profile avatar"}
          className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-60 ${
            pinned
              ? "border-[#FF6B35] bg-[#FF6B35] text-white"
              : "border-white/15 bg-white/10 text-slate-300 backdrop-blur-sm hover:border-[#FF6B35] hover:text-[#FF6B35]"
          }`}
        >
          {pinning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : pinned ? (
            <PinOff className="h-3.5 w-3.5" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      <div className="relative z-10 flex justify-center pb-2 pt-1">
        {isNext && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-[#FF6B35]"
            initial={{ scale: 1, opacity: 0.45 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* Real <svg> rank badge — one consistent scalloped-medal rosette,
            multi-stop metallic gradient escalating Bronze -> Silver -> Gold
            -> Diamond, a ribbon tail from Gold up, and its own infinite
            idle-float + pulsing glow. See RankBadge.jsx. */}
        <RankBadge level={milestone.level} achieved={achieved} size="lg" />
      </div>

      <div className="relative z-10">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${achieved ? "text-slate-400" : "text-slate-600"}`}>
          Level {milestone.level} {achieved && `· ${rank.label}`}
        </p>
        <p className={`mt-0.5 text-sm font-extrabold leading-tight ${achieved ? "text-white" : "text-slate-500"}`}>
          {milestone.name}
        </p>
        {pinned && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#FF6B35]">
            <Check className="h-3 w-3" /> On your profile
          </p>
        )}
      </div>

      <p className={`relative z-10 text-[11px] leading-4 ${achieved ? "text-slate-400" : "text-slate-600"}`}>{milestone.reward}</p>
    </motion.div>
  );
}

export default function WorkerMilestones({ embedded = false }) {
  useDocumentTitle("Badges — WorkBridge");
  const { currentUser, updateCurrentUser } = useAuth();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [pinningLevel, setPinningLevel] = useState(null);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getLedger()
      .then((data) => {
        if (!cancelled) setLedger(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your progress.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistic-free: waits for the server's real confirmation (it
  // re-validates current_level itself) before reflecting the change
  // everywhere Avatar.jsx reads currentUser.pinned_milestone_level from.
  const handleTogglePin = async (level) => {
    const nextLevel = currentUser?.pinned_milestone_level === level ? null : level;
    setPinningLevel(level);
    setPinError("");
    try {
      const result = await pinBadge(nextLevel);
      updateCurrentUser({ ...currentUser, pinned_milestone_level: result.pinnedMilestoneLevel });
    } catch (err) {
      setPinError(err instanceof ApiError ? err.message : "Could not update your pinned badge.");
    } finally {
      setPinningLevel(null);
    }
  };

  const currentLevel = ledger?.currentLevel ?? 0;
  const nextMilestone = useMemo(() => MILESTONES.find((m) => m.level > currentLevel), [currentLevel]);
  const unlockedCount = useMemo(() => MILESTONES.filter((m) => currentLevel >= m.level).length, [currentLevel]);

  const visibleMilestones = useMemo(() => {
    if (activeTab === "Unlocked") return MILESTONES.filter((m) => currentLevel >= m.level);
    if (activeTab === "Locked") return MILESTONES.filter((m) => currentLevel < m.level);
    return MILESTONES;
  }, [activeTab, currentLevel]);

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

  return (
    <div className={embedded ? "" : "w-full px-4 py-8 sm:px-6 sm:py-10"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {!embedded && (
            <h1 className="font-display text-xl font-extrabold text-[#0A1128] dark:text-white">
              Badges
            </h1>
          )}
          <p className={embedded ? "text-sm text-slate-500 dark:text-slate-400" : "mt-1 text-sm text-slate-500 dark:text-slate-400"}>
            {unlockedCount} of {MILESTONES.length} earned — Level {currentLevel} ({ledger.tier}).
            {nextMilestone
              ? ` ${nextMilestone.level - currentLevel} level${nextMilestone.level - currentLevel === 1 ? "" : "s"} to ${nextMilestone.name}.`
              : " You've earned every badge."}
          </p>
        </div>

        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activeTab === t ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {t} Badges
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Your level is real. Most rewards below are still the platform's documented plan, not fully wired up
          yet — only your Tier badge (Silver/Gold/Platinum/Diamond) is live today. Pin one earned badge (top-right
          pin icon) to show it on your profile avatar — businesses can see it too, once your profile has been
          revealed.
        </span>
      </div>

      {pinError && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{pinError}</span>
        </div>
      )}

      {visibleMilestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
          {activeTab === "Unlocked" ? "No badges earned yet — complete jobs to start unlocking them." : "Every badge is unlocked."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {visibleMilestones.map((milestone, index) => (
            <BadgeMedal
              key={milestone.level}
              milestone={milestone}
              achieved={currentLevel >= milestone.level}
              isNext={milestone.level === nextMilestone?.level}
              index={index}
              pinned={currentUser?.pinned_milestone_level === milestone.level}
              pinning={pinningLevel === milestone.level}
              onTogglePin={() => handleTogglePin(milestone.level)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
