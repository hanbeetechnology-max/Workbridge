import { motion } from "motion/react";

const SIZE = 176;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Pure presentation — no fetching, no fake data. Callers pass real numbers
// from GET /api/gamification/ledger (currentXp/nextLevelXp are that
// endpoint's xp-relative-to-level-floor and xpForNextLevel-minus-floor, so
// the fraction shown below the ring numerically matches progressPct's fill
// — see gamification.controller.js's getLedger).
export default function WorkerLevelRing({ level, currentXp, nextLevelXp, progressPct }) {
  const isMaxLevel = nextLevelXp <= 0;
  const clampedPct = Math.min(100, Math.max(0, progressPct));
  const targetOffset = CIRCUMFERENCE - (clampedPct / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90 drop-shadow-[0_8px_24px_rgba(255,107,53,0.25)]"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#FF6B35"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Level</span>
          <span className="font-display text-5xl font-extrabold leading-none text-slate-900 dark:text-white">
            {level}
          </span>
        </div>
      </div>

      <div className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {isMaxLevel ? "Max level reached" : `${currentXp.toLocaleString("en-IN")} / ${nextLevelXp.toLocaleString("en-IN")} XP to next level`}
      </div>
    </div>
  );
}
