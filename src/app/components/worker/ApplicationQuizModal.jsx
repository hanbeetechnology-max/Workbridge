import { useState } from "react";
import { AlertCircle, Check, ClipboardList, Loader2, ShieldCheck, X } from "lucide-react";

// The "Fairness First" Behavior Score signal — 15 short professional-
// judgment prompts, not a graded skill test (there's no "correct" answer
// tracked or scored anywhere; any real choice counts the same). Answering
// all of them signals real engagement with the application and earns +15
// real Behavior Score points (adjustBehaviorScore in
// backend/src/repositories/users.repository.js); skipping the whole thing
// costs -5. Both numbers are real, applied server-side in the same
// transaction as the application itself (job_candidates.controller.js's
// createCandidate) — nothing here is decorative.
const QUESTIONS = [
  { q: "A client asks for a small scope change mid-project. You:", options: ["Quote the extra time/cost before starting", "Just do it for free to keep them happy", "Refuse — it's not in the original brief"] },
  { q: "You're going to miss a deadline by a day. You:", options: ["Tell the client as soon as you know", "Say nothing and hope they don't notice", "Wait for them to ask"] },
  { q: "A client is slow to respond to your questions. You:", options: ["Send a polite follow-up after a reasonable wait", "Keep working and guess at the missing details", "Stop working until they reply"] },
  { q: "You finish work early. You:", options: ["Do a self-review pass before submitting", "Submit immediately to look fast", "Wait until the deadline to submit anyway"] },
  { q: "A client requests a revision you think is a bad idea. You:", options: ["Explain your concern, then follow their call", "Make the change without comment", "Ignore the request"] },
  { q: "You realize you underquoted a job after starting. You:", options: ["Finish at the agreed price, renegotiate next time", "Ask for more money mid-project", "Cut corners to save time"] },
  { q: "A payment is delayed due to a funds-verification hiccup. You:", options: ["Keep working in good faith and follow up calmly", "Stop all work immediately", "Publicly complain about the client"] },
  { q: "You disagree with a client's technical choice. You:", options: ["Raise it once with reasoning, respect their final call", "Silently do it your way instead", "Argue until they change their mind"] },
  { q: "You're unsure how to do part of the task. You:", options: ["Research it, then ask a specific question if still stuck", "Guess and hope it's fine", "Tell the client you can't do it"] },
  { q: "A client leaves vague instructions. You:", options: ["Ask clarifying questions before starting", "Start immediately and adjust later", "Assume the safest, smallest interpretation"] },
  { q: "You spot a mistake in your own delivered work. You:", options: ["Flag it and fix it proactively", "Wait to see if they notice", "Fix it silently, say nothing"] },
  { q: "A new client seems hesitant to secure funds upfront. You:", options: ["Reassure them with how WorkBridge's Secured Funds work", "Offer to start before funds are secured", "Walk away without explaining"] },
  { q: "You have two overlapping deadlines. You:", options: ["Communicate the conflict early to both clients", "Silently prioritize one and delay the other", "Rush both and hope for the best"] },
  { q: "A client asks for unlimited free revisions. You:", options: ["Set a clear revision limit upfront next time", "Agree to unlimited to avoid conflict", "Refuse any revisions at all"] },
  { q: "You finish a project successfully. You:", options: ["Ask for a review and offer to help again", "Move on without following up", "Ask for a tip"] },
];

export default function ApplicationQuizModal({ open, onSubmitAnswered, onSkip, onCancel, submitting }) {
  const [answers, setAnswers] = useState(() => Array(QUESTIONS.length).fill(null));

  if (!open) return null;

  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B35]">
              <ClipboardList className="h-3.5 w-3.5" />
              Boost Your Application
            </p>
            <h2 className="font-display mt-1 text-xl font-black text-slate-900 dark:text-white">15 Quick Questions</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Answering all 15 adds +15 to your real Behavior Score. Skipping costs -5. No right or wrong answers — this
              just signals real engagement to businesses.
            </p>
          </div>
          <button onClick={onCancel} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="wb-scroll-clean min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {QUESTIONS.map((item, qIndex) => (
            <div key={qIndex} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {qIndex + 1}. {item.q}
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {item.options.map((opt, oIndex) => {
                  const selected = answers[qIndex] === oIndex;
                  return (
                    <button
                      key={oIndex}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => {
                          const next = [...prev];
                          next[qIndex] = oIndex;
                          return next;
                        })
                      }
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        selected
                          ? "border-[#1B3FAB] dark:border-blue-400 bg-[#F4F6FF] dark:bg-blue-500/10 text-[#1B3FAB] dark:text-blue-400"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-[#1B3FAB] dark:border-blue-400 bg-[#1B3FAB] dark:bg-blue-400" : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {selected && <Check className="h-2.5 w-2.5 text-white dark:text-slate-900" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-shrink-0 flex-col gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            {answeredCount}/{QUESTIONS.length} answered
          </p>
          <div className="flex gap-2">
            <button
              onClick={onSkip}
              disabled={submitting}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
            >
              Skip Quiz &amp; Apply Anyway (-5)
            </button>
            <button
              onClick={onSubmitAnswered}
              disabled={!allAnswered || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E55E1F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Submit Answers &amp; Apply (+15)
            </button>
          </div>
        </div>

        {!allAnswered && answeredCount > 0 && (
          <div className="flex items-center gap-2 border-t border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-500/10 px-6 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Answer all 15 to submit for +15, or skip the whole thing for -5.
          </div>
        )}
      </div>
    </div>
  );
}
